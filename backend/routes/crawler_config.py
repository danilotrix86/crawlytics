import logging
from typing import Dict, Any, List
from fastapi import APIRouter, status, HTTPException, Body
from fastapi.responses import JSONResponse
import os
import sys
import importlib
from pathlib import Path

# Configure logging
logger = logging.getLogger("crawler_config_routes")

# Create router
router = APIRouter(tags=["crawler_config"])

# Path to the crawler patterns file
CRAWLER_PATTERNS_FILE = Path(__file__).parent.parent / "parser" / "crawler_patterns.py"

# Default crawler patterns to use when resetting
DEFAULT_CRAWLER_PATTERNS = [
    # OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    
    # Anthropic
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "Claude-Web",
    "Anthropic-AI",
    "Anthropic-AI-Crawler",
    
    # Google
    "googlebot",
    "Googlebot",
    "Google-Extended",
    "GoogleOther",
    "Google-CloudVertexBot",
    
    # Meta
    "FacebookBot",
    "Facebookbot",
    "Meta-ExternalAgent",
    "MetaGPT",
    "LLaMA-Bot",
    "Meta AI",
    "Meta-ExternalFetcher",
    
    # Mistral
    "MistralAI-User",
    
    # Common Crawl
    "CCBot",
    
    # Perplexity
    "PerplexityBot",
    "Perplexity-User",
    
    # Amazon
    "Amazonbot",
    
    # Apple
    "Applebot",
    "Applebot-Extended",
    
    # Cohere
    "cohere-ai",
    "Cohere-AI",
    "CohereBot",
    "cohere-training-data-crawler",
    
    # AI2
    "AI2Bot",
    "AI2Bot-Dolma",
    
    # Others
    "Diffbot",
    "Bytespider",
    "DuckDuckBot",
    "DuckAssistBot",
    "Omgili",
    "Omgilibot",
    "webzio-extended",
    "Youbot",
    "SemrushBot-OCOB",
    "Petalbot",
    "PanguBot",
    "Kangaroo Bot",
    "Sentibot",
    "img2dataset",
    "Meltwater",
    "Seekr",
    "peer39_crawler",
    "Scrapy"
]


@router.get(
    "/crawler-patterns",
    status_code=status.HTTP_200_OK,
    summary="Get LLM Crawler Patterns",
    response_model=Dict[str, List[str]],
    tags=["crawler_config"]
)
async def get_crawler_patterns() -> Dict[str, List[str]]:
    logger.info("GET /crawler-patterns called")
    """
    Get the current list of LLM crawler patterns.
    
    Returns:
        Dictionary containing the list of crawler patterns
    
    Raises:
        HTTPException: If file cannot be read
    """
    try:
        # Ensure we get the latest version by reloading the module
        sys.path.append(str(Path(__file__).parent.parent))
        
        # Force a reload of the module to get fresh data
        if 'parser.crawler_patterns' in sys.modules:
            importlib.reload(sys.modules['parser.crawler_patterns'])
        
        # Import after potential reload
        from parser.crawler_patterns import LLM_CRAWLER_PATTERNS
        
        return {"patterns": LLM_CRAWLER_PATTERNS}
        
    except Exception as e:
        logger.error(f"Error retrieving crawler patterns: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving crawler patterns: {str(e)}"
        )


@router.post(
    "/crawler-patterns",
    status_code=status.HTTP_200_OK,
    summary="Update LLM Crawler Patterns",
    response_model=Dict[str, Any],
    tags=["crawler_config"]
)
async def update_crawler_patterns(patterns: List[str] = Body(..., description="List of LLM crawler patterns")) -> Dict[str, Any]:
    logger.info(f"POST /crawler-patterns called with {len(patterns)} patterns")
    """
    Update the list of LLM crawler patterns in the crawler_patterns.py file.
    
    Args:
        patterns: List of strings representing crawler patterns
        
    Returns:
        Dictionary with status and count of updated patterns
        
    Raises:
        HTTPException: If file cannot be updated
    """
    try:
        if not CRAWLER_PATTERNS_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawler patterns file not found"
            )
            
        # Group patterns by category for better organization
        grouped_patterns = group_patterns_by_category(patterns)
        
        # Update the file
        with open(CRAWLER_PATTERNS_FILE, 'r') as f:
            content = f.read()
            
        # Find where the LLM_CRAWLER_PATTERNS list starts and ends
        start_idx = content.find("LLM_CRAWLER_PATTERNS = [")
        if start_idx == -1:
            raise ValueError("Could not find LLM_CRAWLER_PATTERNS variable in the file")
            
        # Find the closing bracket of the list
        bracket_count = 0
        end_idx = start_idx
        found_opening = False
        
        for i in range(start_idx, len(content)):
            if content[i] == '[':
                bracket_count += 1
                found_opening = True
            elif content[i] == ']':
                bracket_count -= 1
                if found_opening and bracket_count == 0:
                    end_idx = i + 1
                    break
        
        # Construct new content
        new_patterns_str = "LLM_CRAWLER_PATTERNS = [\n"
        
        # Add grouped patterns with category comments
        for category, category_patterns in grouped_patterns.items():
            new_patterns_str += f"    # {category}\n"
            for pattern in category_patterns:
                new_patterns_str += f'    "{pattern}",\n'
            new_patterns_str += "\n"
            
        # Remove trailing newline and add closing bracket
        new_patterns_str = new_patterns_str.rstrip() + "\n]"
        
        # Replace the old list with the new one
        new_content = content[:start_idx] + new_patterns_str + content[end_idx:]
        
        # Write the updated content back to the file
        with open(CRAWLER_PATTERNS_FILE, 'w') as f:
            f.write(new_content)
            
        return {
            "message": "Crawler patterns updated successfully",
            "count": len(patterns)
        }
        
    except ValueError as ve:
        logger.error(f"Validation error updating crawler patterns: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error updating crawler patterns: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating crawler patterns: {str(e)}"
        )


