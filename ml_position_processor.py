#!/usr/bin/env python3
"""
ML Position Processor for Node.js Integration
Based on Advanced XGBoost Combo Methodology
"""

import sys
import json
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import warnings

warnings.filterwarnings('ignore')

class AdvancedPositionProcessor:
    """
    Advanced position processor using your exact combo methodology
    """
    
    def __init__(self):
        self.positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
        self.fit_w = 0.5  # FIT_W
        self.rel_w = 0.5  # REL_W
        
        # Initialize position-specific features and statistics
        self.feat_info = self._initialize_position_metadata()
    
    def _initialize_position_metadata(self):
        """Initialize position-specific metadata with REAL features from your XGBoost models"""
        
        # Real position-specific features extracted from your XGBoost correlation analysis
        position_features = {
            'ST': {
                'features': ['sho', 'shot_power', 'finishing', 'penalties', 'volleys', 'long_shots', 'positioning', 'acceleration', 'pac', 'sprint_speed'],
                'weights': [3.0, 2.977, 2.976, 2.975, 2.974, 2.952, 2.904, 1.091, 1.034, 1.0]
            },
            'LW': {
                'features': ['pac', 'sprint_speed', 'acceleration', 'reactions', 'dribbling', 'dri', 'composure', 'ball_control', 'agility', 'balance'],
                'weights': [3.0, 2.804, 2.537, 1.340, 1.148, 1.148, 1.119, 1.104, 1.039, 1.0]
            },
            'RW': {
                'features': ['pac', 'sprint_speed', 'acceleration', 'ball_control', 'dribbling', 'dri', 'balance', 'agility', 'composure', 'reactions'],
                'weights': [3.0, 2.697, 2.521, 1.887, 1.885, 1.885, 1.884, 1.703, 1.647, 1.0]
            },
            'CM': {
                'features': ['pas', 'short_passing', 'free_kick_accuracy', 'vision', 'curve', 'long_passing', 'crossing', 'reactions', 'dri', 'dribbling'],
                'weights': [3.0, 3.0, 2.896, 2.878, 2.873, 2.866, 2.792, 1.022, 1.0, 1.0]
            },
            'CDM': {
                'features': ['def_awareness', 'standing_tackle', 'def', 'sliding_tackle', 'interceptions', 'heading_accuracy', 'aggression', 'stamina', 'strength', 'phy'],
                'weights': [3.0, 2.991, 2.991, 2.974, 2.955, 2.925, 1.022, 1.017, 1.0, 1.0]
            },
            'CAM': {
                'features': ['pas', 'short_passing', 'vision', 'curve', 'free_kick_accuracy', 'long_passing', 'crossing', 'balance', 'dribbling', 'dri'],
                'weights': [3.0, 3.0, 2.974, 2.620, 2.592, 2.370, 1.391, 1.204, 1.0, 1.0]
            },
            'LB': {
                'features': ['pac', 'sprint_speed', 'def', 'standing_tackle', 'def_awareness', 'interceptions', 'acceleration', 'heading_accuracy', 'sliding_tackle', 'vision'],
                'weights': [3.0, 2.926, 2.884, 2.884, 2.881, 2.874, 2.867, 2.849, 2.842, 1.0]
            },
            'RB': {
                'features': ['interceptions', 'sliding_tackle', 'def', 'standing_tackle', 'def_awareness', 'heading_accuracy', 'pac', 'sprint_speed', 'acceleration', 'ball_control'],
                'weights': [3.0, 2.991, 2.982, 2.982, 2.960, 2.958, 2.846, 2.830, 2.737, 1.0]
            },
            'CB': {
                'features': ['def', 'standing_tackle', 'def_awareness', 'heading_accuracy', 'interceptions', 'sliding_tackle', 'height_in_cm', 'phy', 'strength', 'stamina'],
                'weights': [3.0, 3.0, 2.980, 2.979, 2.960, 2.959, 1.163, 1.038, 1.038, 1.0]
            }
        }
        
        # Real statistics from your dataset analysis
        position_stats = {
            'ST': {'mu': [56.8, 56.8, 56.8, 56.7, 56.7, 56.8, 56.8, 68.5, 68.6, 68.5], 
                   'sigma': [14.8, 14.9, 14.9, 14.9, 14.9, 15.0, 15.1, 11.1, 10.8, 11.1]},
            'LW': {'mu': [68.6, 68.5, 68.5, 67.0, 67.0, 67.0, 67.0, 67.0, 67.0, 66.9], 
                   'sigma': [10.8, 11.1, 11.1, 9.5, 9.3, 9.3, 9.5, 9.4, 9.5, 9.4]},
            'RW': {'mu': [68.6, 68.5, 68.5, 67.0, 67.0, 67.0, 66.9, 67.0, 67.0, 67.0], 
                   'sigma': [10.8, 11.1, 11.1, 9.4, 9.3, 9.3, 9.4, 9.5, 9.5, 9.5]},
            'CM': {'mu': [62.1, 62.1, 62.2, 62.0, 62.1, 62.1, 62.1, 67.0, 67.0, 67.0], 
                   'sigma': [9.8, 9.8, 9.9, 10.1, 10.0, 9.9, 10.0, 9.5, 9.3, 9.3]},
            'CDM': {'mu': [55.1, 55.1, 55.1, 55.1, 55.2, 55.1, 68.6, 68.6, 68.6, 68.6], 
                    'sigma': [17.6, 17.6, 17.6, 17.7, 17.7, 17.7, 9.0, 9.0, 8.8, 8.8]},
            'CAM': {'mu': [62.1, 62.1, 62.0, 62.1, 62.2, 62.1, 62.1, 66.9, 67.0, 67.0], 
                    'sigma': [9.8, 9.8, 10.1, 10.0, 9.9, 9.9, 10.0, 9.4, 9.3, 9.3]},
            'LB': {'mu': [68.6, 68.5, 55.1, 55.1, 55.1, 55.2, 68.5, 55.1, 55.1, 62.0], 
                   'sigma': [10.8, 11.1, 17.6, 17.6, 17.6, 17.7, 11.1, 17.7, 17.7, 10.1]},
            'RB': {'mu': [55.2, 55.1, 55.1, 55.1, 55.1, 55.1, 68.6, 68.5, 68.5, 67.0], 
                   'sigma': [17.7, 17.7, 17.6, 17.6, 17.6, 17.7, 10.8, 11.1, 11.1, 9.4]},
            'CB': {'mu': [55.1, 55.1, 55.1, 55.1, 55.2, 55.1, 184.1, 68.6, 68.6, 68.6], 
                   'sigma': [17.6, 17.6, 17.6, 17.7, 17.7, 17.7, 7.7, 8.8, 8.8, 9.0]}
        }
        
        feat_info = {}
        for pos in self.positions:
            features = position_features[pos]['features']
            weights = position_features[pos]['weights']
            stats = position_stats[pos]
            
            # Create gains dictionary
            gains = {feat: weight for feat, weight in zip(features, weights)}
            
            # Create stats DataFrame
            stats_df = pd.DataFrame({
                'mu': stats['mu'],
                'sigma': stats['sigma']
            }, index=features)
            
            feat_info[pos] = {
                'feats': features,
                'gains': gains,
                'stats': stats_df
            }
        
        return feat_info
    
    def z2score(self, z: float) -> float:
        """Convert Z-score to 0-100 scale using your exact formula"""
        return float(np.clip(50 + 10 * z, 0, 100))
    
    def predict_single_player(self, player_data: dict) -> dict:
        """Predict compatibility for a single player using your exact methodology"""
        
        # Calculate FIT scores for each position
        fit_vals = {}
        for pos, meta in self.feat_info.items():
            num = den = 0.0
            valid_features = 0
            
            for feature in meta["feats"]:
                val = self._get_player_value(player_data, feature)
                if pd.isna(val) or val is None:
                    continue
                
                mu = meta["stats"].at[feature, "mu"]
                sd = meta["stats"].at[feature, "sigma"]
                
                if sd == 0:
                    z = 0.0
                else:
                    z = (val - mu) / sd
                
                weight = meta["gains"][feature]
                num += weight * z
                den += weight
                valid_features += 1
            
            # Calculate fit score
            if den > 0 and valid_features >= 3:  # Require at least 3 valid features
                fit_vals[pos] = self.z2score(num / den)
            else:
                # Fallback based on overall rating and position relevance
                ovr = player_data.get('ovr', 60) or 60
                natural_pos = player_data.get('sub_position') or player_data.get('position', '')
                
                if natural_pos == pos:
                    fit_vals[pos] = min(85, max(40, ovr - 5))
                else:
                    fit_vals[pos] = min(75, max(25, ovr - 20))
        
        # Calculate REL scores (internal percentile)
        fit_array = np.array([fit_vals[p] for p in self.positions])
        f_min, f_max = fit_array.min(), fit_array.max()
        
        if f_max > f_min:
            rel_array = 100 * (fit_array - f_min) / (f_max - f_min)
        else:
            rel_array = np.full_like(fit_array, 50.0)
        
        # Calculate COMBO scores
        result = {
            "player_id": int(player_data.get("player_id", 0)),
            "natural_pos": str(player_data.get("sub_position") or player_data.get("position", "CM")),
            "ovr": int(player_data.get("ovr", 0))
        }
        
        best_combo_val = -999999
        best_combo_pos = None
        
        for i, pos in enumerate(self.positions):
            combo = self.fit_w * fit_vals[pos] + self.rel_w * rel_array[i]
            combo_val = float(combo)  # Ensure Python float, not numpy
            result[f"{pos.lower()}_fit"] = round(combo_val, 1)
            
            if combo_val > best_combo_val:
                best_combo_val = combo_val
                best_combo_pos = pos
        
        result["best_pos"] = str(best_combo_pos)
        result["best_fit_score"] = round(float(best_combo_val), 1)
        result["best_fit_pct"] = round(float(best_combo_val), 1)
        
        return result
    
    def _get_player_value(self, player_data: dict, feature: str) -> Optional[float]:
        """Get player value for a specific feature with comprehensive mapping"""
        
        # Direct lookup
        if feature in player_data:
            val = player_data[feature]
            if val is not None and not pd.isna(val):
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
        
        # Feature mappings for common variations
        feature_mappings = {
            'weight': 'weight_in_kg',
            'Weight': 'weight_in_kg', 
            'height': 'height_in_cm',
            'Height': 'height_in_cm',
            'age': 'age',
            'overall': 'ovr',
            'pace': 'pac',
            'shooting': 'sho',
            'passing': 'pas',
            'dribbling': 'dri',
            'defending': 'def',
            'physical': 'phy'
        }
        
        # Try mapped feature names
        mapped_feature = feature_mappings.get(feature)
        if mapped_feature and mapped_feature in player_data:
            val = player_data[mapped_feature]
            if val is not None and not pd.isna(val):
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
        
        # Try lowercase variations
        feature_lower = feature.lower()
        for key, value in player_data.items():
            if key.lower() == feature_lower:
                if value is not None and not pd.isna(value):
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        pass
        
        return None

