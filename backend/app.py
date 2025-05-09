import os
import logging
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import uvicorn

# Import routes
from routes.logs import router as logs_router

# Fix for running as packaged application where stdout might be None
# This prevents the "NoneType has no attribute isatty" error
def fix_logging_for_packaged_app():
    # Only apply fix when running as a packaged app (PyInstaller)
    if getattr(sys, 'frozen', False):
        # Override uvicorn's ColourizedFormatter to avoid isatty checks
        from uvicorn.logging import ColourizedFormatter
        original_init = ColourizedFormatter.__init__
        
        def patched_init(self, *args, **kwargs):
            # Remove use_colors argument to avoid isatty check
            kwargs['use_colors'] = False
            original_init(self, *args, **kwargs)
            
        ColourizedFormatter.__init__ = patched_init

# Apply logging fix
fix_logging_for_packaged_app()

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

# Create FastAPI app
app = FastAPI(
    title="Crawlytics API",
    description="API for processing server logs and identifying LLM crawler requests",
    version="1.0.0"
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(logs_router, prefix="/api")

# Define the path to the static files (React build)
static_files_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "react")

# Mount the static files directory
app.mount("/assets", StaticFiles(directory=os.path.join(static_files_dir, "assets")), name="assets")
app.mount("/logo", StaticFiles(directory=os.path.join(static_files_dir, "logo")), name="logo")

# Serve favicon.ico
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(os.path.join(static_files_dir, "favicon.ico"))

# Serve vite.svg
@app.get("/vite.svg", include_in_schema=False)
async def vite_svg():
    return FileResponse(os.path.join(static_files_dir, "vite.svg"))

# Catch-all route to serve index.html for any other routes (for client-side routing)
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
async def serve_react_app(request: Request, full_path: str):
    # Exclude API routes from catch-all
    if full_path.startswith("api/"):
        return {"detail": "Not Found"}
    
    # Log the request path
    logger.info(f"Serving React app for path: {full_path}")
    
    # Return the index.html file for all other routes
    return FileResponse(os.path.join(static_files_dir, "index.html"))

if __name__ == "__main__":
    # Run uvicorn server
    logger.info(f"Starting server with React app at {static_files_dir}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
