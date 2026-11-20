"""
Main log processing module with parallel processing capability.
Streams the file in chunks so large logs never have to fit in memory.
"""
import gzip
import multiprocessing
import time
from dataclasses import dataclass, field
from functools import partial
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple, Union

from .crawler_patterns import CrawlerMatcher, load_patterns
from .log_parsers import AlbParser, CaddyJsonParser, NginxParser, W3CParser, make_parser
from .referrals import detect_ai_referral

FORMAT_LABELS = {
    "apache": "Apache/Nginx combined",
    "nginx": "Nginx combined + request id",
    "caddy": "Caddy JSON",
    "w3c": "W3C extended (IIS / CloudFront)",
    "alb": "AWS ALB",
}


def _open_text(file_path: Union[str, Path]):
    """Open a log file as text, transparently handling .gz files."""
    path = Path(file_path)
    if path.suffix.lower() == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


@dataclass
class LogFormat:
    name: str
    fields: Optional[List[str]] = None  # W3C field order

    @property
    def label(self) -> str:
        return FORMAT_LABELS.get(self.name, self.name)


def detect_format(sample_lines: List[str]) -> Optional[LogFormat]:
    """Work out the log format from the first lines of a file."""
    for line in sample_lines:
        fields = W3CParser.fields_from_directive(line)
        if fields:
            return LogFormat("w3c", fields)

    candidates = [
        ("caddy", CaddyJsonParser()),
        ("alb", AlbParser()),
        ("nginx", NginxParser()),
    ]
    for line in sample_lines:
        for name, parser in candidates:
            parsed = parser.parse_line(line)
            if parsed:
                if name == "nginx":
                    # Plain combined lines also match the nginx parser's fallback pattern
                    name = "nginx" if parser.patterns[0].match(line) else "apache"
                return LogFormat(name)
    return None


def detect_log_format(sample_lines: List[str]) -> Optional[str]:
    """Backwards-compatible wrapper returning just the format name."""
    found = detect_format(sample_lines)
    return found.name if found else None


def iter_chunks(file_path: Union[str, Path], chunk_size: int = 10000) -> Iterator[List[str]]:
    """Yield lists of up to chunk_size stripped lines from the file."""
    chunk: List[str] = []
    with _open_text(file_path) as f:
        for line in f:
            chunk.append(line.strip())
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
    if chunk:
        yield chunk


@dataclass
class ChunkResult:
    lines: int = 0
    parsed: int = 0
    crawler_entries: List[Dict[str, Any]] = field(default_factory=list)
    referrals: List[Dict[str, Any]] = field(default_factory=list)


def process_chunk(chunk: List[str], log_format: Union[str, LogFormat],
                  patterns: Optional[Sequence[str]] = None) -> ChunkResult:
    """
    Parse a chunk of log lines. Keeps requests from known crawlers, and visits
    referred by AI assistants (stored without IP or user agent).
    """
    fmt = log_format if isinstance(log_format, LogFormat) else LogFormat(log_format)
    parser = make_parser(fmt.name, fmt.fields)
    matcher = CrawlerMatcher(patterns if patterns is not None else load_patterns())
    result = ChunkResult(lines=len(chunk))

    for line in chunk:
        parsed = parser.parse_line(line)
        if not parsed:
            continue
        result.parsed += 1
        crawler_name = matcher.match(parsed.get('user_agent'))
        if crawler_name:
            parsed['crawler_name'] = crawler_name
            result.crawler_entries.append(parsed)
            continue
        referral = detect_ai_referral(parsed.get('referer'), parsed.get('path'))
        if referral:
            assistant, operator, host = referral
            result.referrals.append({
                "time": parsed["time"],
                "path": parsed["path"],
                "status": parsed["status"],
                "bytes": parsed["bytes"],
                "assistant": assistant,
                "operator": operator,
                "referrer_host": host,
            })

    return result


@dataclass
class ProcessingOutput:
    entries: List[Dict[str, Any]]
    referrals: List[Dict[str, Any]]
    stats: Dict[str, Any]

    def __iter__(self):  # allows `results, stats = processor.process()`
        return iter((self.entries, self.stats))


class LogProcessor:
    """Processes log files in parallel, streaming chunks to worker processes."""

    def __init__(self, file_path: Union[str, Path], num_processes: Optional[int] = None,
                 chunk_size: int = 10000, patterns: Optional[Sequence[str]] = None):
        self.file_path = Path(file_path)
        self.num_processes = num_processes or max(1, multiprocessing.cpu_count() - 1)
        self.chunk_size = chunk_size
        self.patterns = list(patterns) if patterns is not None else load_patterns()

    def detect(self, num_lines: int = 100) -> Optional[LogFormat]:
        sample_lines = []
        with _open_text(self.file_path) as f:
            for _ in range(num_lines):
                line = f.readline()
                if not line:
                    break
                sample_lines.append(line.strip())
        return detect_format(sample_lines)

    def detect_format(self, num_lines: int = 100) -> Optional[str]:
        found = self.detect(num_lines)
        return found.name if found else None

    def process(self) -> ProcessingOutput:
        start_time = time.time()

        log_format = self.detect()
        if not log_format:
            raise ValueError(
                f"Could not recognise the log format of {self.file_path.name}. Supported: "
                + ", ".join(FORMAT_LABELS.values())
            )

        process_fn = partial(process_chunk, log_format=log_format, patterns=self.patterns)
        chunks = iter_chunks(self.file_path, self.chunk_size)
        total = ChunkResult()

        def collect(part: ChunkResult):
            total.lines += part.lines
            total.parsed += part.parsed
            total.crawler_entries.extend(part.crawler_entries)
            total.referrals.extend(part.referrals)

        if self.num_processes == 1:
            for part in map(process_fn, chunks):
                collect(part)
        else:
            with multiprocessing.Pool(processes=self.num_processes) as pool:
                for part in pool.imap(process_fn, chunks):
                    collect(part)

        elapsed = time.time() - start_time
        matches = len(total.crawler_entries)
        stats = {
            "log_format": log_format.name,
            "log_format_label": log_format.label,
            "total_lines": total.lines,
            "parsed_lines": total.parsed,
            "llm_matches": matches,
            "ai_referrals": len(total.referrals),
            "match_percentage": (matches / total.parsed * 100) if total.parsed else 0,
            "processing_time_seconds": elapsed,
            "lines_per_second": total.lines / elapsed if elapsed > 0 else 0,
        }
        return ProcessingOutput(total.crawler_entries, total.referrals, stats)
