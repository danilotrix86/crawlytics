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
    base_dir = pathlib.Path(os.path.dirname(os.path.abspath(__file__)))
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
        
        # Configure server command
        server_cmd = [
            sys.executable, "-m", "uvicorn", "app:app", 
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
            wait_time = 5 if is_macos else 3
            logger.debug(f"Waiting {wait_time} seconds for server to start...")
            time.sleep(wait_time)

            # Open browser (localhost even if binding to 0.0.0.0)
            browser_url = f"http://localhost:{port}"
            logger.debug(f"Opening browser at {browser_url}")
            
            # Platform-specific browser opening
            if is_macos:
                subprocess.run(["open", browser_url])
            else:
                webbrowser.open(browser_url)

        logger.info("Server running. Press Ctrl+C to stop.")
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