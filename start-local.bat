@echo off
echo Starting REPOSITION Server with Local Database...
echo Database: postgresql://reposition_user:1234@localhost:5432/reposition_db

REM Test PostgreSQL connection first
echo Testing PostgreSQL connection...
psql -h localhost -U reposition_user -d reposition_db -c "SELECT 1;" > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL database
    echo Please ensure PostgreSQL is running and database exists
    echo Run: psql -U postgres -c "CREATE DATABASE reposition_db; CREATE USER reposition_user WITH PASSWORD '1234'; GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;"
    pause
    exit /b 1
)

echo PostgreSQL connection successful!

REM Set environment variables for local development
set NODE_ENV=development
set DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
set SESSION_SECRET=reposition-dev-secret-key

REM Start the server
echo Starting Node.js server...
npx tsx server/index.ts