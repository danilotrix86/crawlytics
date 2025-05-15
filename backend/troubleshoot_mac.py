#!/usr/bin/env python3
"""
Troubleshooting script for Crawlytics on macOS
This script checks for common issues that might prevent the app from loading properly.
"""

import os
import sys
import platform
import pathlib
import logging
import sqlite3
import subprocess
import json
import time
from datetime import datetime

# Set up logging
log_file = f"troubleshoot_mac_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("troubleshoot")

def check_platform():
    """Check if running on macOS"""
    is_mac = platform.system() == "Darwin"
    logger.info(f"Running on macOS: {is_mac}")
    if not is_mac:
        logger.warning("This script is intended for macOS troubleshooting")
    return is_mac

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    logger.info(f"Python version: {sys.version}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        logger.error("Python 3.8 or higher is required")
        return False
    return True

def check_directory_structure():
    """Check directory structure"""
    script_dir = pathlib.Path(__file__).parent.resolve()
    logger.info(f"Script directory: {script_dir}")
    
    # Check for required files and directories
    required_files = [
        "app.py", 
        "run_app.py",
        "database/db.py",
        "database/schema.sql",
        "database/__init__.py"
    ]
    
    missing_files = []
    for file in required_files:
        file_path = script_dir / file
        exists = file_path.exists()
        logger.info(f"Checking {file}: {'Found' if exists else 'Missing'}")
        if not exists:
            missing_files.append(file)
    
    # Check for React app
    react_dir = script_dir / "react"
    react_exists = react_dir.exists()
    logger.info(f"React directory exists: {react_exists}")
    
    if react_exists:
        # Check for index.html and assets
        index_path = react_dir / "index.html"
        assets_dir = react_dir / "assets"
        
        logger.info(f"index.html exists: {index_path.exists()}")
        logger.info(f"assets directory exists: {assets_dir.exists()}")
        
        if assets_dir.exists():
            assets_files = list(assets_dir.glob("*"))
            logger.info(f"Assets directory contains {len(assets_files)} files")
            for asset in assets_files[:5]:  # Log the first 5 assets
                logger.info(f"Asset found: {asset.name}")
    
    if missing_files:
        logger.error(f"Missing required files: {', '.join(missing_files)}")
        return False
    
    return True

def check_database():
    """Check database access"""
    try:
        # Use the same logic as in the app to find the database
        script_dir = pathlib.Path(__file__).parent.resolve()
        app_support_dir = pathlib.Path.home() / "Library" / "Application Support" / "Crawlytics"
        
        # Check if database exists in current directory
        current_db = script_dir / "crawlytics.db"
        app_support_db = app_support_dir / "crawlytics.db"
        
        logger.info(f"Checking database in current directory: {current_db}")
        logger.info(f"Checking database in App Support: {app_support_db}")
        
        # Try to connect to both possible locations
        found_db = False
        
        if current_db.exists():
            logger.info(f"Database found in current directory")
            try:
                conn = sqlite3.connect(str(current_db))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                logger.info(f"Connected to database. Tables: {tables}")
                conn.close()
                found_db = True
            except Exception as e:
                logger.error(f"Error connecting to database in current directory: {e}")
        
        if app_support_db.exists():
            logger.info(f"Database found in Application Support")
            try:
                conn = sqlite3.connect(str(app_support_db))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                logger.info(f"Connected to database. Tables: {tables}")
                conn.close()
                found_db = True
            except Exception as e:
                logger.error(f"Error connecting to database in App Support: {e}")
        
        if not found_db:
            logger.warning("No database found. A new one will be created when the app runs.")
        
        return True
    except Exception as e:
        logger.error(f"Error checking database: {e}")
        return False

def check_network():
    """Check if local server can start and accept connections"""
    try:
        # Start a test server
        test_port = 8123
        server_process = None
        
        try:
            # Try to start uvicorn on a test port
            script_dir = pathlib.Path(__file__).parent.resolve()
            os.chdir(str(script_dir))
            
            # Create a simple test app
            test_app_path = script_dir / "test_app.py"
            with open(test_app_path, "w") as f:
                f.write("""
from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def read_root():
    return {"message": "Server is working"}
""")
            
            server_cmd = [
                sys.executable, "-m", "uvicorn", 
                "test_app:app", 
                "--host", "127.0.0.1", 
                "--port", str(test_port)
            ]
            
            logger.info(f"Starting test server with command: {' '.join(server_cmd)}")
            server_process = subprocess.Popen(
                server_cmd, 
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for server to start
            time.sleep(3)
            
            # Check if server is running
            if server_process.poll() is not None:
                stdout, stderr = server_process.communicate()
                logger.error(f"Test server failed to start. Exit code: {server_process.returncode}")
                logger.error(f"STDOUT: {stdout.decode()}")
                logger.error(f"STDERR: {stderr.decode()}")
                return False
            
            # Try to connect to the server
            import urllib.request
            response = urllib.request.urlopen(f"http://127.0.0.1:{test_port}")
            data = response.read().decode('utf-8')
            logger.info(f"Server response: {data}")
            return True
            
        finally:
            # Clean up test server
            if server_process and server_process.poll() is None:
                server_process.terminate()
                try:
                    server_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server_process.kill()
            
            # Clean up test file
            if test_app_path.exists():
                test_app_path.unlink()
    
    except Exception as e:
        logger.error(f"Error checking network: {e}")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlite3",
        "pydantic"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"Package '{package}' is installed")
        except ImportError:
            logger.error(f"Package '{package}' is not installed")
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.info("Install them with: pip install " + " ".join(missing_packages))
        return False
    
    return True

def generate_report():
    """Generate a troubleshooting report"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "platform": platform.platform(),
        "python_version": sys.version,
        "username": os.environ.get("USER", "unknown"),
        "current_directory": str(pathlib.Path.cwd()),
        "script_directory": str(pathlib.Path(__file__).parent.resolve()),
        "environment_variables": {
            key: value for key, value in os.environ.items() 
            if key.startswith(("PYTHON", "PATH", "HOME", "USER", "SHELL"))
        }
    }
    
    report_path = f"mac_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Report saved to {report_path}")
    return report_path

def main():
    """Run all checks"""
    logger.info("=== Crawlytics macOS Troubleshooting ===")
    
    # Run checks
    is_mac = check_platform()
    if not is_mac:
        logger.warning("Continuing anyway, but results may not be accurate")
    
    checks = {
        "Python Version": check_python_version(),
        "Directory Structure": check_directory_structure(),
        "Database": check_database(),
        "Dependencies": check_dependencies(),
        "Network": check_network()
    }
    
    # Print summary
    logger.info("\n=== Troubleshooting Summary ===")
    for check_name, result in checks.items():
        logger.info(f"{check_name}: {'✅ PASS' if result else '❌ FAIL'}")
    
    # Generate report
    report_path = generate_report()
    
    # Print final instructions
    logger.info("\n=== Next Steps ===")
    if all(checks.values()):
        logger.info("All checks passed! Your system should be able to run Crawlytics.")
        logger.info("If you're still having issues, try running the app with:")
        logger.info("python3 run_app.py")
    else:
        logger.info("Some checks failed. Please fix the issues and try again.")
        logger.info("You can share the troubleshooting report with support:")
        logger.info(f"Report file: {report_path}")
        logger.info(f"Log file: {log_file}")
    
    logger.info("\nFor additional support, please open an issue on GitHub with these files attached.")

if __name__ == "__main__":
    main() 