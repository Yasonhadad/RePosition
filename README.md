# RePosition – Player Position Analytics

Analyze football player position compatibility with Python models and a modern TypeScript/Node web app.

## Table of Contents
1. [Project Name](#project-name)
2. [About](#about)
3. [Features](#features)
4. [Installation](#installation)
5. [Usage](#usage)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [License](#license)

---

## Project Name
RePosition – Player Position Analytics

## About
RePosition helps analysts, scouts, and football enthusiasts evaluate how well a player fits different positions. It combines:
- A Python-based modeling pipeline to compute position compatibility scores
- A full-stack web application (React + Express) to search, view, analyze, and compare players
- A CSV upload tool to score external players that are not in the database


## Features
- Player search, details, and favorites
- Team analysis dashboard 
- Global statistics (players, teams, competitions)
- Position compatibility for DB players (stored in Postgres)
- External CSV upload to compute compatibility 
- Modern UI/UX with responsive design

## Installation
### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+

### 1) Clone and install
```bash
npm install
pip install -r requirements.txt
```

### 2) Database setup
Default connection (see `server/db.ts`):
```text
postgresql://reposition_user:1234@localhost:5432/reposition_db
```
Create locally (psql):
```sql
CREATE USER reposition_user WITH PASSWORD '1234';
CREATE DATABASE reposition_db OWNER reposition_user;
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```
Optional `.env` in project root:
```ini
  DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
  SESSION_SECRET=replace-with-a-long-random-secret
```

### 3) Create database schema
```bash
npm run db:push
```
This creates all the database tables based on the schema definitions in `shared/schema.ts`. Run this command whenever you modify the database schema.

### 4) Load base data (players, clubs, competitions) & Compute compatibility for DB players

```bash
python models/data_loader.py
```
This writes `data/result.csv` and updates the `position_compatibility`, players, clubs, competitions tables.

**Note**: Make sure to run `npm run db:push` first to create the database schema before loading data.

## Usage
### Database Management
- **Schema changes**: If you modify `shared/schema.ts`, run `npm run db:push` to update the database structure
- **Data loading**: Run `python models/data_loader.py` to load/update player data and compute compatibility scores

### Run in development (HMR)
```bash
npm run dev
```
Open `http://localhost:5000`.

### Build & run in production
```bash
npm run build
npm run start
```

### Using the UI
- Authentication: Sign in/up via the top-right avatar menu
- Navigation:
  - Dashboard – overview cards and quick links
  - Player Search – filter by name, position, country, etc.
  - Player Details – card with attributes + compatibility (if exists)
  - Team Analysis – club-level breakdown and best-fit insights
  - Favorites – your saved players
  - CSV Upload – upload external CSV for on-the-fly scoring

### CSV Upload
- Go to `/upload`
- Click "Download Template" to get a valid header
- Upload CSV, then Process — results appear in a table and can be downloaded as JSON/CSV


## Tech Stack
- Client: React, Vite, Tailwind, shadcn/ui, TanStack Query
- Server: Express (TypeScript), Drizzle ORM, Vite (dev middleware)
- Database: PostgreSQL with Drizzle ORM for type-safe queries
- ML: Python (pandas, numpy, scikit‑learn, xgboost)

## Project Structure
```text
.
├─ client/
│  ├─ src/
│  │  ├─ pages/                 # dashboard, player-search, player-details, team-analysis, favorites, auth-page, csv-upload
│  │  ├─ components/            # UI components
│  │  ├─ lib/                   # api.ts, queryClient.ts, utils.ts
│  │  └─ hooks/                 # custom hooks
│  └─ index.html
├─ server/
│  ├─ index.ts                  # runtime entry (dev/prod)
│  ├─ routes.ts                 # REST API (players, teams, stats, CSV upload)
│  ├─ auth.ts                   # session auth (local)
│  ├─ storage.ts                # DB access layer (Drizzle)
│  ├─ db.ts                     # Postgres connection
│  └─ vite.ts                   # Vite integration
├─ shared/
│  └─ schema.ts                 # Database schema definitions (Drizzle ORM + Zod validation)
├─ drizzle.config.ts            # Drizzle configuration for database migrations
├─ models/
│  ├─ predict_player_positions.py  # compute compatibility for DB players (writes to DB)
│  ├─ predict_from_csv.py          # compute compatibility for external CSV (no DB writes)
│  ├─ pos_models.py                # model refresh/helpers
│  └─ feat_*.csv, corr_*.csv       # features metadata
├─ data/                        # CSV inputs/outputs used by loaders/scripts
├─ models/
│  ├─ data_loader.py            # load base CSVs to DB
├─ requirements.txt             # Python deps (pandas, numpy, sklearn, xgboost, SQLAlchemy ...)
├─ package.json                 # npm scripts and deps
└─ README.md
```

## License
MIT
