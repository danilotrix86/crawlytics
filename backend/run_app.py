import subprocess
import time
import webbrowser
import os
import sys
import pathlib
import traceback
import logging
import platform
import signal

# Set up logging
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
logging.basicConfig(
    level=logging.INFO,  # Default to INFO level
    format=log_format,
    handlers=[
        logging.FileHandler("crawlytics.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("crawlytics")

# Enable debug mode with environment variable
if os.environ.get("CRAWLYTICS_DEBUG", "").lower() in ("1", "true", "yes"):
    logger.setLevel(logging.DEBUG)
    logger.debug("Debug mode enabled")

def get_base_dir():
    """Get the base directory for the application"""
    # Use Path for cross-platform compatibility
    base_dir = pathlib.Path(os.path.abspath(__file__)).parent
    base_dir = base_dir.resolve()  # Ensure we have the absolute path with symlinks resolved
    logger.debug(f"Using directory: {base_dir}")
    return base_dir

def signal_handler(sig, frame):
    """Handle Ctrl+C and other termination signals"""
    logger.info("Shutdown signal received, exiting...")
    sys.exit(0)

def main():
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    if platform.system() != "Windows":
        signal.signal(signal.SIGTERM, signal_handler)
    
    server = None
    try:
        logger.info("Starting Crawlytics")
        logger.debug(f"Python version: {sys.version}")
        logger.debug(f"Platform: {platform.system()} {platform.release()}")
        
        # Change to the application directory
        base_dir = get_base_dir()
        os.chdir(str(base_dir))
        
        # Determine if we're in production mode
        production = os.environ.get("PRODUCTION", "").lower() in ("1", "true", "yes")
        host = "0.0.0.0" if production else "127.0.0.1"
        port = int(os.environ.get("PORT", "8000"))
        
        # Verify that the app.py file exists
        app_path = base_dir / "app.py"
        if not app_path.exists():
            logger.error(f"app.py not found at: {app_path}")
            sys.exit(1)
            
        # Verify that the react directory exists
        react_path = base_dir / "react"
        if not react_path.exists():
            logger.warning(f"React directory not found at: {react_path}")
            logger.warning("The application may not serve the frontend correctly.")
        
        # Configure server command - use module name rather than file path for better compatibility
        server_cmd = [
            sys.executable, "-m", "uvicorn", 
            "app:app",  # Use module:app format instead of file path 
            "--host", host, 
            "--port", str(port)
        ]
        
        # Add production settings
        if production:
            logger.info("Running in PRODUCTION mode")
            server_cmd.extend(["--workers", "4"])
        else:
            logger.info(f"Running in DEVELOPMENT mode on http://{host if host != '0.0.0.0' else 'localhost'}:{port}")
            if logger.level <= logging.DEBUG:
                server_cmd.extend(["--log-level", "debug", "--reload"])
        
        # Start the server
        logger.debug(f"Starting server with command: {' '.join(server_cmd)}")
        server = subprocess.Popen(server_cmd, cwd=str(base_dir))

        # In development mode, open browser after startup delay
        if not production:
            # Determine platform-specific settings
            is_macos = platform.system() == "Darwin"
            wait_time = 7 if is_macos else 3  # Increase wait time for macOS
            logger.debug(f"Waiting {wait_time} seconds for server to start...")
            time.sleep(wait_time)

            # Open browser (localhost even if binding to 0.0.0.0)
            browser_url = f"http://localhost:{port}"
            logger.debug(f"Opening browser at {browser_url}")
            
            # Platform-specific browser opening
            try:
                if is_macos:
                    subprocess.run(["open", browser_url])
                else:
                    webbrowser.open(browser_url)
            except Exception as e:
                logger.error(f"Error opening browser: {e}")
                logger.info(f"Please manually open {browser_url} in your browser")

        logger.info("Server running. Press Ctrl+C to stop.")
        # Check if server is still running
        if server.poll() is not None:
            logger.error(f"Server process exited with code {server.returncode}")
            sys.exit(1)
            
        server.wait()
        
    except Exception as e:
        logger.error(f"Error: {e}")
        logger.debug(traceback.format_exc())
    finally:
        # Clean up server process if still running
        if server and server.poll() is None:
            logger.debug("Terminating server process")
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning("Server process didn't terminate gracefully, forcing...")
                server.kill()

if __name__ == "__main__":
    main() 