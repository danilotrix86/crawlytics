import subprocess
import time
import webbrowser
import os
import sys
import pathlib
import traceback
import logging

# Set up logging
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
logging.basicConfig(
    level=logging.DEBUG,
    format=log_format,
    handlers=[
        logging.FileHandler("crawlytics_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("crawlytics-debug")

def is_packaged():
    """Check if the application is running as a packaged PyInstaller app"""
    is_frozen = getattr(sys, 'frozen', False)
    has_meipass = hasattr(sys, '_MEIPASS')
    logger.debug(f"Is frozen: {is_frozen}, Has _MEIPASS: {has_meipass}")
    return is_frozen and has_meipass

def get_base_dir():
    """Get the base directory for the application"""
    if is_packaged():
        # If packaged with PyInstaller
        base_dir = pathlib.Path(sys._MEIPASS)
        logger.debug(f"Using PyInstaller _MEIPASS directory: {base_dir}")
    else:
        # If running in development
        base_dir = pathlib.Path(os.path.dirname(os.path.abspath(__file__)))
        logger.debug(f"Using development directory: {base_dir}")
    
    # Log the directory contents to help debug
    logger.debug(f"Contents of base directory: {[x.name for x in base_dir.iterdir()]}")
    return base_dir

def main():
    try:
        # If this is the server subprocess, just run uvicorn and exit
        if os.environ.get("CRAWLYTICS_IS_SERVER") == "1":
            import uvicorn
            from app import app
            uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")
            return

        logger.debug("Starting Crawlytics in debug mode")
        logger.debug(f"Python version: {sys.version}")
        logger.debug(f"Current working directory: {os.getcwd()}")
        logger.debug(f"Script location: {__file__}")
        logger.debug(f"sys.executable: {sys.executable}")
        logger.debug(f"sys.path: {sys.path}")
        
        # Change to the application directory
        base_dir = get_base_dir()
        os.chdir(str(base_dir))
        logger.debug(f"Changed working directory to: {os.getcwd()}")
        
        # Set environment variables for database path
        if is_packaged():
            # When packaged, use a database in the user's AppData/Local folder
            if sys.platform == "darwin":
                app_data_dir = pathlib.Path(os.path.expanduser('~/Library/Application Support'))
            elif os.name == "nt":
                app_data_dir = pathlib.Path(os.getenv('LOCALAPPDATA'))
            else:
                app_data_dir = pathlib.Path(os.path.expanduser('~/.local/share'))
            data_dir = app_data_dir / "Crawlytics"
            data_dir.mkdir(parents=True, exist_ok=True)
            
            # Set the database path environment variable
            os.environ['DB_PATH'] = str(data_dir / "crawlytics.db")
            
            logger.debug(f"Using database at: {os.environ['DB_PATH']}")
            
            # Check for database directory and schema.sql
            db_dir = base_dir / "database"
            if db_dir.exists():
                logger.debug(f"Database directory exists: {db_dir}")
                logger.debug(f"Contents: {[x.name for x in db_dir.iterdir()]}")
            else:
                logger.error(f"Database directory not found: {db_dir}")
        
        # Check for app.py
        app_path = base_dir / "app.py"
        if app_path.exists():
            logger.debug(f"app.py found: {app_path}")
        else:
            logger.error(f"app.py not found at {app_path}")
            # Look for it
            app_files = list(base_dir.rglob("app.py"))
            logger.debug(f"Found app.py files: {app_files}")
        
        # Find python executable for subprocess
        python_exe = sys.executable
        if is_packaged():
            # Try to find the real python.exe in PATH
            import shutil
            real_python = shutil.which("python") or shutil.which("python3")
            use_real_python = False
            if real_python:
                # Check if uvicorn is installed in the real python
                try:
                    import subprocess as sp
                    result = sp.run([real_python, "-m", "uvicorn", "--help"], capture_output=True, text=True)
                    if result.returncode == 0:
                        python_exe = real_python
                        use_real_python = True
                        logger.debug(f"Using real python interpreter for subprocess: {python_exe}")
                    else:
                        logger.warning(f"uvicorn not found in real python, using sys.executable: {sys.executable}")
                except Exception as e:
                    logger.warning(f"Could not check uvicorn in real python: {e}. Using sys.executable: {sys.executable}")
            else:
                logger.warning(f"Could not find python.exe in PATH, using sys.executable: {python_exe}")

        # Start the FastAPI server using subprocess, mark as server
        logger.debug("Starting Crawlytics server subprocess...")
        env = os.environ.copy()
        env["CRAWLYTICS_IS_SERVER"] = "1"
        # Force PYTHONPATH and working directory to base_dir for correct imports
        env["PYTHONPATH"] = str(base_dir)
        server = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000", "--log-level", "debug"
        ], env=env, cwd=str(base_dir))
        logger.debug("Started server as subprocess")

        # Wait a bit for the server to start
        logger.debug("Waiting for server to start...")
        time.sleep(3)

        # Open the browser only in the original process
        logger.debug("Opening browser...")
        webbrowser.open("http://localhost:8000/#/dashboard")

        logger.debug("Waiting for server process to finish")
        server.wait()
    except Exception as e:
        logger.error(f"Uncaught exception: {e}")
        logger.error(traceback.format_exc())
        # Keep console open so user can see error
        if is_packaged():
            input("Press Enter to exit...")

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    main() 