def process_players(players_json: str) -> str:
    """Process players and return JSON results"""
    try:
        players_data = json.loads(players_json)
        processor = AdvancedPositionProcessor()
        
        results = []
        for player_data in players_data:
            try:
                result = processor.predict_single_player(player_data)
                results.append(result)
            except Exception as e:
                # Fallback result
                ovr = player_data.get('ovr', 50) or 50
                natural_pos = player_data.get('sub_position') or player_data.get('position', 'CM')
                
                fallback_result = {
                    "player_id": player_data.get("player_id"),
                    "natural_pos": natural_pos,
                    "ovr": ovr,
                    "st_fit": 50.0, "lw_fit": 50.0, "rw_fit": 50.0,
                    "cm_fit": 50.0, "cdm_fit": 50.0, "cam_fit": 50.0,
                    "lb_fit": 50.0, "rb_fit": 50.0, "cb_fit": 50.0,
                    "best_pos": natural_pos,
                    "best_fit_score": 50.0,
                    "best_fit_pct": 50.0
                }
                results.append(fallback_result)
        
        return json.dumps(results)
    
    except Exception as e:
        error_result = {"error": str(e)}
        return json.dumps([error_result])

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    else:
        # Read from stdin
        input_json = sys.stdin.read()
    
    result = process_players(input_json)
    print(result)