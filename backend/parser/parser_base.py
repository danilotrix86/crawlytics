"""
Base parser module for log file processing with common functionality.
Provides abstract base class and shared utilities for different log format parsers.
"""
from abc import ABC, abstractmethod
from datetime import datetime
import re
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Pattern, List, Any


@dataclass
class LogEntry:
    """Structured representation of a parsed log entry."""
    time: datetime
    ip_address: str
    method: str
    path: str
    status: int
    user_agent: str
    crawler_name: Optional[str] = None
    referer: Optional[str] = None
    request_id: Optional[uuid.UUID] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert log entry to dictionary format."""
        return {
            "time": self.time,
            "ip_address": self.ip_address,
            "method": self.method,
            "path": self.path,
            "status": self.status,
            "user_agent": self.user_agent,
            "crawler_name": self.crawler_name,
            "referer": self.referer,
            "request_id": self.request_id
        }


class LogParser(ABC):
    """Abstract base class for log parsers."""
    
    def __init__(self):
        """Initialize the parser with its regex patterns."""
        self.patterns = self._get_patterns()
        self.time_format = self._get_time_format()
    
    @abstractmethod
    def _get_patterns(self) -> List[Pattern]:
        """Get the regex patterns for this parser."""
        pass
    
    @abstractmethod
    def _get_time_format(self) -> str:
        """Get the time format string for this parser."""
        pass
    
    @abstractmethod
    def _process_match(self, match: Dict[str, str]) -> Dict[str, Any]:
        """Process a regex match into structured data."""
        pass
    
    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single log line.
        
        Args:
            line: A single line from a log file
            
        Returns:
            Parsed log data dict or None if line doesn't match expected format
        """
        # Try each pattern in order (most specific to most general)
        for pattern in self.patterns:
            match = pattern.match(line)
            if match:
                return self._process_match(match.groupdict())
        
        return None
    
    @staticmethod
    def extract_request_id(path: str) -> Optional[uuid.UUID]:
        """Extract request_id from URL path query parameters if available."""
        request_id_match = re.search(r'request_id=([^&\s]+)', path)
        if request_id_match:
            try:
                return uuid.UUID(request_id_match.group(1))
            except ValueError:
                pass
        return None
    
    def _parse_common_fields(self, log_data: Dict[str, str]) -> Dict[str, Any]:
        """Parse common fields across log formats."""
        # Parse timestamp
        try:
            log_data["time"] = datetime.strptime(log_data["time"], self.time_format)
        except ValueError:
            return None
            
        # Convert status to integer
        try:
            log_data["status"] = int(log_data["status"])
        except (ValueError, TypeError):
            log_data["status"] = None
            
        # Handle empty referer
        if log_data.get("referer") == "-":
            log_data["referer"] = None
            
        # Extract request_id if not already present
        if "request_id" not in log_data or not log_data["request_id"]:
            log_data["request_id"] = self.extract_request_id(log_data["path"])
            
        return log_data 