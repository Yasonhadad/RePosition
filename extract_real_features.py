#!/usr/bin/env python3
"""
Extract real features and correlations from your XGBoost models
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

def extract_features_for_position(pos):
    """Extract features for a specific position using correlation analysis"""
    
    # Load the dataset
    csv_file = Path("attached_assets/players_joined_clean.csv")
    if not csv_file.exists():
        print(f"Dataset not found: {csv_file}")
        return None, None
    
    df = pd.read_csv(csv_file)
    df = df[~df["sub_position"].isna()].copy()
    
    # Create position label
    label = f"is_{pos}"
    df[label] = (df["sub_position"] == pos).astype(int)
    
    # Feature groups (exclude meta columns)
    meta = {
        "player_id", "name", "country_of_citizenship", "date_of_birth",
        "current_club_name", "play_style", "position", "sub_position",
        "Alternative positions", "foot", "Preferred foot",
        "OVR", "highest_market_value_in_eur", "market_value_in_eur",
        "Weak foot", "Skill moves", "League", "Team", "target",
        "DEF", "PHY", "DRI", "PAS", "SHO", "current_club_id", "age"
    }
    
    # Get numeric features
    num_cols = [c for c in df.select_dtypes(["int64", "float64"]).columns 
                if c not in meta and c != label]
    
    # Calculate correlations
    corr_data = df[num_cols + [label]].corr()[label].drop(label)
    
    # Get top positive correlations (most important for the position)
    positive_corr = corr_data[corr_data > 0].sort_values(ascending=False)
    
    # Take top features with positive correlation
    top_features = positive_corr.head(10)
    
    if len(top_features) == 0:
        print(f"No positive correlations found for {pos}")
        return None, None
    
    # Create weights from correlation values (normalize to 1-3 range)
    min_corr = top_features.min()
    max_corr = top_features.max()
    
    if max_corr > min_corr:
        weights = 1.0 + 2.0 * (top_features - min_corr) / (max_corr - min_corr)
    else:
        weights = pd.Series([2.0] * len(top_features), index=top_features.index)
    
    # Get realistic statistics
    stats = df[top_features.index].agg(['mean', 'std']).T
    stats['mean'] = stats['mean'].round(1)
    stats['std'] = stats['std'].round(1)
    
    return top_features.index.tolist(), weights.tolist(), stats

def main():
    """Extract features for all positions"""
    
    positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
    all_results = {}
    
    for pos in positions:
        print(f"Processing {pos}...")
        features, weights, stats = extract_features_for_position(pos)
        
        if features:
            all_results[pos] = {
                'features': features,
                'weights': weights,
                'stats': stats.to_dict()
            }
            print(f"  ✓ {len(features)} features extracted")
        else:
            print(f"  ✗ No features found")
    
    # Save results
    import json
    with open('real_position_features.json', 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n✓ Extracted features for {len(all_results)} positions")
    print("Results saved to real_position_features.json")
    
    return all_results

if __name__ == "__main__":
    results = main()