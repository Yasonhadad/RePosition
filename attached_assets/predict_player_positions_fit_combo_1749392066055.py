#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
predict_player_positions_fit_combo.py  ·  Positive‑Only, All‑Features
--------------------------------------------------------------------
• לכל עמדה משתמש **בכל** התכונות הכתובות בקובץ `feat_<POS>_full.csv`,
  בלי הגבלה ל‑TOP_N ואף בלי מינימום‑מקסימום – *אך ורק* בתכונות שה‑sign שלהן
  חיובי (כלומר ערך גבוה מיטיב עם ההסתברות להיות בעמדה).

• ציון משולב:
      combo = FIT_W · <POS>_fit  +  REL_W · <POS>_rel
  <POS>_fit  : 50 + 10·z  (נורמליזציה מוחלטת)
  <POS>_rel  : אחוזון פנימי לשחקן (0‑100)

• פלט מצומצם:
    player_id | natural_pos | OVR | <POS>_combo … | best_combo_pos | best_combo_score
"""
from pathlib import Path
import argparse, warnings
import pandas as pd, numpy as np

# ────────── הגדרות ──────────
BASE         = Path(__file__).resolve().parent
CSV_MASTER   = BASE.parent / "players_joined_clean.csv"
POSITIONS    = ["ST","LW","RW","CM","CDM","CAM","LB","RB","CB"]
DEFAULT_OUT  = BASE / "results_fit_combo.csv"
FIT_W, REL_W = 0.5, 0.5   # משקולות שילוב

# ────────── פונקציות עזר ──────────
extract_weight = lambda s: pd.to_numeric(
    s.astype(str).str.lower().str.extract(r"(\d+(?:\.\d+)?)\s*kg")[0],
    errors="coerce")
compute_age = lambda dob: 2025 - pd.to_datetime(dob, errors="coerce").dt.year
raw = lambda col: col.split("__",1)[1] if "__" in col else col
z2score = lambda z: float(np.clip(50 + 10*z, 0, 100))

# ────────── CLI ──────────
parser = argparse.ArgumentParser()
src = parser.add_mutually_exclusive_group(required=True)
src.add_argument("--player", type=int)
src.add_argument("--csv")
parser.add_argument("--out", default=str(DEFAULT_OUT))
args = parser.parse_args()

# ────────── קריאת MASTER ──────────
dm = pd.read_csv(CSV_MASTER)
if "Weight" in dm.columns:
    dm["Weight"] = extract_weight(dm["Weight"])
dm["age"] = compute_age(dm["date_of_birth"])

# ────────── קלט להרצה ──────────
if args.player:
    de = dm[dm.player_id == args.player].copy()
    if de.empty:
        raise ValueError("player_id not found")
else:
    de = pd.read_csv(args.csv)
    if "age" not in de.columns and "date_of_birth" in de.columns:
        de["age"] = compute_age(de["date_of_birth"])
    de = de.merge(dm.drop(columns=["age"]), on="player_id", how="left", suffixes=("","_m"))
    if "age" not in de.columns:
        dobcol = "date_of_birth" if "date_of_birth" in de else "date_of_birth_m"
        de["age"] = compute_age(de[dobcol])
    if "Weight" in de.columns:
        de["Weight"] = extract_weight(de["Weight"])

# ────────── מטא‑דאטה (Positive‑only) ──────────
feat_info = {}
for pos in POSITIONS:
    gtab = pd.read_csv(BASE / f"feat_{pos}_full.csv")          # כל הפיצ'רים
    corr = pd.read_csv(BASE / f"corr_{pos}_with_target.csv", index_col=0)[f"is_{pos}"]

    feats, gains = [], {}
    for _, row in gtab.iterrows():
        full = row.feature
        if full.startswith("cat__"):   # one‑hot → מדלגים
            continue
        base = raw(full)
        sign_val = np.sign(corr.get(full, corr.get(base, 1.0)))
        if sign_val <= 0:
            continue                   # שומרים רק sign חיובי
        if base in feats:
            continue                   # ראשון בלבד
        feats.append(base)
        gains[base] = row.gain

    if not feats:
        warnings.warn(f"{pos}: no positive‑sign features – fallback to zeros")

    stats = (dm[dm.sub_position == pos][feats]
             .agg(["mean","std"]).T.rename(columns={"mean":"mu","std":"sigma"}))
    feat_info[pos] = {"feats": feats, "gains": gains, "stats": stats}

# ────────── חישוב לשחקנים ──────────
rows = []
for _, pl in de.iterrows():
    rec = {"player_id": pl.player_id,
           "natural_pos": pl.get("sub_position") or pl.get("sub_position_m"),
           "OVR": pl.get("OVR") or pl.get("OVR_m")}
    best_combo_val, best_combo_pos = -np.inf, None

    fit_vals = {}
    for pos, meta in feat_info.items():
        num = den = 0.0
        for f in meta["feats"]:
            val = pl.get(f, np.nan)
            mu  = meta["stats"].at[f, "mu"]
            sd  = meta["stats"].at[f, "sigma"]
            z = 0.0 if pd.isna(val) or sd == 0 else (val - mu)/sd   # sign תמיד +1
            num += meta["gains"][f] * z
            den += meta["gains"][f]
        fit_vals[pos] = z2score(num/den) if den else 50.0

    # ---- REL פנימי ----
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

# ────────── פלט מצומצם ──────────
df = pd.DataFrame(rows)
keep_cols = ["player_id","natural_pos","OVR"] + [f"{p}_combo" for p in POSITIONS] + ["best_combo_pos","best_combo_score"]

df[keep_cols].to_csv(args.out, index=False, float_format="%.1f", encoding="utf-8")
print(f"✓ combo (positive‑only) results saved to {args.out}")
