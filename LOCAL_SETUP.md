# REPOSITION - Local Setup Guide

## Prerequisites

1. **PostgreSQL** - Make sure PostgreSQL is installed and running
2. **Node.js** - Version 18 or higher
3. **Python** - Version 3.8 or higher with pip

## Database Setup

1. Create PostgreSQL database and user:
```sql
CREATE DATABASE reposition_db;
CREATE USER reposition_user WITH PASSWORD '1234';
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```

2. Create tables using Drizzle schema (run from project root):
```bash
npm run db:push
```

## Installation

Run the installation script to install all dependencies:
```bash
install-local-dependencies.bat
```

This will install:
- All Node.js dependencies
- PostgreSQL drivers for Node.js
- Python libraries for data loading

## Data Loading

Load your CSV data into the local database:
```bash
python load_local_data.py
```

This will load:
- 44 competitions
- 439 clubs  
- 1 user (yossihd3000@gmail.com)
- 3,946 players
- 3,946 position compatibility records

## Starting the Server

Start the local server:
```bash
start-local.bat
```

The server will run on http://localhost:5000

## Login Credentials

- **Email:** yossihd3000@gmail.com
- **Password:** [Use the password from your CSV file]

## Files Overview

- `load_local_data.py` - Loads all CSV data into local PostgreSQL
- `start-local.bat` - Starts server with local database connection
- `install-local-dependencies.bat` - Installs all required dependencies

## Troubleshooting

1. **Database connection issues:** Verify PostgreSQL is running and credentials are correct
2. **Login issues:** Check if user data was loaded correctly
3. **Missing data:** Re-run the data loading script

## Project Structure

```
PlayerPositionAnalytics/
├── client/           # React frontend
├── server/           # Express backend  
├── shared/           # Shared schemas
├── attached_assets/  # CSV data files
└── local scripts...  # Local setup files
```