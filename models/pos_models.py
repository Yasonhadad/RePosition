"""
Train an XGBoost one-vs-rest model for MULTIPLE football positions
directly from the database.
For each POS: save correlations and top feature importances.
"""

from pathlib import Path
import pandas as pd, numpy as np
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier

# ========= positions to train =========
POSITIONS = ["ST", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB"]

# ========= general config =========
BASE = Path(__file__).resolve().parent
TOP_N_IMP = 35
SEED = 42
MIN_POS = 20  # minimal #positives required to train a model

# ====== DB connection details ======
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "reposition_db"
DB_USER = "reposition_user"
DB_PASS = "1234"

# ===== load players once =====
db_url = URL.create(
    "postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
)
engine = create_engine(db_url)
df = pd.read_sql("SELECT * FROM players", engine)

# keep only rows with sub_position
df = df[~df["sub_position"].isna()].copy()

# ===== choose numeric features =====
meta = {
    "id", "player_id", "name", "country_of_citizenship", "date_of_birth",
    "current_club_name", "position", "sub_position", "foot", "club_id",
    "created_at", "image_url", "weak_foot", "skill_moves", "preferred_foot",
    "ovr", "sho", "pas", "dri", "def", "phy", "age",
    "market_value_in_eur", "highest_market_value_in_eur", "league", "team",
}
num_all = [c for c in df.select_dtypes(include=["int64", "float64"]).columns if c not in meta]

print(f"Total rows: {len(df):,} | Numeric features used: {len(num_all)}")

summary = []

for POS in POSITIONS:
    print("\n" + "=" * 70)
    print(f">>> Training position: {POS}")

    # ----- label & correlations -----
    label = f"is_{POS}"
    df[label] = (df["sub_position"] == POS).astype(int)

    pos_count = int(df[label].sum())
    neg_count = int((1 - df[label]).sum())
    print(f"Class counts -> pos={pos_count} | neg={neg_count}")

    if pos_count < MIN_POS:
        print(f"Skipping {POS}: not enough positive samples (< {MIN_POS}).")
        summary.append({"pos": POS, "status": "skipped (too few positives)", "auc": None, "n_pos": pos_count})
        continue

    # correlation matrix (numeric features + label)
    corr_lbl = df[num_all + [label]].corr()
    corr_lbl.to_csv(BASE / f"corr_{POS}_with_target.csv")

    # ----- split: 80% train / 20% test -----
    X = df[num_all]
    y = df[label].values
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.20, random_state=SEED, stratify=y
    )
    print(f"Split sizes -> train: {len(y_tr)}  | test: {len(y_te)}")

    # ----- handle class imbalance -----
    scale = (y_tr == 0).sum() / max(1, (y_tr == 1).sum())

    clf = XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.08,
        subsample=0.9, colsample_bytree=0.9,
        objective="binary:logistic", eval_metric="auc",
        scale_pos_weight=scale, n_jobs=-1, random_state=SEED
    )

    # ----- train on 80% and evaluate on 20% -----
    clf.fit(X_tr, y_tr)
    prob_te = clf.predict_proba(X_te)[:, 1]
    auc = roc_auc_score(y_te, prob_te)
    print(f"Holdout AUC (20% test): {auc:.3f}")

    # ----- feature importances -----
    gains = clf.feature_importances_
    top = np.argsort(gains)[::-1][:TOP_N_IMP]
    pd.DataFrame({"feature": np.array(num_all)[top], "gain": gains[top]}) \
        .to_csv(BASE / f"feat_{POS}_full.csv", index=False)

    print(f"OK - Saved importance for {POS} | Holdout AUC={auc:.3f}")
    summary.append({"pos": POS, "status": "ok", "auc": float(auc), "n_pos": pos_count})

# ===== print final summary =====
print("\n" + "#" * 70)
print("Summary:")
for row in summary:
    print(f"{row['pos']:>4}: {row['status']:<28} | AUC={row['auc']} | positives={row['n_pos']}")
