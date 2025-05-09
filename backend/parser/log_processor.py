"""
Log processor module for backward compatibility.
This file is maintained for compatibility with existing imports.
"""
import warnings
from .processor import LogProcessor, detect_log_format, chunk_file, process_chunk

# Show a deprecation warning when directly importing from this module
warnings.warn(
    "The 'log_processor' module is deprecated. Please import from 'parser' module directly.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export all the necessary functions and classes
__all__ = [
    'LogProcessor',
    'detect_log_format',
    'chunk_file',
    'process_chunk'
] 