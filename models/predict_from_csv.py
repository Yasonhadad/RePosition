#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Predict position compatibility for an external CSV of players (not in DB).

Input CSV requirements:
  - Must include column 'player_id'
  - Should include feature columns used by the models (see feat_*_full.csv)

The script computes z-scored feature aggregates using statistics derived
from the existing players table in the database (same approach as
predict_player_positions.py), then returns combo scores per position and
the best position/score for each provided player.
"""

from __future__ import annotations

from pathlib import Path
import argparse
import warnings
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
import datetime


# ────────── Configuration ──────────
BASE = Path(__file__).resolve().parent
POSITIONS = ["ST","LW","RW","CM","CDM","CAM","LB","RB","CB"]

FIT_W, REL_W = 0.5, 0.5  # Combination weights


def z2score(z: float) -> float:
    return float(np.clip(50 + 10*z, 0, 100))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to input CSV with players and features")
    parser.add_argument("--out", required=True, help="Path to output CSV")
    args = parser.parse_args()

    input_csv = Path(args.input)
    out_csv = Path(args.out)

    # ────────── Database Connection for reference stats ──────────
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

    # Load external input
    if not input_csv.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")
    de = pd.read_csv(input_csv)
    if "player_id" not in de.columns:
        raise ValueError("Input CSV must include a 'player_id' column")

    # ────────── Feature Metadata ──────────
    feat_info: dict[str, dict] = {}
    for pos in POSITIONS:
        gtab = pd.read_csv(BASE / f"feat_{pos}_full.csv")  # features + gains
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

        stats = (
            dm[dm.sub_position == pos][feats]
            .agg(["mean","std"]).T.rename(columns={"mean":"mu","std":"sigma"})
        )
        feat_info[pos] = {"feats": feats, "gains": gains, "signs": signs, "stats": stats}

    # ────────── Player Calculations ──────────
    rows = []
    for _, pl in de.iterrows():
        rec = {
            "player_id": pl.get("player_id"),
            "name": pl.get("name") if "name" in de.columns else None,
            "natural_pos": pl.get("sub_position") if "sub_position" in de.columns else None,
            "OVR": pl.get("ovr") if "ovr" in de.columns else pl.get("OVR"),
        }
        best_combo_val, best_combo_pos = -np.inf, None

        fit_vals: dict[str, float] = {}
        for pos, meta in feat_info.items():
            num = 0.0
            den = 0.0
            for f in meta["feats"]:
                val = pl.get(f, np.nan)
                mu = meta["stats"].at[f, "mu"] if f in meta["stats"].index else 0.0
                sd = meta["stats"].at[f, "sigma"] if f in meta["stats"].index else 0.0
                sign = meta["signs"].get(f, 1.0)
                z = 0.0 if pd.isna(val) or sd == 0 else (val - mu) / sd
                z = z * sign
                gain = meta["gains"].get(f, 0.0)
                num += gain * z
                den += gain
            fit_vals[pos] = z2score(num / den) if den else 50.0

        fit_array = np.array([fit_vals[p] for p in POSITIONS])
        f_min, f_max = fit_array.min(), fit_array.max()
        rel_array = 100 * (fit_array - f_min) / (f_max - f_min) if f_max > f_min else np.full_like(fit_array, 50.0)

        for pos, rel in zip(POSITIONS, rel_array):
            combo = FIT_W * fit_vals[pos] + REL_W * rel
            rec[f"{pos}_combo"] = round(float(combo), 1)
            if combo > best_combo_val:
                best_combo_val, best_combo_pos = combo, pos

        rec["best_combo_pos"] = best_combo_pos
        rec["best_combo_score"] = round(float(best_combo_val), 1) if np.isfinite(best_combo_val) else None
        rows.append(rec)

    df = pd.DataFrame(rows)

    compat_cols = [
        "player_id", "name", "natural_pos", "OVR",
        "ST_combo", "LW_combo", "RW_combo", "CM_combo", "CDM_combo", "CAM_combo",
        "LB_combo", "RB_combo", "CB_combo", "best_combo_pos", "best_combo_score",
    ]
    df = df[compat_cols]
    df = df.rename(columns={
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
    })
    df["best_fit_pct"] = df["best_fit_score"]
    df["created_at"] = datetime.datetime.now().isoformat()

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_csv, index=False, float_format="%.1f", encoding="utf-8")
    print(f"OK - custom results saved to {out_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


