@echo off
set "WORKDIR=.\app"
cd /d "%WORKDIR%"

if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
)

echo Starting application in production mode...
node . --production

pause