@router.post(
    "/crawler-patterns/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset LLM Crawler Patterns to Default",
    response_model=Dict[str, Any],
    tags=["crawler_config"]
)
async def reset_crawler_patterns() -> Dict[str, Any]:
    logger.info("POST /crawler-patterns/reset called")
    """
    Reset the list of LLM crawler patterns to default values.
    
    Returns:
        Dictionary with status and count of restored default patterns
        
    Raises:
        HTTPException: If file cannot be updated
    """
    try:
        if not CRAWLER_PATTERNS_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crawler patterns file not found"
            )
            
        # Group patterns by category for better organization
        grouped_patterns = group_patterns_by_category(DEFAULT_CRAWLER_PATTERNS)
        
        # Update the file
        with open(CRAWLER_PATTERNS_FILE, 'r') as f:
            content = f.read()
            
        # Find where the LLM_CRAWLER_PATTERNS list starts and ends
        start_idx = content.find("LLM_CRAWLER_PATTERNS = [")
        if start_idx == -1:
            raise ValueError("Could not find LLM_CRAWLER_PATTERNS variable in the file")
            
        # Find the closing bracket of the list
        bracket_count = 0
        end_idx = start_idx
        found_opening = False
        
        for i in range(start_idx, len(content)):
            if content[i] == '[':
                bracket_count += 1
                found_opening = True
            elif content[i] == ']':
                bracket_count -= 1
                if found_opening and bracket_count == 0:
                    end_idx = i + 1
                    break
        
        # Construct new content
        new_patterns_str = "LLM_CRAWLER_PATTERNS = [\n"
        
        # Add grouped patterns with category comments
        for category, category_patterns in grouped_patterns.items():
            new_patterns_str += f"    # {category}\n"
            for pattern in category_patterns:
                new_patterns_str += f'    "{pattern}",\n'
            new_patterns_str += "\n"
            
        # Remove trailing newline and add closing bracket
        new_patterns_str = new_patterns_str.rstrip() + "\n]"
        
        # Replace the old list with the new one
        new_content = content[:start_idx] + new_patterns_str + content[end_idx:]
        
        # Write the updated content back to the file
        with open(CRAWLER_PATTERNS_FILE, 'w') as f:
            f.write(new_content)
            
        return {
            "message": "Crawler patterns reset to default values",
            "count": len(DEFAULT_CRAWLER_PATTERNS)
        }
        
    except ValueError as ve:
        logger.error(f"Validation error resetting crawler patterns: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error resetting crawler patterns: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting crawler patterns: {str(e)}"
        )


def group_patterns_by_category(patterns: List[str]) -> Dict[str, List[str]]:
    """
    Group patterns by their likely category based on known patterns.
    
    Args:
        patterns: List of crawler patterns
        
    Returns:
        Dictionary mapping categories to lists of patterns
    """
    # Define known categories and their associated keywords
    categories = {
        "OpenAI": ["GPT", "ChatGPT", "OpenAI", "OAI"],
        "Anthropic": ["Claude", "Anthropic"],
        "Google": ["Google", "googlebot", "Googlebot"],
        "Meta/Facebook": ["Meta", "Facebook", "LLaMA", "facebook"],
        "Cohere": ["Cohere", "cohere"],
        "Perplexity": ["Perplexity"],
        "Apple": ["Apple"],
        "Amazon": ["Amazon"],
        "Microsoft/Bing": ["Bing", "Copilot", "Sydney"],
        "ByteDance": ["Byte", "Pangle"],
        "Mistral AI": ["Mistral"],
        "Common Crawl": ["CCBot"],
        "AI2/Allen Institute": ["AI2", "Dolma"],
        "DuckDuckGo": ["Duck"],
        "Huawei": ["Petal", "Pangu"]
    }
    
    # Initialize result dictionary with "Others" category
    result = {}
    
    # Categorize each pattern
    for pattern in patterns:
        categorized = False
        
        for category, keywords in categories.items():
            if any(keyword.lower() in pattern.lower() for keyword in keywords):
                if category not in result:
                    result[category] = []
                result[category].append(pattern)
                categorized = True
                break
                
        if not categorized:
            if "Others" not in result:
                result["Others"] = []
            result["Others"].append(pattern)
    
    # Sort categories alphabetically, but keep "Others" at the end
    sorted_result = {}
    for category in sorted([c for c in result.keys() if c != "Others"]):
        sorted_result[category] = result[category]
    
    # Add Others at the end
    if "Others" in result:
        sorted_result["Others"] = result["Others"]
            
    return sorted_result 