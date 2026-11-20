# Crawlytics

## Overview

Crawlytics is an open-source analytics platform for detecting, analyzing, and visualizing Large Language Model (LLM) crawler traffic in server logs. This tool processes Apache and Nginx log files to identify and extract requests from AI crawlers such as ChatGPT, Gemini, Claude, and other LLM-based systems.

This project is 100% free and open-source software.

## Core Functionality

- **LLM Crawler Detection**: Identifies requests from AI systems in standard server logs
- **Data Visualization**: Provides heatmaps, charts, and geographic maps for traffic analysis
- **High-Performance Processing**: Efficiently processes large log files using parallel processing
- **SQL Query Interface**: Supports read-only SQL queries for custom data exploration
- **Multi-dimensional Analysis**: Examines traffic patterns by time, geography, and crawler type
- **Detailed Log Inspection**: Offers filterable, paginated views of individual log entries

## Architecture

- **Backend**: Python/FastAPI application with SQLite database for storage and query processing
- **Frontend**: React-based dashboard with responsive visualizations
- **Packaging**: Build scripts for creating standalone executables

## Quick Start with Docker

```
git clone https://github.com/danilotrix86/crawlytics.git
cd crawlytics
docker compose up -d
```

Then open http://localhost:8000. Imported data and your crawler patterns are kept in the `crawlytics-data` volume.

## Setup Instructions (without Docker)

1. **Clone repository**:
   ```
   git clone https://github.com/danilotrix86/crawlytics.git
   cd crawlytics\backend
   ```

2. **Configure Python environment**:
   ```
   python -m venv venv  # Windows
   # OR
   python3 -m venv venv  # Linux/Mac
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```
3. **Install backend dependencies**:
   ```
   pip install -r requirements.txt  # Windows
   # OR
   pip3 install -r requirements.txt  # Linux/Mac
   ```
   
4. **Start the application**:
   ```
   python run_app.py  # Windows
   # OR
   python3 run_app.py  # Linux/Mac
   ```

## Launching After first time Setup

Once you have completed the initial setup, you don't need to repeat all steps when launching the application in the future:

1. **Navigate to the backend directory**:
   ```
   cd crawlytics\backend
   ```

2. **Activate the virtual environment**:
   ```
   .\venv\Scripts\activate  # Windows
   # OR
   source venv/bin/activate  # Linux/Mac
   ```

3. **Start the server**:
   ```
   python run_app.py  # Windows
   # OR
   python3 run_app.py  # Linux/Mac
   ```

## Frontend Development

**Note**: The following section is only relevant if you intend to make changes to the frontend code. These steps are not required for normal usage of the application.

After modifying frontend code, rebuild and copy to the backend directory:

**Windows**:
```
cd fe
npm install
npm run build
cd ..
xcopy /E /I /Y fe\dist backend\react
```

**Mac/Linux**:
```
cd fe
npm install
npm run build
cd ..
mkdir -p backend/react
cp -R fe/dist/* backend/react/
```

## Customizing LLM Crawler Detection

