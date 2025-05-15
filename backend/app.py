import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import uvicorn

# Import routes
from routes.logs import router as logs_router
from routes.crawler_config import router as crawler_config_router

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

# CORS settings based on environment
origins = ["*"]  # Default for development
if production:
    # In production, restrict to specific domains
    origins = [
        "http://localhost",
        "http://localhost:8000",
        # Add your production domains here
        # "https://your-production-domain.com"
    ]

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"] if production else ["*"],
    allow_headers=["Content-Type", "Authorization"] if production else ["*"],
)

# Include routers
app.include_router(logs_router, prefix="/api")
app.include_router(crawler_config_router, prefix="/api")

# Define the path to the static files (React build)
static_files_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "react")
logger.info(f"Serving React app from: {static_files_dir}")

# Check if directories exist before mounting
assets_dir = os.path.join(static_files_dir, "assets")
logo_dir = os.path.join(static_files_dir, "logo")

# Mount the static files directory if they exist
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
if os.path.exists(logo_dir):
    app.mount("/logo", StaticFiles(directory=logo_dir), name="logo")

# Serve favicon.ico
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = os.path.join(static_files_dir, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return {"detail": "Not found"}

# Serve vite.svg
@app.get("/vite.svg", include_in_schema=False)
async def vite_svg():
    svg_path = os.path.join(static_files_dir, "vite.svg")
    if os.path.exists(svg_path):
        return FileResponse(svg_path)
    return {"detail": "Not found"}

# Add a health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# Catch-all route to serve index.html for any other routes (for client-side routing)
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
async def serve_react_app(request: Request, full_path: str):
    # Exclude API routes from catch-all
    if full_path.startswith("api/"):
        return {"detail": "Not Found"}
    
    # Log the request path at debug level to avoid log spam
    logger.debug(f"Serving React app for path: {full_path}")
    
    # Return the index.html file for all other routes
    index_path = os.path.join(static_files_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "React app not found"}

if __name__ == "__main__":
    # Run uvicorn server directly (for development)
    logger.info("Starting server directly from app.py")
    uvicorn.run(app, host="0.0.0.0", port=8000)
