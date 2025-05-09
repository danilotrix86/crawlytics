from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional
import re


class SQLQueryRequest(BaseModel):
    """
    Request model for SQL queries
    """
    query: str = Field(..., description="SQL Query to execute")
    params: Optional[List[Any]] = Field(default=None, description="Query parameters as an array")
    limit: Optional[int] = Field(default=1000, description="Maximum number of rows to return")
    
    @validator('query')
    def validate_query(cls, value):
        # First, remove SQL comments to prevent false positives
        # Remove single-line comments (-- comment)
        query_no_comments = ""
        lines = value.split('\n')
        for line in lines:
            comment_pos = line.find('--')
            if comment_pos >= 0:
                line = line[:comment_pos]
            query_no_comments += line + '\n'
        
        # Remove multi-line comments (/* comment */)
        query_no_comments = re.sub(r'/\*[\s\S]*?\*/', '', query_no_comments)
        
        query_stripped = query_no_comments.strip().upper()
        
        # Allow SELECT queries and WITH statements that end with SELECT
        if not (query_stripped.startswith('SELECT') or query_stripped.startswith('WITH')):
            raise ValueError("Only SELECT or WITH queries are allowed")
        
        # For WITH statements, make sure they contain a SELECT
        if query_stripped.startswith('WITH') and 'SELECT' not in query_stripped:
            raise ValueError("WITH statements must include a SELECT query")
            
        # Prevent any modifications to the database
        forbidden_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE']
        if any(f" {keyword} " in f" {query_stripped} " or 
               f" {keyword}(" in f" {query_stripped} " or 
               query_stripped.startswith(keyword + " ") or 
               query_stripped.startswith(keyword + "(") 
               for keyword in forbidden_keywords):
            raise ValueError(f"Query contains forbidden keywords: {', '.join(forbidden_keywords)}")
            
        return value


class LogFileUploadResponse(BaseModel):
    """
    Response model for log file uploads
    """
    task_id: str
    status: str
    message: str
    filename: str


class TaskStatusResponse(BaseModel):
    """
    Response model for task status
    """
    status: str
    file_name: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    file_size_mb: Optional[float] = None
    matched_entries: Optional[int] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    db_stats: Optional[Dict[str, Any]] = None
    db_insertion_time: Optional[float] = None 