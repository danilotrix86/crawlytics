"""
Main log processing module with parallel processing capability.
Provides utilities for handling large log files efficiently.
"""
import os
import multiprocessing
from functools import partial
import itertools
from typing import Dict, List, Optional, Tuple, Any, Union
from pathlib import Path
import time

from .log_parsers import ApacheParser, NginxParser, parse_apache_line, parse_nginx_line
from .crawler_detection import is_llm_crawler


def detect_log_format(sample_lines: List[str]) -> Optional[str]:
    """
    Detect whether the log file is in Apache or Nginx format.
    
    Args:
        sample_lines: List of sample log lines to analyze
        
    Returns:
        'apache' or 'nginx' or None if format cannot be determined
    """
    # Create parsers
    apache_parser = ApacheParser()
    nginx_parser = NginxParser()
    
    for line in sample_lines:
        # Try each parser and return on first match
        if apache_parser.parse_line(line):
            return 'apache'
        if nginx_parser.parse_line(line):
            return 'nginx'
            
    # Could not determine format
    return None


def chunk_file(file_path: Union[str, Path], chunk_size: int = 10000) -> List[List[str]]:
    """
    Split a file into chunks of lines for parallel processing.
    
    Args:
        file_path: Path to the log file
        chunk_size: Number of lines per chunk
        
    Returns:
        List of chunks (lists of lines)
    """
    chunks = []
    current_chunk = []
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        for i, line in enumerate(f):
            current_chunk.append(line.strip())
            if (i + 1) % chunk_size == 0:
                chunks.append(current_chunk)
                current_chunk = []
                
    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks


# Define top-level function for multiprocessing compatibility
def process_chunk(chunk: List[str], log_format: str) -> List[Dict[str, Any]]:
    """
    Process a chunk of log lines.
    
    Args:
        chunk: List of log lines
        log_format: 'apache' or 'nginx'
        
    Returns:
        List of parsed log entries from LLM crawlers
    """
    # Use function-based approach for better multiprocessing compatibility
    parser_func = parse_apache_line if log_format == 'apache' else parse_nginx_line
    results = []
    
    for line in chunk:
        parsed = parser_func(line)
        if parsed and parsed.get('user_agent') and is_llm_crawler(parsed['user_agent']):
            results.append(parsed)
            
    return results


class LogProcessor:
    """
    Main class for processing log files in parallel with optimized performance.
    """
    
    def __init__(self, file_path: Union[str, Path], num_processes: Optional[int] = None,
                chunk_size: int = 10000):
        """
        Initialize the log processor.
        
        Args:
            file_path: Path to the log file
            num_processes: Number of processes to use (defaults to CPU count)
            chunk_size: Number of lines per chunk for parallel processing
        """
        self.file_path = Path(file_path)
        self.num_processes = num_processes or max(1, multiprocessing.cpu_count() - 1)
        self.chunk_size = chunk_size
        self.total_lines = 0
        self.llm_matches = 0
        self.processing_time = 0
        
    def detect_format(self, num_lines: int = 100) -> Optional[str]:
        """
        Detect the log format by sampling lines from the file.
        
        Args:
            num_lines: Number of lines to sample
            
        Returns:
            'apache' or 'nginx' or None if format cannot be determined
        """
        sample_lines = []
        with open(self.file_path, 'r', encoding='utf-8', errors='replace') as f:
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
            Tuple containing:
            - List of parsed log entries from LLM crawlers
            - Dictionary with processing statistics
        """
        start_time = time.time()
        
        # Detect log format
        log_format = self.detect_format()
        if not log_format:
            raise ValueError(f"Could not determine log format for {self.file_path}")
            
        # Split file into chunks
        chunks = chunk_file(self.file_path, self.chunk_size)
        self.total_lines = sum(len(chunk) for chunk in chunks)
        
        # Process chunks in parallel using multiprocessing.Pool for better compatibility
        process_fn = partial(process_chunk, log_format=log_format)
        
        # Use multiprocessing.Pool instead of ProcessPoolExecutor for better pickle compatibility
        with multiprocessing.Pool(processes=self.num_processes) as pool:
            results = pool.map(process_fn, chunks)
            
        flat_results = list(itertools.chain.from_iterable(results))
        self.llm_matches = len(flat_results)
        self.processing_time = time.time() - start_time
        
        # Return results and stats
        return flat_results, {
            "total_lines": self.total_lines,
            "llm_matches": self.llm_matches,
            "match_percentage": (self.llm_matches / self.total_lines * 100) if self.total_lines > 0 else 0,
            "processing_time_seconds": self.processing_time,
            "lines_per_second": self.total_lines / self.processing_time if self.processing_time > 0 else 0
        }
        
    def process_sample(self, sample_size: int = 1000) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process a sample of the log file for quick analysis.
        
        Args:
            sample_size: Number of lines to sample from the file
            
        Returns:
            Same as process() but for a sample of the file
        """
        sample_path = self.file_path.with_suffix('.sample')
        
        # Create a sample file
        with open(self.file_path, 'r', encoding='utf-8', errors='replace') as source:
            with open(sample_path, 'w', encoding='utf-8') as target:
                for _ in range(sample_size):
                    line = source.readline()
                    if not line:
                        break
                    target.write(line)
        
        # Create a temporary processor for the sample
        sample_processor = LogProcessor(sample_path, num_processes=1)
        results, stats = sample_processor.process()
        
        # Clean up the sample file
        os.remove(sample_path)
        
        return results, stats 