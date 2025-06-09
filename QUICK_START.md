# 🚀 Quick Start Guide - REPOSITION Football Analytics

## Prerequisites Installation

### 1. Install Node.js
Download and install Node.js 18+ from: https://nodejs.org

### 2. Install PostgreSQL
**Windows/Mac**: Download from https://www.postgresql.org/download/
**Ubuntu/Linux**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

## 5-Minute Setup

### 1. Download & Extract Project
Extract the project files to your desired folder

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
# Start PostgreSQL service (if not running)
sudo service postgresql start  # Linux
brew services start postgresql  # Mac

# Create database
sudo -u postgres psql
CREATE DATABASE reposition_db;
CREATE USER reposition_user WITH PASSWORD 'yourpassword123';
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
\q
```

### 4. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
```

### 5. Initialize Database
```bash
npm run db:push
```

### 6. Start Application
```bash
npm run dev
```

🎉 **Done!** Open http://localhost:5000

## First Time Setup

1. **Register Account**: Click "Sign Up" to create your account
2. **Import Data**: Use the data import scripts if you have CSV files
3. **Explore**: Start searching for players and analyzing positions

## Common Commands

```bash
# Development
npm run dev          # Start development server

# Database
npm run db:push      # Update database schema

# Production
npm run build        # Build for production
npm start           # Start production server
```

## Troubleshooting

**Database Connection Error?**
- Check PostgreSQL is running: `sudo service postgresql status`
- Verify credentials in .env file

**Port 5000 in use?**
- Kill existing process: `lsof -ti:5000 | xargs kill -9`

**Dependencies Error?**
- Clear and reinstall: `rm -rf node_modules && npm install`

## Data Import (Optional)

If you have player data CSV files:
```bash
# Import base data
node load_competitions_clubs.py
node load_all_players.py

# Apply ML analysis
node batch_update_advanced_ml.py
```

---

**Need help?** Check the full README.md for detailed documentation.