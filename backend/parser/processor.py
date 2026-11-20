"""
Main log processing module with parallel processing capability.
Streams the file in chunks so large logs never have to fit in memory.
"""
import gzip
import multiprocessing
import time
from functools import partial
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple, Union

from .crawler_patterns import CrawlerMatcher, load_patterns
from .log_parsers import ApacheParser, NginxParser


def _open_text(file_path: Union[str, Path]):
    """Open a log file as text, transparently handling .gz files."""
    path = Path(file_path)
    if path.suffix.lower() == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def detect_log_format(sample_lines: List[str]) -> Optional[str]:
    """
    Detect whether the log file is in Apache or Nginx format.

    Returns:
        'apache' or 'nginx' or None if format cannot be determined
    """
    apache_parser = ApacheParser()
    nginx_parser = NginxParser()

    for line in sample_lines:
        if apache_parser.parse_line(line):
            return 'apache'
        if nginx_parser.parse_line(line):
            return 'nginx'
    return None


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


def process_chunk(chunk: List[str], log_format: str,
                  patterns: Optional[Sequence[str]] = None) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Parse a chunk of log lines and keep only requests from known crawlers.

    Args:
        chunk: List of log lines
        log_format: 'apache' or 'nginx'
        patterns: Crawler patterns to match (defaults to the saved list)

    Returns:
        (number of lines in the chunk, parsed entries from LLM crawlers)
    """
    parser = ApacheParser() if log_format == 'apache' else NginxParser()
    matcher = CrawlerMatcher(patterns if patterns is not None else load_patterns())
    results = []

    for line in chunk:
        parsed = parser.parse_line(line)
        if not parsed:
            continue
        crawler_name = matcher.match(parsed.get('user_agent'))
        if crawler_name:
            parsed['crawler_name'] = crawler_name
            results.append(parsed)

    return len(chunk), results


class LogProcessor:
    """
    Processes log files in parallel, streaming chunks to worker processes.
    """

    def __init__(self, file_path: Union[str, Path], num_processes: Optional[int] = None,
                 chunk_size: int = 10000, patterns: Optional[Sequence[str]] = None):
        self.file_path = Path(file_path)
        self.num_processes = num_processes or max(1, multiprocessing.cpu_count() - 1)
        self.chunk_size = chunk_size
        self.patterns = list(patterns) if patterns is not None else load_patterns()
        self.total_lines = 0
        self.llm_matches = 0
        self.processing_time = 0.0

    def detect_format(self, num_lines: int = 100) -> Optional[str]:
        """Detect the log format by sampling lines from the file."""
        sample_lines = []
        with _open_text(self.file_path) as f:
            for _ in range(num_lines):
                line = f.readline()
                if not line:
                    break
                sample_lines.append(line.strip())
        return detect_log_format(sample_lines)

    def process(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process the log file and filter for LLM crawler entries.

        Returns:
            (parsed log entries from LLM crawlers, processing statistics)
        """
        start_time = time.time()

        log_format = self.detect_format()
        if not log_format:
            raise ValueError(f"Could not determine log format for {self.file_path.name}")

        process_fn = partial(process_chunk, log_format=log_format, patterns=self.patterns)
        chunks = iter_chunks(self.file_path, self.chunk_size)
        flat_results: List[Dict[str, Any]] = []
        total_lines = 0

        if self.num_processes == 1:
            outputs = map(process_fn, chunks)
            for line_count, results in outputs:
                total_lines += line_count
                flat_results.extend(results)
        else:
            with multiprocessing.Pool(processes=self.num_processes) as pool:
                for line_count, results in pool.imap(process_fn, chunks):
                    total_lines += line_count
                    flat_results.extend(results)

        self.total_lines = total_lines
        self.llm_matches = len(flat_results)
        self.processing_time = time.time() - start_time

        return flat_results, {
            "total_lines": self.total_lines,
            "llm_matches": self.llm_matches,
            "match_percentage": (self.llm_matches / self.total_lines * 100) if self.total_lines > 0 else 0,
            "processing_time_seconds": self.processing_time,
            "lines_per_second": self.total_lines / self.processing_time if self.processing_time > 0 else 0,
        }
