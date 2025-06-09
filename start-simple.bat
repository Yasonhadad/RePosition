@echo off
echo Starting REPOSITION Server...

REM Set environment variables
set NODE_ENV=development
set DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
set SESSION_SECRET=reposition-dev-secret-key

REM Start the server directly
npm run dev