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

