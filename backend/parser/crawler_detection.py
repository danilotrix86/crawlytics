"""
Crawler detection module for identifying LLM and AI web crawlers.
Provides utility functions and pattern matching for crawler identification.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Pattern
import re


@dataclass
class CrawlerDatabase:
    """Database of known LLM and AI crawler patterns with organization by provider."""
    
    # Raw patterns organized by provider
    patterns_by_provider: Dict[str, List[str]] = field(default_factory=lambda: {
        "openai": [
            "ChatGPT-User",
            "OpenAI-GPT",
            "GPTBot"
        ],
        "google": [
            "Google-Extended",
            "Googlebot",
            "Google-Extended/2.0"
        ],
        "anthropic": [
            "Claude-Web",
            "Anthropic-AI",
            "Claude/",
            "Anthropic-AI-Crawler"
        ],
        "meta": [
            "MetaGPT",
            "LLaMA-Bot",
            "Meta AI"
        ],
        "cohere": [
            "Cohere-AI",
            "CohereBot",
            "cohere-ai"
        ],
        "microsoft": [
            "BingBot",
            "Bing-AI",
            "bingbot",
            "Sydney-AI",
            "Copilot-Assistant"
        ],
        "perplexity": [
            "Perplexity",
            "PerplexityBot"
        ],
        "research": [
            "AI-Research-Bot",
            "ML-Crawler"
        ],
        "generic": [
            "AI-Assistant",
            "LLM-Crawler",
            "AIReader",
            "SentientAI",
            "AI-Web-Assistant"
        ]
    })
    
    # Flat list of all patterns for quick lookups
    _all_patterns: List[str] = field(init=False)
    
    # Domain to crawler name mapping
    domain_mappings: Dict[str, str] = field(default_factory=lambda: {
        "openai.com": "GPTBot",
        "perplexity.ai": "PerplexityBot",
        "bing.com/bingbot": "bingbot",
        "anthropic.com": "Anthropic-AI",
        "claude.ai": "Claude-Web",
        "cohere.com": "cohere-ai",
        "google.com": "Googlebot",
        "meta.com": "MetaGPT"
    })
    
    # Common web browsers to exclude from crawler detection
    common_browsers: List[str] = field(default_factory=lambda: [
        "mozilla", "chrome", "safari", "firefox", "edge", "opera", "webkit"
    ])
    
    # Regex patterns for extracting crawler names
    name_extraction_patterns: List[Pattern] = field(default_factory=lambda: [
        # Bot name at start of string (like "BotName/1.0")
        re.compile(r'^([A-Za-z0-9_-]+)(?:Bot|Crawler|Spider)/?'),
        # From "compatible; CrawlerName/version" pattern
        re.compile(r'compatible;\s*([A-Za-z0-9_-]+)[/\s]'),
        # Bot name with version
        re.compile(r'([A-Za-z0-9_-]+)(?:Bot|bot)/[\d.~]+')
    ])
    
    def __post_init__(self):
        """Initialize derived fields after instance creation."""
        # Create flat list of all patterns
        self._all_patterns = [
            pattern for patterns in self.patterns_by_provider.values() 
            for pattern in patterns
        ]
    
    def is_crawler(self, user_agent: str) -> bool:
        """
        Check if a user agent string matches known LLM crawler patterns.
        
        Args:
            user_agent: The user agent string from the request
            
        Returns:
            True if the user agent matches a known LLM crawler pattern
        """
        if not user_agent:
            return False
            
        # Convert to lowercase for case-insensitive matching
        user_agent_lower = user_agent.lower()
        
        for pattern in self._all_patterns:
            if pattern.lower() in user_agent_lower:
                return True
                
        # Check for generic bot/crawler terms if not found in specific patterns
        for term in ["bot", "crawler", "spider", "ai"]:
            if term in user_agent_lower and all(browser not in user_agent_lower 
                                               for browser in self.common_browsers):
                return True
                
        return False
    
    def extract_crawler_name(self, user_agent: str) -> Optional[str]:
        """
        Extract the crawler name from a user agent string.
        
        Args:
            user_agent: The user agent string from the request
            
        Returns:
            The extracted crawler name or None if no known crawler
        """
        if not user_agent:
            return None
        
        user_agent_lower = user_agent.lower()
        
        # Direct pattern matches for specific LLM/AI crawlers
        # Check all patterns in our database
        for pattern in self._all_patterns:
            if pattern.lower() in user_agent_lower:
                return pattern
        
        # Try regex pattern matching
        for pattern in self.name_extraction_patterns:
            match = pattern.search(user_agent)
            if match and match.group(1).lower() not in self.common_browsers:
                # For bot pattern, preserve the case of "Bot" or "bot"
                if "bot" in pattern.pattern.lower():
                    if "Bot" in user_agent:
                        return match.group(1) + "Bot"
                    else:
                        return match.group(1) + "bot"
                return match.group(0) if pattern.groups == 0 else match.group(1)
        
        # Check for any known crawler terms
        for term in ["bot", "crawler", "spider"]:
            index = user_agent_lower.find(term)
            if index > 0:
                # Look for the word before this term
                start = max(0, index - 30)  # Look back up to 30 chars
                segment = user_agent[start:index + len(term)]
                word_match = re.search(r'([A-Za-z0-9_-]+)' + term, segment, re.IGNORECASE)
                if word_match and word_match.group(1).lower() not in self.common_browsers:
                    if term.lower() == "bot":
                        return word_match.group(1) + ("Bot" if term[0].isupper() else "bot")
                    return word_match.group(0)
        
        # Check URL domains
        for domain, name in self.domain_mappings.items():
            if domain in user_agent_lower:
                return name
        
        # If we've gotten this far but determined it's a crawler, use a generic name
        if self.is_crawler(user_agent):
            return None
            
        return None


# Create a singleton instance for global use
crawler_db = CrawlerDatabase()

# Expose key functions at module level for backward compatibility
def is_llm_crawler(user_agent: str) -> bool:
    """Check if a user agent string matches known LLM crawler patterns."""
    # Import the patterns from llm_list to ensure we only detect these specific patterns
    from .llm_list import LLM_CRAWLER_PATTERNS
    
    if not user_agent:
        return False
        
    user_agent_lower = user_agent.lower()
    
    # Only match against the specific patterns in LLM_CRAWLER_PATTERNS
    for pattern in LLM_CRAWLER_PATTERNS:
        if pattern.lower() in user_agent_lower:
            return True
            
    return False

def extract_crawler_name(user_agent: str) -> Optional[str]:
    """Extract the crawler name from a user agent string."""
    # Import the patterns from llm_list to ensure we only detect these specific patterns
    from .llm_list import LLM_CRAWLER_PATTERNS
    
    if not user_agent:
        return None
        
    user_agent_lower = user_agent.lower()
    
    # Only match against the specific patterns in LLM_CRAWLER_PATTERNS
    for pattern in LLM_CRAWLER_PATTERNS:
        if pattern.lower() in user_agent_lower:
            return pattern
            
    return None 