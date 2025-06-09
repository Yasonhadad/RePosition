@echo off
echo Installing all dependencies for local REPOSITION project...
echo.

echo Installing Node.js dependencies...
npm install

echo.
echo Installing additional PostgreSQL dependencies...
npm install pg @types/pg drizzle-orm

echo.
echo Installing Python dependencies for data loading...
pip install pandas psycopg2-binary

echo.
echo Updating package versions...
npm update

echo.
echo Running security audit fix...
npm audit fix

echo.
echo Installation complete!
echo.
echo To start the local server, run: start-local.bat
echo To load data, run: python load_local_data.py
pause