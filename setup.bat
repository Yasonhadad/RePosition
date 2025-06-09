@echo off
echo ============================================
echo  REPOSITION Football Analytics Setup
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed
node --version

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not available
    pause
    exit /b 1
)

echo [SUCCESS] npm is available

REM Install dependencies
echo.
echo [INFO] Installing dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed

REM Setup environment file
if not exist .env (
    echo [INFO] Setting up environment file...
    copy .env.example .env
    echo [WARNING] Please edit .env file with your database credentials
    echo [WARNING] You need to set up PostgreSQL and update the DATABASE_URL
) else (
    echo [SUCCESS] Environment file already exists
)

echo.
echo ============================================
echo  Setup Instructions
echo ============================================
echo.
echo 1. Install PostgreSQL from: https://www.postgresql.org/download/windows/
echo 2. Create database:
echo    - Open SQL Shell (psql)
echo    - CREATE DATABASE reposition_db;
echo    - CREATE USER reposition_user WITH PASSWORD 'yourpassword123';
echo    - GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
echo.
echo 3. Edit .env file with your database credentials
echo 4. Run: npm run db:push
echo 5. Run: npm run dev
echo 6. Open: http://localhost:5000
echo.

REM Ask if user wants to open .env file
set /p choice="Do you want to open .env file for editing? (Y/N): "
if /i "%choice%"=="Y" (
    if exist "%PROGRAMFILES%\Microsoft VS Code\Code.exe" (
        "%PROGRAMFILES%\Microsoft VS Code\Code.exe" .env
    ) else (
        notepad .env
    )
)

echo.
echo [SUCCESS] Setup completed!
echo Don't forget to setup PostgreSQL and edit .env file
pause