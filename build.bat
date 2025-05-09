@echo off
setlocal

echo 🔧 Building frontend...
cd fe
echo ▶️ In fe directory, running npm run build...
call npm run build
echo ◀️ Finished npm run build, returning to root...
cd ..

echo 🧹 Cleaning old backend\dist and backend\react folders...
rmdir /s /q backend\dist
rmdir /s /q backend\react
rmdir /s /q backend\build

echo 📦 Copying new dist folder to backend\react...
xcopy /E /I /Y fe\dist backend\react

echo 🚀 Entering backend directory and running pyinstaller...
cd backend
if exist crawlytics.db del /f /q crawlytics.db
echo ▶️ Running pyinstaller .\crawlytics.spec
pyinstaller .\crawlytics.spec

cd dist

echo 🗜️ Zipping Crawlytics folder...
powershell Compress-Archive -Path Crawlytics -DestinationPath Crawlytics.zip

rmdir /s /q Crawlytics

echo ✅ Done!
pause
