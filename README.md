# RePosition – Player Position Analytics

Analyze football player position compatibility with Python ML models and a modern TypeScript/Node web app.

## Table of Contents
1. [About](#about)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Quick Start with Docker](#quick-start-with-docker)
5. [Local Development](#local-development)
6. [Usage](#usage)
7. [Project Structure](#project-structure)
8. [License](#license)

---

## About

RePosition helps analysts, scouts, and football enthusiasts evaluate how well a player fits different positions. It combines:

- A **Python-based ML pipeline** to compute position compatibility scores (XGBoost, feature importance, z-score aggregation)
- A **full-stack web app** (React + Express) to search, view, analyze, and compare players
- **CSV upload** to score external players that are not in the database

## Features

- Player search, details, and favorites
- Team analysis dashboard
- Global statistics (players, teams, competitions)
- Position compatibility for DB players (stored in PostgreSQL)
- External CSV upload to compute compatibility
- Modern UI/UX with responsive design
- **Docker** support: run app + PostgreSQL with one command

## Tech Stack

- **Client:** React, Vite, Tailwind, shadcn/ui, TanStack Query
- **Server:** Express (TypeScript), Drizzle ORM, Vite (dev middleware)
- **Database:** PostgreSQL with Drizzle ORM
- **ML:** Python (pandas, numpy, scikit-learn, xgboost, SQLAlchemy, psycopg2)

---

## Quick Start with Docker

The recommended way to run the full app (database + application) is with Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)

### 1. Configure environment

Copy the example env file and set your database password and secrets:

```bash
copy .env.example .env
```

Edit `.env` and set at least:

- `POSTGRES_PASSWORD` – password for the PostgreSQL container
- `DATABASE_URL` – full connection string (see `.env.example`; for Docker it is built from the variables above)
- `SESSION_SECRET` – a long random string for session signing

**Never commit `.env`.** It is gitignored.

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- First run: builds the app image, starts PostgreSQL, runs **bootstrap** (schema + load data + position compatibility). This can take several minutes.
- When you see `serving on port 5000`, open **http://localhost:5000**.

### 3. Optional: faster startup (skip bootstrap)

If the database already has data (e.g. after the first run), set in `docker-compose.yml` or in `.env`:

```ini
BOOTSTRAP_ON_START=false
```


---

## Local Development

For development without Docker (e.g. hot reload, debugging), run PostgreSQL locally and use Node + Python on your machine.

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+

### 1. Install dependencies

```bash
npm install
pip install -r requirements.txt
```

### 2. Environment and database

- Copy `.env.example` to `.env` and set `DATABASE_URL`, `SESSION_SECRET`, and optionally `POSTGRES_PASSWORD` (for consistency with Docker).
- Create the database and user (replace the password with the one from your `.env`):

```sql
CREATE USER reposition_user WITH PASSWORD 'your_password';
CREATE DATABASE reposition_db OWNER reposition_user;
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```

### 3. Schema and data

```bash
# Create/update tables
npm run db:push

# Load base data and compute position compatibility (optional if using Docker first)
python models/data_loader.py
```

### 4. Run the app

```bash
npm run dev
```

Open **http://localhost:5000**.

### Build for production (without Docker)

```bash
npm run build
npm run start
```

---

## Usage

### Database

- **Schema changes:** After editing `shared/schema.ts`, run `npm run db:push`.
- **Data reload:** Run `python models/data_loader.py` (or set `BOOTSTRAP_ON_START=true` and restart the Docker app once).

### Using the UI

- **Auth:** Sign in / register via the top-right avatar menu.
- **Dashboard** – overview and quick links.
- **Player Search** – filter by name, position, country, etc.
- **Player Details** – attributes and position compatibility.
- **Team Analysis** – club-level breakdown and best-fit insights.
- **Favorites** – saved players.
- **CSV Upload** (`/upload`) – upload a CSV, download template, process and download results (JSON/CSV).

### Security note

All credentials (database URL, session secret, PostgreSQL password) are read from **environment variables** and from **`.env`**. No passwords are hardcoded. Use `.env.example` as a template and keep `.env` out of version control.

---

## Project Structure

```text
.
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── pages/         # dashboard, player-search, player-details, team-analysis, favorites, auth, csv-upload
│   │   ├── components/    # UI components (layout, player, ui)
│   │   ├── lib/           # api, queryClient, utils
│   │   └── hooks/
│   └── index.html
├── server/
│   ├── index.ts           # Entry: routes, bootstrap (optional), listen
│   ├── routes.ts          # REST API
│   ├── auth.ts            # Session auth (Passport)
│   ├── storage.ts         # Drizzle-based DB layer
│   ├── db.ts              # PostgreSQL connection (uses DATABASE_URL)
│   └── vite.ts            # Vite dev middleware
├── shared/
│   └── schema.ts          # Drizzle schema + Zod validation
├── models/                # Python ML and data loading
│   ├── data_loader.py     # Load CSVs → DB; triggers position compatibility
│   ├── predict_player_positions.py  # Compatibility for DB players → position_compatibility
│   ├── predict_from_csv.py          # Compatibility for external CSV (no DB write)
│   ├── pos_models.py      # XGBoost training / refresh
│   └── feat_*.csv, corr_*.csv       # Feature metadata
├── data/                  # CSV inputs/outputs (players, clubs, competitions, result.csv)
├── public/                # Static assets
├── .env.example           # Template for env vars (no secrets)
├── docker-compose.yml     # App + PostgreSQL
├── Dockerfile             # Multi-stage app image (Node + Python)
├── drizzle.config.ts      # Drizzle Kit config (uses DATABASE_URL)
├── requirements.txt       # Python dependencies
└── package.json           # npm scripts and dependencies
```

## License

MIT
