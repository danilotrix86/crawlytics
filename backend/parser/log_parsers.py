"""
Log parser implementations for Apache and Nginx formats.
Contains concrete parser classes that inherit from the abstract LogParser base.
"""
import re
import uuid
from typing import Dict, List, Optional, Pattern, Any

from .parser_base import LogParser
from .crawler_detection import extract_crawler_name


class ApacheParser(LogParser):
    """Parser for Apache combined and extended log formats."""
    
    def _get_patterns(self) -> List[Pattern]:
        """Get the regex patterns for Apache log formats."""
        # Extended Apache log format with response time
        # Example with response time (in microseconds, convert to ms):
        # 192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com/start.html" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 125000
        apache_with_time = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*) HTTP/[\d\.]*" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)" (?P<response_time>\d+)'
        )
        
        # Apache combined log format
        # Example: 192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com/start.html" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        apache_standard = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*) HTTP/[\d\.]*" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        )
        
        return [apache_with_time, apache_standard]
    
    def _get_time_format(self) -> str:
        """Get the time format string for Apache logs."""
        return "%d/%b/%Y:%H:%M:%S %z"
    
    def _process_match(self, match: Dict[str, str]) -> Dict[str, Any]:
        """Process a regex match into structured log data."""
        # Handle response time if present (convert from microseconds to milliseconds)
        if "response_time" in match:
            try:
                match["response_time_ms"] = int(int(match.pop("response_time", 0)) / 1000)
            except (ValueError, TypeError):
                match["response_time_ms"] = None
        
        # Process common fields
        log_data = self._parse_common_fields(match)
        if not log_data:  # If common parsing failed
            return None
            
        # Extract crawler name from user agent
        log_data["crawler_name"] = extract_crawler_name(log_data["user_agent"])
            
        # Map to standard output format
        return {
            "time": log_data["time"],
            "ip_address": log_data["ip"],
            "method": log_data["method"],
            "path": log_data["path"],
            "status": log_data["status"],
            "user_agent": log_data["user_agent"],
            "crawler_name": log_data["crawler_name"],
            "referer": log_data["referer"],
            "request_id": log_data["request_id"],
            "response_time_ms": log_data["response_time_ms"]
        }


class NginxParser(LogParser):
    """Parser for Nginx log formats with various extensions."""
    
    def _get_patterns(self) -> List[Pattern]:
        """Get the regex patterns for Nginx log formats."""
        # Nginx with request ID and response time
        # Example: 192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com/start.html" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 0.123 abc123def456
        nginx_with_id = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*) HTTP/[\d\.]*" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)" (?P<response_time>[\d\.]+) (?P<request_id>\S+)'
        )
        
        # Nginx with request time (in seconds)
        # Example: 192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com/start.html" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 0.123
        nginx_with_time = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*) HTTP/[\d\.]*" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)" (?P<response_time>[\d\.]+)'
        )
        
        # Nginx default log format
        # Example: 192.168.1.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com/start.html" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        nginx_standard = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "(?P<method>\S+) (?P<path>[^"]*) HTTP/[\d\.]*" (?P<status>\d+) (?P<size>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        )
        
        return [nginx_with_id, nginx_with_time, nginx_standard]
    
    def _get_time_format(self) -> str:
        """Get the time format string for Nginx logs."""
        return "%d/%b/%Y:%H:%M:%S %z"
    
    def _process_match(self, match: Dict[str, str]) -> Dict[str, Any]:
        """Process a regex match into structured log data."""
        # Handle request ID if present
        if "request_id" in match:
            try:
                match["request_id"] = uuid.UUID(match["request_id"])
            except (ValueError, TypeError):
                match["request_id"] = None
                
        # Handle response time if present (convert from seconds to milliseconds)
        if "response_time" in match:
            try:
                match["response_time_ms"] = int(float(match.pop("response_time", 0)) * 1000)
            except (ValueError, TypeError):
                match["response_time_ms"] = None
        
        # Process common fields
        log_data = self._parse_common_fields(match)
        if not log_data:  # If common parsing failed
            return None
            
        # Extract crawler name from user agent
        log_data["crawler_name"] = extract_crawler_name(log_data["user_agent"])
            
        # Map to standard output format
        return {
            "time": log_data["time"],
            "ip_address": log_data["ip"],
            "method": log_data["method"],
            "path": log_data["path"],
            "status": log_data["status"],
            "user_agent": log_data["user_agent"],
            "crawler_name": log_data["crawler_name"],
            "referer": log_data["referer"],
            "request_id": log_data["request_id"],
            "response_time_ms": log_data["response_time_ms"]
        }


# For backwards compatibility
def parse_apache_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single line from an Apache access log."""
    parser = ApacheParser()
    return parser.parse_line(line)

def parse_nginx_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single line from a Nginx access log."""
    parser = NginxParser()
    return parser.parse_line(line) 