import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Body, HTTPException, status

from parser.crawler_patterns import load_patterns, reset_patterns, save_patterns

logger = logging.getLogger("crawler_config_routes")

router = APIRouter(tags=["crawler_config"])


@router.get(
    "/crawler-patterns",
    status_code=status.HTTP_200_OK,
    summary="Get LLM Crawler Patterns",
    response_model=Dict[str, List[str]],
)
async def get_crawler_patterns() -> Dict[str, List[str]]:
    """Get the current list of LLM crawler patterns."""
    return {"patterns": load_patterns()}


@router.post(
    "/crawler-patterns",
    status_code=status.HTTP_200_OK,
    summary="Update LLM Crawler Patterns",
    response_model=Dict[str, Any],
)
async def update_crawler_patterns(
    patterns: List[str] = Body(..., description="List of LLM crawler patterns"),
) -> Dict[str, Any]:
    """Replace the list of LLM crawler patterns. Applies to logs imported afterwards."""
    try:
        saved = save_patterns(patterns)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except OSError as e:
        logger.error(f"Error saving crawler patterns: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save crawler patterns",
        )
    logger.info(f"Saved {len(saved)} crawler patterns")
    return {"message": "Crawler patterns updated successfully", "count": len(saved)}


@router.post(
    "/crawler-patterns/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset LLM Crawler Patterns to Default",
    response_model=Dict[str, Any],
)
async def reset_crawler_patterns() -> Dict[str, Any]:
    """Reset the list of LLM crawler patterns to the built-in defaults."""
    try:
        saved = reset_patterns()
    except OSError as e:
        logger.error(f"Error resetting crawler patterns: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not reset crawler patterns",
        )
    return {"message": "Crawler patterns reset to default values", "count": len(saved)}
