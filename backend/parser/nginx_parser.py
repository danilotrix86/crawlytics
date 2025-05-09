"""
Nginx parser module for backward compatibility.
This file is maintained for compatibility with existing imports.
"""
import warnings

# Show a deprecation warning when directly importing from this module
warnings.warn(
    "The 'nginx_parser' module is deprecated. Please import from 'parser' module directly.",
    DeprecationWarning,
    stacklevel=2
) 