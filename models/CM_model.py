"""
Train an XGBoost one-vs-rest model for a SINGLE football position
using the FULL feature-set, ישירות מהדאטאבייס.

Outputs per run:
    • xgb_<POS>_full.joblib          – trained model
    • feat_<POS>_full.csv            – top-N feature importance
    • corr_<POS>_with_target.csv     – full correlation vs. label
    • top_corr_<POS>.csv             – Top-10 |r| with label
"""

from pathlib import Path
import joblib
import pandas as pd
import numpy as np
import psycopg2
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier

# ========= choose the position =========
POS = "CM"            #  ←  change to LW, RW, CM, CDM, CAM, LB, RB, CB
# =======================================

BASE      = Path(__file__).resolve().parent
TOP_N_IMP = 35
N_SPLITS  = 5
SEED      = 42

# ====== DB connection details ======
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "reposition_db"
DB_USER = "reposition_user"
DB_PASS = "1234"

# ===== load & clean data from DB =====
conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
    user=DB_USER, password=DB_PASS
)
query = "SELECT * FROM players"
df = pd.read_sql(query, conn)
conn.close()

# סינון שחקנים עם sub_position חסר
df = df[~df["sub_position"].isna()].copy()

# גיל (age) – כבר קיים בעמודה, אבל אם רוצים לחשב מחדש:
# df["age"] = 2025 - pd.to_datetime(df["date_of_birth"], errors="coerce").dt.year

# ===== feature groups =====
meta = {
    "id","player_id","name","country_of_citizenship","date_of_birth",
    "current_club_name","position","sub_position","foot",
    "ovr","market_value_in_eur","club_id","created_at",
    "highest_market_value_in_eur","league","team","image_url","weak_foot",
    "skill_moves","ovr","sho","pas","dri","def","phy","age",
    "created_at","preferred_foot"
}

num_all  = [c for c in df.select_dtypes(["int64","float64"]).columns if c not in meta]
cat_cols = []  # אפשר להוסיף כאן עמודות קטגוריות אם יש

height_col = ["height_in_cm"] if "height_in_cm" in num_all else []
other_num  = [c for c in num_all if c not in height_col]

pre = ColumnTransformer([
    ("height", Pipeline([("imp", SimpleImputer(strategy="median")),
                         ("sc" , StandardScaler())]), height_col),
    ("num",    Pipeline([("imp", SimpleImputer(strategy="median"))]), other_num),
    ("cat",    OneHotEncoder(handle_unknown="ignore"), cat_cols)
])

# ===== label & correlation =====
label = f"is_{POS}"
df[label] = (df["sub_position"] == POS).astype(int)

corr_lbl = df[num_all + [label]].corr()
corr_lbl.to_csv(BASE / f"corr_{POS}_with_target.csv")

top_corr = corr_lbl[label].drop(label).abs().sort_values(ascending=False).head(10)
pd.DataFrame({"feature": top_corr.index,
              "r": corr_lbl[label][top_corr.index]})\
  .to_csv(BASE / f"top_corr_{POS}.csv", index=False)

# ===== model training =====
X = df[height_col + other_num + cat_cols]
y = df[label]
scale = (y == 0).sum() / max(1, (y == 1).sum())

pipe = Pipeline([
    ("pre", pre),
    ("clf", XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.08,
        subsample=0.9, colsample_bytree=0.9,
        objective="binary:logistic", eval_metric="logloss",
        scale_pos_weight=scale, n_jobs=-1, random_state=SEED))
])

cv   = GroupKFold(n_splits=N_SPLITS)
aucs = []

for i, (tr, te) in enumerate(cv.split(X, y, df["player_id"]), 1):
    pipe.fit(X.iloc[tr], y.iloc[tr])
    prob = pipe.predict_proba(X.iloc[te])[:, 1]
    aucs.append(roc_auc_score(y.iloc[te], prob))
    print(f"Fold {i}: train={len(tr):4d}  test={len(te):4d}  AUC={aucs[-1]:.3f}")

print("Mean AUC:", round(np.mean(aucs), 3))

# ===== final fit & exports =====
pipe.fit(X, y)
joblib.dump(pipe, BASE / f"xgb_{POS}_full.joblib")

names = pipe.named_steps["pre"].get_feature_names_out(height_col + other_num + cat_cols)
gains = pipe.named_steps["clf"].feature_importances_
top   = np.argsort(gains)[::-1][:TOP_N_IMP]

pd.DataFrame({"feature": names[top], "gain": gains[top]})\
  .to_csv(BASE / f"feat_{POS}_full.csv", index=False)

print(f"OK - Saved model & importance for {POS}")