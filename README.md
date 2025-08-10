### Player Position Analytics – Local Setup Guide

This repo contains a full‑stack app that analyzes football player position compatibility using Python (XGBoost) models and a TS/Node web app (Express + Vite + Drizzle ORM).

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 14+ (local)

### Database defaults
The server is preconfigured to use a local PostgreSQL instance (see `server/db.ts`):

```
DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
```

You can either create this DB/user or set your own `DATABASE_URL` via `.env`.

Create the DB/user (psql example):
```
CREATE USER reposition_user WITH PASSWORD '1234';
CREATE DATABASE reposition_db OWNER reposition_user;
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```

Optional environment file (recommended for production):
```
.env
  DATABASE_URL=postgresql://reposition_user:1234@localhost:5432/reposition_db
  SESSION_SECRET=replace-with-a-long-random-secret
```

### Install dependencies
JavaScript/TypeScript:
```
npm install
```

Python (ML models):
```
pip install -r requirements.txt
```

### Load data and generate compatibility
The app expects player/club data in Postgres and precomputed compatibility scores.

1) Load base data (players, clubs, competitions):
```
python complete_local_loader.py
```

2) (Optional) Train/refresh per‑position models and export feature metadata:
```
cd models
python run_all_models.py
cd ..
```

3) Compute position compatibility for all players and load results to DB:
```
python models/predict_player_positions.py
```

This writes a CSV to `attached_assets/result.csv` and upserts to the `position_compatibility` table.

### Run the app
- Development (Vite middleware, HMR):
```
npm run dev
```

- Production build and serve (Express on port 5000):
```
npm run build
npm run start
```

Open: `http://localhost:5000`

### Project structure (high level)
- `server/` – Express server
  - `index.ts` – entrypoint, mounts routes and Vite (dev) or static (prod)
  - `routes.ts` – REST API (players, clubs, teams, stats)
  - `auth.ts` – local email/password auth with sessions
  - `db.ts` – Postgres connection + Drizzle ORM init
  - `vite.ts` – Vite integration and static serving
  - `storage.ts` – all DB queries via Drizzle (CRUD, search, analytics)
- `client/` – React (Vite + Tailwind + shadcn/ui)
  - `index.html` – SPA host document
  - `src/pages/*` – app pages
  - `src/components/*` – UI components
  - `src/lib/*` – API/query utils
- `models/` – Python ML assets (XGBoost models, features, correlations)
  - `run_all_models.py` – (optional) train/export per‑position models
  - `predict_player_positions.py` – compute compatibility and load to DB
- `attached_assets/` – static assets (logo) and output CSVs

### Useful API endpoints
- `GET /api/players?name=...&position=...` – search players
- `GET /api/players/:id` – single player + compatibility (if exists)
- `GET /api/players/:id/compatibility` – compatibility only
- `GET /api/teams/:clubName/analysis` – team analysis
- `GET /api/stats` – global stats

### Common issues
- Port 5000 busy: stop other processes or change port in `server/index.ts`.
- DB connection fails: verify `DATABASE_URL` or create the default DB/user above.
- Empty compatibility: re‑run the Python step: `python models/predict_player_positions.py`.
- Windows start error: we use `cross-env` in `package.json` so `npm run start` works on Windows.

### License
MIT

