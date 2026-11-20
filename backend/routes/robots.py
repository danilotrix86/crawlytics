import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from database import DBConnection
from robots import audit, generate
from robots import store

logger = logging.getLogger("robots_routes")

router = APIRouter(tags=["robots"])


class RobotsContent(BaseModel):
    content: str = Field(..., max_length=512 * 1024)


class RobotsFetch(BaseModel):
    site: str = Field(..., max_length=2048)


class GenerateRequest(BaseModel):
    block: List[str] = Field(default_factory=list)
    extra_disallow: List[str] = Field(default_factory=list, max_length=100)


@router.get("/robots", summary="Saved robots.txt")
def get_robots() -> Dict[str, Any]:
    return store.load()


@router.put("/robots", summary="Save robots.txt contents")
def put_robots(body: RobotsContent) -> Dict[str, Any]:
    try:
        return store.save(body.content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post("/robots/fetch", summary="Download robots.txt from a website")
def fetch_robots(body: RobotsFetch) -> Dict[str, Any]:
    try:
        return store.fetch(body.site)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.warning(f"Could not fetch robots.txt from {body.site}: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not download robots.txt: {e}")


@router.get("/robots/audit", summary="Compare crawler requests with robots.txt")
def robots_audit(log_file_id: Optional[str] = None) -> Dict[str, Any]:
    saved = store.load()
    if saved["content"] is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No robots.txt saved yet")
    query = "SELECT crawler_name, path, verification, COUNT(*) FROM access_logs"
    params: list = []
    if log_file_id:
        query += " WHERE log_file_id = ?"
        params.append(log_file_id)
    query += " GROUP BY crawler_name, path, verification"
    with DBConnection() as conn:
        rows = [tuple(r) for r in conn.execute(query, params).fetchall()]
    result = audit(saved["content"], rows)
    result["robots"].update(source_url=saved["source_url"], updated_at=saved["updated_at"])
    return result


@router.post("/robots/generate", summary="Generate robots.txt rules by crawler purpose")
def robots_generate(body: GenerateRequest) -> Dict[str, str]:
    try:
        return generate(body.block, body.extra_disallow)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
