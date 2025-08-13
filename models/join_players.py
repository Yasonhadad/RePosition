#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Player Data Merger: Transfermarkt + FC24
========================================

Merges PLAYERS_FINAL.csv (Transfermarkt) with FC_PLAYER_nations.csv (FC24),
skips goalkeepers, preserves image_url and current_club_id,
adds age column (2025-YOB),
Creates one output file: players_joined_clean.csv
"""

import pandas as pd
from rapidfuzz import process, fuzz

# ────────── Files ──────────
PLAYERS_CSV = "PLAYERS_FINAL1.csv"
FC_CSV      = "FC_PLAYER_nations.csv"
OUTPUT_CSV  = "players_joined.csv"
SCORE_TH    = 80         

# ────────── Fields to keep ──────────
KEEP_P = [
    "player_id", "name",            
    "country_of_citizenship", "date_of_birth",
    "sub_position", "position",
    "foot", "height_in_cm",
    "current_club_name", "current_club_id",
    "market_value_in_eur", "highest_market_value_in_eur",
    "image_url"
]

KEEP_FC = [
    "OVR","PAC","SHO","PAS","DRI","DEF","PHY",
    "Acceleration","Sprint Speed","Positioning","Finishing",
    "Shot Power","Long Shots","Volleys","Penalties","Vision","Crossing",
    "Free Kick Accuracy","Short Passing","Long Passing","Curve",
    "Dribbling","Agility","Balance","Reactions","Ball Control","Composure",
    "Interceptions","Heading Accuracy","Def Awareness","Standing Tackle",
    "Sliding Tackle","Jumping","Stamina","Strength","Aggression",
    "Weak foot","Skill moves","Preferred foot","Alternative positions",
    "play style","League","Team","Weight"
]

# ────────── Helper ──────────
P_COLS = {"name": "name", "nation": "country_of_citizenship", "position": "sub_position"}
F_COLS = {"name": "Name", "nation": "Nation", "position": "Position"}
THIS_YEAR = 2025

def clean(txt: str) -> str:
    if pd.isna(txt):
        return ""
    return (
        str(txt).lower().strip()
        .replace(".", "").replace("-", " ").replace(",", "")
        .replace("'", "").replace("\"", "").replace("(", "").replace(")", "")
        .replace("  ", " ")
    )

# ────────── Reading ──────────
players = pd.read_csv(PLAYERS_CSV)
fc = pd.read_csv(FC_CSV)
fc.drop(columns=[c for c in fc.columns if c.startswith("Unnamed")],
        errors="ignore", inplace=True)
# ───── Replace name with PLAYER_CODE (clean) ─────
players["player_code"] = (
    players["player_code"].astype(str)
           .str.replace("-", " ", regex=False)
           .str.strip()
)
players["name"] = players["player_code"]          # override

# ────────── Basic cleaning ──────────
for df, cols in ((players, P_COLS), (fc, F_COLS)):
    df["nation_cln"] = df[cols["nation"]].apply(clean)
    df["pos_cln"]    = df[cols["position"]].apply(clean)
    df["name_cln"]   = df[cols["name"]].apply(clean)

# ───── Remove goalkeepers ─────
players = players[players["pos_cln"] != "gk"].reset_index(drop=True)
fc      = fc[fc["pos_cln"]      != "gk"].reset_index(drop=True)

# ────────── Group FC by nationality+position ──────────
fc_groups={}
for idx,row in fc.iterrows():
    fc_groups.setdefault((row["nation_cln"],row["pos_cln"]), []).append((row["name_cln"],idx))

# ────────── Player matching ──────────
rows_p, rows_fc = [], []
for _, p in players.iterrows():
    key = (p["nation_cln"], p["pos_cln"])
    cand = fc_groups.get(key, [])
    if not cand: continue
    names = [n for n,_ in cand]
    best_name, score, _ = process.extractOne(p["name_cln"], names, scorer=fuzz.token_sort_ratio)
    if score >= SCORE_TH:
        rows_p.append(p)
        fc_idx = cand[names.index(best_name)][1]
        rows_fc.append(fc.loc[fc_idx])

# ────────── Result DataFrame ──────────
p_ok  = pd.DataFrame(rows_p)[KEEP_P].reset_index(drop=True)
fc_ok = pd.DataFrame(rows_fc)[KEEP_FC].reset_index(drop=True)

# Age
p_ok["age"] = THIS_YEAR - pd.to_datetime(p_ok["date_of_birth"], errors="coerce").dt.year

result = pd.concat([p_ok, fc_ok], axis=1)
result.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
print(f"✓ {OUTPUT_CSV} saved – {result.shape[0]} rows")
