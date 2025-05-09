# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from pathlib import Path

block_cipher = None

spec_dir = Path(SPECPATH).resolve()
backend_dir = spec_dir

# Database files to include
database_dir = backend_dir / 'database'
database_data = [
    (str(database_dir / 'schema.sql'), os.path.join('database')),
]

# React build files
react_dir = backend_dir / 'react'
if react_dir.exists():
    react_data = []
    for base, dirs, files in os.walk(str(react_dir)):
        for file in files:
            file_path = Path(base) / file
            rel_path = file_path.relative_to(backend_dir)
            react_data.append((str(file_path), str(Path(rel_path).parent)))
else:
    print("Warning: React build directory not found.")
    react_data = []

# Make sure app.py is included
app_py = backend_dir / 'app.py'
app_data = [(str(app_py), '.')]

# Routes module
routes_dir = backend_dir / 'routes'
routes_data = []
if routes_dir.exists():
    for base, dirs, files in os.walk(str(routes_dir)):
        for file in files:
            if file.endswith('.py'):
                file_path = Path(base) / file
                rel_path = file_path.relative_to(backend_dir)
                routes_data.append((str(file_path), str(Path(rel_path).parent)))

# Combine all data files
data_files = database_data + react_data + app_data + routes_data

# Additional assets
additional_data = [
    (str(backend_dir / 'crawlytics.icns'), '.'),
]

# Add the icon if it exists
icns_path = backend_dir / 'crawlytics.icns'
icon = str(icns_path) if icns_path.exists() else None

a = Analysis(
    [str(backend_dir / 'run_app.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=data_files + additional_data,
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'database.db',
        'database.writer',
        'database.init_db',
        'routes.logs',
        'app',
        'fastapi',
        'starlette',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Crawlytics',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No terminal window for macOS app bundle
    disable_windowed_traceback=False,
    argv_emulation=True,  # For drag-and-drop support on macOS
    target_arch=None,
    codesign_identity=None,  # Set if you want to sign the app
    entitlements_file=None,  # Set if you want to sign the app
    icon=icon,  # Use .icns icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Crawlytics',
) 