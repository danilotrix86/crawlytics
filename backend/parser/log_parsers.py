"""
Log line parsers. Every parser returns the same dict shape:

    time (aware datetime), ip_address, method, path, status, user_agent,
    referer, request_id, bytes, crawler_name (filled in later by the processor)

Supported formats:
    apache / nginx  - combined log format (nginx variant may append a request id)
    caddy           - Caddy's JSON access log
    w3c             - W3C extended format with a #Fields header (IIS, Amazon CloudFront)
    alb             - AWS Application Load Balancer access logs
"""
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Pattern, Sequence
from urllib.parse import unquote, urlsplit

from .parser_base import LogParser


def _to_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _entry(time: datetime, ip: Optional[str], method: Optional[str], path: Optional[str],
           status: Any, user_agent: Optional[str], referer: Optional[str] = None,
           request_id: Any = None, size: Any = None) -> Dict[str, Any]:
    if time.tzinfo is None:
        time = time.replace(tzinfo=timezone.utc)
    return {
        "time": time.replace(microsecond=0),
        "ip_address": ip,
        "method": method,
        "path": path,
        "status": _to_int(status),
        "user_agent": user_agent or None,
        "crawler_name": None,
        "referer": None if referer in (None, "", "-") else referer,
        "request_id": request_id or (LogParser.extract_request_id(path) if path else None),
        "bytes": _to_int(size),
    }


# --- Combined log format (Apache / Nginx) -----------------------------------

_COMBINED = (
    r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*?)(?: HTTP/[\d\.]*)?" '
    r'(?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
)


class ApacheParser(LogParser):
    """Apache / Nginx combined log format."""

    def _get_patterns(self) -> List[Pattern]:
        return [re.compile(_COMBINED)]

    def _get_time_format(self) -> str:
        return "%d/%b/%Y:%H:%M:%S %z"

    def _process_match(self, match: Dict[str, str]) -> Optional[Dict[str, Any]]:
        try:
            time = datetime.strptime(match["time"], self.time_format)
        except ValueError:
            return None
        return _entry(time, match["ip"], match["method"], match["path"], match["status"],
                      match["user_agent"], match["referer"], match.get("request_id"), match["size"])


class NginxParser(ApacheParser):
    """Combined format, optionally followed by a request id."""

    def _get_patterns(self) -> List[Pattern]:
        return [re.compile(_COMBINED + r' (?P<request_id>\S+)'), re.compile(_COMBINED)]

    def _process_match(self, match: Dict[str, str]) -> Optional[Dict[str, Any]]:
        if match.get("request_id"):
            try:
                match["request_id"] = uuid.UUID(match["request_id"])
            except ValueError:
                match["request_id"] = None
        return super()._process_match(match)


# --- Caddy JSON --------------------------------------------------------------

class CaddyJsonParser:
    """Caddy's structured access log (one JSON object per line)."""

    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        if not line.startswith("{"):
            return None
        try:
            record = json.loads(line)
        except ValueError:
            return None
        request = record.get("request")
        if not isinstance(request, dict) or "uri" not in request:
            return None
        ts = record.get("ts")
        try:
            if isinstance(ts, (int, float)):
                time = datetime.fromtimestamp(ts, tz=timezone.utc)
            else:
                time = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        except (ValueError, OSError, OverflowError):
            return None
        headers = request.get("headers") or {}

        def header(name: str) -> Optional[str]:
            for key, value in headers.items():
                if key.lower() == name:
                    return value[0] if isinstance(value, list) and value else value
            return None

        return _entry(time, request.get("client_ip") or request.get("remote_ip"), request.get("method"),
                      request.get("uri"), record.get("status"), header("user-agent"), header("referer"),
                      size=record.get("size"))


# --- W3C extended (IIS, CloudFront) -------------------------------------------

def _decode_w3c(value: Optional[str]) -> Optional[str]:
    if value in (None, "-"):
        return None
    if "%" in value:  # CloudFront URL-encodes fields, sometimes twice
        for _ in range(2):
            decoded = unquote(value)
            if decoded == value:
                break
            value = decoded
    elif " " not in value and "+" in value:  # IIS replaces spaces with '+'
        value = value.replace("+", " ")
    return value


class W3CParser:
    """W3C extended log format. Field order comes from the #Fields directive."""

    def __init__(self, fields: Optional[Sequence[str]] = None):
        self.fields = list(fields or [])

    @staticmethod
    def fields_from_directive(line: str) -> Optional[List[str]]:
        if line.startswith("#Fields:"):
            return line[len("#Fields:"):].split()
        return None

    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        if line.startswith("#"):
            fields = self.fields_from_directive(line)
            if fields:
                self.fields = fields
            return None
        if not self.fields:
            return None
        values = line.split("\t") if "\t" in line else line.split(" ")
        if len(values) != len(self.fields):
            return None
        row = dict(zip(self.fields, values))
        try:
            time = datetime.strptime(f"{row['date']} {row['time']}", "%Y-%m-%d %H:%M:%S")
        except (KeyError, ValueError):
            return None
        path = row.get("cs-uri-stem") or "/"
        query = row.get("cs-uri-query")
        if query and query != "-":
            path = f"{path}?{query}"
        return _entry(time, row.get("c-ip"), row.get("cs-method"), path, row.get("sc-status"),
                      _decode_w3c(row.get("cs(User-Agent)")), _decode_w3c(row.get("cs(Referer)")),
                      size=row.get("sc-bytes"))


# --- AWS Application Load Balancer -------------------------------------------

_ALB = re.compile(
    r'^(?P<type>\S+) (?P<time>\S+) \S+ (?P<client>\S+) \S+ \S+ \S+ \S+ (?P<elb_status>\S+) \S+ '
    r'\S+ (?P<sent>\S+) "(?P<request>[^"]*)" "(?P<user_agent>[^"]*)"'
)


class AlbParser:
    """AWS Application Load Balancer access log."""

    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        match = _ALB.match(line)
        if not match:
            return None
        try:
            time = datetime.fromisoformat(match["time"].replace("Z", "+00:00"))
        except ValueError:
            return None
        parts = match["request"].split(" ")
        if len(parts) < 2:
            return None
        url = urlsplit(parts[1])
        path = url.path or "/"
        if url.query:
            path = f"{path}?{url.query}"
        ip = match["client"].rsplit(":", 1)[0].strip("[]")
        return _entry(time, ip, parts[0], path, match["elb_status"],
                      None if match["user_agent"] == "-" else match["user_agent"], size=match["sent"])


# --- Factory -----------------------------------------------------------------

def make_parser(log_format: str, fields: Optional[Sequence[str]] = None):
    """Create a parser for a format name returned by detect_log_format."""
    parsers = {
        "apache": ApacheParser,
        "nginx": NginxParser,
        "caddy": CaddyJsonParser,
        "alb": AlbParser,
    }
    if log_format == "w3c":
        return W3CParser(fields)
    if log_format not in parsers:
        raise ValueError(f"Unknown log format: {log_format}")
    return parsers[log_format]()


# For backwards compatibility
def parse_apache_line(line: str) -> Optional[Dict[str, Any]]:
    return ApacheParser().parse_line(line)


def parse_nginx_line(line: str) -> Optional[Dict[str, Any]]:
    return NginxParser().parse_line(line)
