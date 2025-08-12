#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Player Position Compatibility Calculator
=======================================

Calculates position compatibility scores for all players using ML models.
- Reads all players from database (players table)
- Uses all features from feat_<POS>_full.csv for each position
- Combined score: combo = FIT_W * <POS>_fit + REL_W * <POS>_rel
- Output: player_id | natural_pos | OVR | <POS>_combo | best_combo_pos | best_combo_score
"""

from pathlib import Path
import argparse, warnings
import runpy
import pandas as pd, numpy as np
import psycopg2
import datetime
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

# ────────── Configuration ──────────
BASE         = Path(__file__).resolve().parent
POSITIONS    = ["ST","LW","RW","CM","CDM","CAM","LB","RB","CB"]
DEFAULT_OUT  = Path(__file__).resolve().parent.parent / "attached_assets" / "result.csv"
FIT_W, REL_W = 0.5, 0.5   # Combination weights

# ────────── Helper Functions ──────────
z2score = lambda z: float(np.clip(50 + 10*z, 0, 100))

# ────────── CLI ──────────
parser = argparse.ArgumentParser()
parser.add_argument("--out", default=str(DEFAULT_OUT))
args = parser.parse_args()

# ────────── Refresh/Train Models First ──────────
print("Refreshing position models via pos_models.py ...")
runpy.run_path(str(BASE / "pos_models.py"), run_name="__main__")

# ────────── Database Connection ──────────
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "reposition_db"
DB_USER = "reposition_user"
DB_PASS = "1234"

db_url = URL.create(
    "postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
)
engine = create_engine(db_url)
with engine.connect() as con:
    dm = pd.read_sql("SELECT * FROM players", con)

de = dm.copy()  # All players

# ────────── Feature Metadata ──────────
feat_info = {}
for pos in POSITIONS:
    gtab = pd.read_csv(BASE / f"feat_{pos}_full.csv")          # All features
    corr = pd.read_csv(BASE / f"corr_{pos}_with_target.csv", index_col=0)[f"is_{pos}"]

    feats, gains, signs = [], {}, {}
    for _, row in gtab.iterrows():
        feat_name = row.feature
        sign_val = np.sign(corr.get(feat_name, 1.0))
        feats.append(feat_name)
        gains[feat_name] = row.gain
        signs[feat_name] = sign_val

    if not feats:
        warnings.warn(f"{pos}: no features - fallback to zeros")

    stats = (dm[dm.sub_position == pos][feats]
             .agg(["mean","std"]).T.rename(columns={"mean":"mu","std":"sigma"}))
    feat_info[pos] = {"feats": feats, "gains": gains, "signs": signs, "stats": stats}

# ────────── Player Calculations ──────────
rows = []
for _, pl in de.iterrows():
    rec = {"player_id": pl.player_id,
           "natural_pos": pl.get("sub_position"),
           "OVR": pl.get("ovr") or pl.get("OVR")}
    best_combo_val, best_combo_pos = -np.inf, None

    fit_vals = {}
    for pos, meta in feat_info.items():
        num = den = 0.0
        for f in meta["feats"]:
            val = pl.get(f, np.nan)
            mu  = meta["stats"].at[f, "mu"]
            sd  = meta["stats"].at[f, "sigma"]
            sign = meta["signs"][f]
            z = 0.0 if pd.isna(val) or sd == 0 else (val - mu)/sd
            z = z * sign  # Consider correlation sign
            num += meta["gains"][f] * z
            den += meta["gains"][f]
        fit_vals[pos] = z2score(num/den) if den else 50.0

    # ---- Internal REL ----
    fit_array = np.array([fit_vals[p] for p in POSITIONS])
    f_min, f_max = fit_array.min(), fit_array.max()
    rel_array = 100*(fit_array - f_min)/(f_max - f_min) if f_max>f_min else np.full_like(fit_array, 50.0)

    # ---- COMBO ----
    for pos, rel in zip(POSITIONS, rel_array):
        combo = FIT_W*fit_vals[pos] + REL_W*rel
        rec[f"{pos}_combo"] = round(combo,1)
        if combo > best_combo_val:
            best_combo_val, best_combo_pos = combo, pos

    rec["best_combo_pos"]   = best_combo_pos
    rec["best_combo_score"] = round(best_combo_val,1)
    rows.append(rec)

# ────────── Reduced Output ──────────
df = pd.DataFrame(rows)
keep_cols = ["player_id","natural_pos","OVR"] + [f"{p}_combo" for p in POSITIONS] + ["best_combo_pos","best_combo_score"]

df[keep_cols].to_csv(args.out, index=False, float_format="%.1f", encoding="utf-8")
print(f"OK - combo (positive-only) results saved to {args.out}")

# --- Column mapping to position_compatibility ---
compat_cols = [
    "player_id", "natural_pos", "OVR", "ST_combo", "LW_combo", "RW_combo", "CM_combo", "CDM_combo", "CAM_combo",
    "LB_combo", "RB_combo", "CB_combo", "best_combo_pos", "best_combo_score"
]
compat_df = df[compat_cols].copy()
compat_df = compat_df.rename(columns={
    "ST_combo": "st_fit",
    "LW_combo": "lw_fit",
    "RW_combo": "rw_fit",
    "CM_combo": "cm_fit",
    "CDM_combo": "cdm_fit",
    "CAM_combo": "cam_fit",
    "LB_combo": "lb_fit",
    "RB_combo": "rb_fit",
    "CB_combo": "cb_fit",
    "best_combo_pos": "best_pos",
    "best_combo_score": "best_fit_score",
    "OVR": "ovr"
})
compat_df["best_fit_pct"] = compat_df["best_fit_score"]
compat_df["created_at"] = datetime.datetime.now().isoformat()

# --- Load results to position_compatibility table in database ---
conn2 = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
    user=DB_USER, password=DB_PASS
)
cur = conn2.cursor()
cur.execute("TRUNCATE TABLE position_compatibility;")
columns = list(compat_df.columns)
columns_str = ', '.join(columns)
placeholders = ', '.join(['%s'] * len(columns))
for _, row in compat_df.iterrows():
    cur.execute(
        f"INSERT INTO position_compatibility ({columns_str}) VALUES ({placeholders})",
        tuple(row)
    )
conn2.commit()
cur.close()
conn2.close()
print(f"OK - combo results also loaded to DB table 'position_compatibility'")