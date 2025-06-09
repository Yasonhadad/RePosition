@echo off
echo Starting REPOSITION Server with Local Database...
echo Database: postgresql://reposition_user:1234@localhost:5432/reposition_db

REM Set environment variables for local development
set NODE_ENV=development
set DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
set SESSION_SECRET=reposition-dev-secret-key

REM Start the server
npx tsx server/index.ts