Open **Settings** in the app to add, remove or reset the crawler patterns. Each pattern is matched case-insensitively as a substring of the user agent; when several match, the longest wins (so `Applebot-Extended` isn't counted as `Applebot`).

Your list is saved as JSON in `backend/data/crawler_patterns.json` (set `CRAWLYTICS_PATTERNS_PATH` to store it elsewhere). The built-in defaults live in `backend/parser/crawler_patterns.py`.

Update the patterns before importing logs: detection runs at import time.

## Supported Log Files

Apache and Nginx combined log format, as `.log`, `.txt` or gzip-compressed `.gz` files.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Port used by `run_app.py` |
| `DB_PATH` | `crawlytics.db` | SQLite database location |
| `CRAWLYTICS_PATTERNS_PATH` | `backend/data/crawler_patterns.json` | Saved crawler pattern list |
| `CRAWLYTICS_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Host names the server answers to; add your domain when deploying |
| `CRAWLYTICS_CORS_ORIGINS` | the local app and Vite dev server | Extra origins allowed to call the API |
| `PRODUCTION` | off | Binds to `0.0.0.0` and disables the API docs |

Crawlytics has no authentication. Keep it on localhost or put it behind an authenticating reverse proxy.

## Running Tests

```
cd backend
pip install -r requirements-dev.txt
python -m pytest tests
```

GitHub Actions runs the backend tests, the frontend lint and build, and a Docker build on every push and pull request.

## Screenshots

### Main Dashboard

![Main Dashboard](screenshots/dashboard-metrics.png)

The main dashboard provides a comprehensive overview of your website's crawler activity:
- Total log entries with detailed database statistics
- Unique LLM crawlers detected with crawler identification
- Distinct URLs requested by crawlers showing content accessed
- Top crawler statistics with percentage breakdowns
- Error rate analysis with client/server error distribution
- Crawler density metrics showing average crawlers per page

### Top Crawler Activity Timeline

![Top Crawler Activity Timeline](screenshots/crawler-activity-timeline.png)

The stacked area chart shows crawler activity over time:
- Visualizes traffic patterns for multiple crawler types simultaneously
- Color-coded areas for each crawler (ChatGPT-User, Googlebot, Bytespider, etc.)
- Daily activity trends showing peak usage periods
- Comparative view of crawler distribution and market share

### Traffic Insight Heatmap

![Traffic Insight Heatmap](screenshots/traffic-insight-heatmap.png)

The detailed heatmap visualization shows:
- Traffic intensity by day of week and hour of day
- Color gradient indicating request volume
- Clear patterns of high and low activity periods
- Easy identification of when LLM crawlers are most active on your site

### Geographic Insights

![Geographic Insights](screenshots/geo-insight.png)

The geographic insight panel displays:
- Global request distribution with percentage breakdowns
- Color-coded regions by request volume
- Regional traffic patterns and hotspots
- Comprehensive breakdown of traffic sources by region

### Crawler Behaviour Analysis

![Crawler Behaviour Analysis](screenshots/crawler-behaviour.png)

The crawler behavior panel provides advanced metrics:
- Crawler speed metrics showing requests per minute
- Path depth analysis showing navigation patterns
- Error rate statistics with troubleshooting guidance
- Path analysis showing most accessed content by crawler

### Access Log Table

![Access Log Table](screenshots/access-log-table.png)

The logs table provides granular access to your data:
- Advanced filtering by crawler, path, method, and status code
- Date range selection with precise timestamps
- Real-time IP address and request details
- Sortable columns for customized analysis

### Log Upload Interface

![Log Upload Interface](screenshots/log-upload.png)

The simple upload interface allows you to:
- Select and upload server log files (.log or .txt)
- Process Apache, Nginx, or other standard log formats
- Automatically analyze and extract LLM crawler data
- Seamlessly integrate new data into your analytics

### LLM Crawler Settings

![LLM Crawler Settings](screenshots/crawler-settings-panel.png)

The settings panel allows you to customize crawler detection:
- Maintain a comprehensive list of LLM crawler patterns
- Add new crawler user agents as they emerge
- Configure detection parameters for optimal accuracy
- Reset to default patterns or save custom configurations

### Navigation Sidebar

<img src="screenshots/sidebar.png" width="35%" alt="Navigation Sidebar">

The sidebar navigation provides quick access to:
- Dashboard overview and key metrics
- Traffic insight and pattern analysis
- Geographic distribution visualization
- Crawler behavior statistics
- Detailed logs table with filtering
- Log file upload interface
- Settings and configuration options
- Log file management and organization

## Contact

For questions, feature requests, or technical support, please:
- [Open an issue](https://github.com/danilotrix86/crawlytics/issues) on GitHub (preferred)
- Send an email to the maintainer with "CRAWLYTICS" in the subject line: danilo.vaccalluzzo@gmail.com

## License

Crawlytics is released under the [MIT License](LICENSE).

This means you can:
- Use the software commercially
- Modify the source code
- Distribute modified versions
- Use it privately
- Sublicense it

The only requirement is to include the original copyright notice and license text in any copy of the software/source.

Copyright (c) 2024 Danilo Vaccalluzzo

---

Contributions welcome. Report issues via GitHub.
