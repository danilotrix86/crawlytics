import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
from pathlib import Path

# Import routes
from routes.logs import router as logs_router
from routes.crawler_config import router as crawler_config_router
from routes.enrichment import router as enrichment_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("crawlytics-api")

# Check if we're in production mode
production = os.environ.get("PRODUCTION", "").lower() in ("1", "true", "yes")

# Create FastAPI app with appropriate settings
app = FastAPI(
    title="Crawlytics API",
    description="API for processing server logs and identifying LLM crawler requests",
    version="1.0.0",
    # Disable docs in production mode
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
)

def _env_list(name: str, default: list) -> list:
    """Read a comma-separated list from the environment."""
    value = os.environ.get(name, "")
    items = [item.strip() for item in value.split(",") if item.strip()]
    return items or default

# Only pages served by Crawlytics itself (or the Vite dev server) may call the API.
# A wildcard would let any website open in the user's browser drive the local API.
port = os.environ.get("PORT", "8000")
origins = _env_list("CRAWLYTICS_CORS_ORIGINS", [
    f"http://localhost:{port}",
    f"http://127.0.0.1:{port}",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

# Reject requests whose Host header isn't expected, which blocks DNS-rebinding
# attacks against the local server. Set CRAWLYTICS_ALLOWED_HOSTS when deploying
# behind a domain name.
allowed_hosts = _env_list(
    "CRAWLYTICS_ALLOWED_HOSTS",
    ["*"] if production else ["localhost", "127.0.0.1", "[::1]", "testserver"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

# Include routers
app.include_router(logs_router, prefix="/api")
app.include_router(crawler_config_router, prefix="/api")
app.include_router(enrichment_router, prefix="/api")

# Define the path to the static files (React build) using pathlib for platform compatibility
static_files_dir = Path(__file__).parent / "react"
static_files_dir = static_files_dir.resolve()  # Ensure absolute path
logger.info(f"Serving React app from: {static_files_dir}")

# Check if directories exist before mounting
assets_dir = static_files_dir / "assets"
logo_dir = static_files_dir / "logo"

# Mount the static files directory if they exist
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    logger.info(f"Mounted assets from: {assets_dir}")
if logo_dir.exists():
    app.mount("/logo", StaticFiles(directory=str(logo_dir)), name="logo")
    logger.info(f"Mounted logo from: {logo_dir}")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# Serve top-level static files (favicon, images) or fall back to index.html so
# client-side routes like /logs survive a page refresh.
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_react_app(request: Request, full_path: str):
    if full_path == "api" or full_path.startswith("api/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    if full_path:
        candidate = (static_files_dir / full_path).resolve()
        if candidate.is_file() and static_files_dir in candidate.parents:
            return FileResponse(str(candidate))

    index_path = static_files_dir / "index.html"
    if index_path.exists():
        # Always revalidate the page so browsers pick up new (hashed) bundles after an upgrade
        return FileResponse(str(index_path), headers={"Cache-Control": "no-cache"})
    logger.error(f"React app index.html not found at: {index_path}")
    return JSONResponse({"detail": "React app not found"}, status_code=404)

if __name__ == "__main__":
    # Run uvicorn server directly (for development)
    logger.info("Starting server directly from app.py")
    uvicorn.run(app, host="127.0.0.1", port=int(port))
