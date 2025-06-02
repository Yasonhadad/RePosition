# predict_player_positions_fit_only.py
# ------------------------------------
# • מדרג התאמה (Fit) לכל עמדה על-סמך 15 הפיצ’רים החשובים, עם סימן ±.
# • מחזיר:  natural_pos  |  <POS>_fit  |  best_pos  |  best_fit_pct  |  OVR
#   - best_fit_pct = אחוזון (0-100) של ציון-ה-fit הטוב ביותר באוכלוסייה.

from pathlib import Path
import argparse, warnings
import pandas as pd, numpy as np

# ────────── הגדרות ──────────
BASE        = Path(__file__).resolve().parent
CSV_MASTER  = BASE.parent / "players_joined_clean.csv"
POSITIONS   = ["ST","LW","RW","CM","CDM","CAM","LB","RB","CB"]
TOP_N_FEATS = 15
DEFAULT_OUT = BASE / "results_fit_only.csv"
# ───────────────────────────

def extract_weight(s):
    return pd.to_numeric(
        s.astype(str).str.lower().str.extract(r"(\d+(?:\.\d+)?)\s*kg")[0],
        errors="coerce"
    )

def compute_age(dob): return 2025 - pd.to_datetime(dob, errors="coerce").dt.year
def raw(f):          return f.split("__",1)[1] if "__" in f else f
def z2score(z):      return float(np.clip(50 + 10*z, 0, 100))   # σ → 15 נק’

# ---------- CLI ----------
ap = argparse.ArgumentParser()
src = ap.add_mutually_exclusive_group(required=True)
src.add_argument("--player", type=int)
src.add_argument("--csv")
ap.add_argument("--out", default=str(DEFAULT_OUT))
args = ap.parse_args()

# ---------- master ----------
dm = pd.read_csv(CSV_MASTER)
if "Weight" in dm.columns:
    dm["Weight"] = extract_weight(dm["Weight"])
dm["age"] = compute_age(dm["date_of_birth"])

# ---------- eval ----------
if args.player:
    de = dm[dm.player_id == args.player].copy()
    if de.empty:
        raise ValueError("player_id not found")
else:
    de = pd.read_csv(args.csv)

    if "date_of_birth" in de.columns and "age" not in de.columns:
        de["age"] = compute_age(de["date_of_birth"])

    de = de.merge(dm.drop(columns=["age"]),
                  on="player_id", how="left", suffixes=("", "_m"))

    if "age" not in de.columns:
        dobcol = "date_of_birth" if "date_of_birth" in de else "date_of_birth_m"
        de["age"] = compute_age(de[dobcol])

    if "Weight" in de.columns:
        de["Weight"] = extract_weight(de["Weight"])

# ---------- meta per-position ----------
feat_info = {}
for pos in POSITIONS:
    gtab = pd.read_csv(BASE / f"feat_{pos}_full.csv")
    corr = pd.read_csv(BASE / f"corr_{pos}_with_target.csv", index_col=0)[f"is_{pos}"]

    feats, gains, signs = [], {}, {}
    for _, row in gtab.iterrows():
        f_full = row.feature
        if f_full.startswith("cat__"):
            continue
        base = raw(f_full)
        if base in feats:
            continue
        feats.append(base)
        gains[base]  = row.gain
        signs[base]  = np.sign(corr.get(f_full, corr.get(base, 1.0)))
        if len(feats) == TOP_N_FEATS:
            break

    if len(feats) < TOP_N_FEATS:
        warnings.warn(f"{pos}: only {len(feats)} feats collected")

    stats = dm[dm.sub_position == pos][feats]\
            .agg(["mean","std"]).T.rename(columns={"mean":"mu","std":"sigma"})
    feat_info[pos] = {"feats": feats, "gains": gains,
                      "stats": stats, "sign": signs}

# ---------- means-table ----------
pd.DataFrame({p: m["stats"]["mu"] for p,m in feat_info.items()})\
    .to_csv(BASE / "feature_means_by_position.csv", float_format="%.3f")
print("✓ saved feature_means_by_position.csv")

# ---------- evaluate ----------
rows = []
for _, pl in de.iterrows():
    rec = {"player_id": pl.player_id,
           "natural_pos": pl.get("sub_position") or pl.get("sub_position_m"),
           "OVR": pl.get("OVR") or pl.get("OVR_m")}
    best_val, best_pos = -np.inf, None

    for pos, meta in feat_info.items():
        num = den = 0.0
        for f in meta["feats"]:
            val = pl.get(f, np.nan)
            mu, sd = meta["stats"].at[f, "mu"], meta["stats"].at[f, "sigma"]
            z = 0.0 if pd.isna(val) or sd == 0 else (val - mu)/sd * meta["sign"][f]
            num += meta["gains"][f] * z
            den += meta["gains"][f]

        fit = z2score(num/den) if den else 50.0
        rec[f"{pos}_fit"] = round(fit, 1)
        if fit > best_val:
            best_val, best_pos = fit, pos

    rec["best_pos"] = best_pos
    rec["best_fit_score"] = round(best_val, 1)
    rows.append(rec)

df_res = pd.DataFrame(rows)

# ---------- אחוזון התאמה ----------
df_res["best_fit_pct"] = df_res["best_fit_score"].rank(pct=True) * 100
df_res.to_csv(args.out, index=False)
print(f"✓ Fit-only results saved to {args.out}")
