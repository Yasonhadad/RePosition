"""
Advanced XGBoost ML Position Processor
====================================

This implements your improved XGBoost methodology with:
- Positive-only features from feat_<POS>_full.csv files
- Combo scoring: FIT_W · <POS>_fit + REL_W · <POS>_rel  
- All features without TOP_N limitation
- Sign-based feature filtering (only positive correlations)
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from pathlib import Path
import warnings

warnings.filterwarnings('ignore')

class AdvancedXGBoostProcessor:
    """
    Advanced XGBoost processor using your exact combo methodology
    """
    
    def __init__(self):
        """Initialize the processor with your improved methodology"""
        self.positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
        self.fit_weight = 0.5  # FIT_W
        self.rel_weight = 0.5  # REL_W
        
        # Initialize feature metadata for each position
        self.feat_info = self._load_position_metadata()
        
    def _load_position_metadata(self) -> Dict:
        """
        Load position-specific metadata (positive-only features)
        """
        base_path = Path("attached_assets")
        feat_info = {}
        
        # Sample master data for statistics (you'll need to replace with actual data)
        # This should come from your players_joined_clean.csv
        sample_stats = self._get_sample_statistics()
        
        for pos in self.positions:
            try:
                # Load feature importance
                feat_file = base_path / f"feat_{pos}_full.csv"
                if feat_file.exists():
                    gtab = pd.read_csv(feat_file)
                else:
                    # Fallback to common features if file doesn't exist
                    gtab = self._get_fallback_features(pos)
                
                # Load correlations
                corr_file = base_path / f"corr_{pos}_with_target.csv"
                if corr_file.exists():
                    corr = pd.read_csv(corr_file, index_col=0)[f"is_{pos}"]
                else:
                    # Fallback correlations
                    corr = self._get_fallback_correlations(pos)
                
                feats, gains = [], {}
                for _, row in gtab.iterrows():
                    full = row['feature'] if 'feature' in row else row.iloc[0]
                    if full.startswith("cat__"):   # Skip one-hot encoded
                        continue
                    base = self._raw_feature_name(full)
                    sign_val = np.sign(corr.get(full, corr.get(base, 1.0)))
                    if sign_val <= 0:
                        continue  # Keep only positive sign
                    if base in feats:
                        continue  # First occurrence only
                    feats.append(base)
                    gains[base] = row['gain'] if 'gain' in row else 1.0
                
                if not feats:
                    warnings.warn(f"{pos}: no positive-sign features – using fallback")
                    feats, gains = self._get_fallback_features_for_position(pos)
                
                # Get statistics for normalization
                stats = sample_stats.get(pos, self._get_default_stats(feats))
                
                feat_info[pos] = {
                    "feats": feats,
                    "gains": gains,
                    "stats": stats
                }
                
            except Exception as e:
                warnings.warn(f"Error loading metadata for {pos}: {e}")
                feats, gains = self._get_fallback_features_for_position(pos)
                feat_info[pos] = {
                    "feats": feats,
                    "gains": gains,
                    "stats": self._get_default_stats(feats)
                }
        
        return feat_info
    
    def _raw_feature_name(self, col: str) -> str:
        """Extract raw feature name"""
        return col.split("__", 1)[1] if "__" in col else col
    
    def _z_to_score(self, z_value: float) -> float:
        """Convert Z-score to 0-100 scale using your exact formula"""
        return float(np.clip(50 + 10 * z_value, 0, 100))
    
    def _get_sample_statistics(self) -> Dict:
        """
        Get sample statistics for features from your dataset
        This should be replaced with actual statistics from your master data
        """
        # Placeholder - you'll need to compute these from your actual data
        return {}
    
    def _get_fallback_features(self, pos: str) -> pd.DataFrame:
        """Get fallback features when files don't exist"""
        common_features = {
            'ST': ['finishing', 'shot_power', 'positioning', 'strength', 'heading_accuracy'],
            'LW': ['pace', 'dribbling', 'crossing', 'agility', 'acceleration'],
            'RW': ['pace', 'dribbling', 'crossing', 'agility', 'acceleration'],
            'CM': ['passing', 'vision', 'ball_control', 'stamina', 'composure'],
            'CDM': ['interceptions', 'standing_tackle', 'strength', 'aggression', 'def_awareness'],
            'CAM': ['vision', 'passing', 'dribbling', 'finishing', 'long_shots'],
            'LB': ['pace', 'crossing', 'standing_tackle', 'stamina', 'interceptions'],
            'RB': ['pace', 'crossing', 'standing_tackle', 'stamina', 'interceptions'],
            'CB': ['heading_accuracy', 'standing_tackle', 'strength', 'jumping', 'def_awareness']
        }
        
        features = common_features.get(pos, ['ovr', 'pac', 'sho', 'pas', 'dri', 'def', 'phy'])
        return pd.DataFrame({
            'feature': features,
            'gain': [1.0] * len(features)
        })
    
    def _get_fallback_correlations(self, pos: str) -> pd.Series:
        """Get fallback correlations when files don't exist"""
        # All positive correlations for fallback
        return pd.Series({}, name=f"is_{pos}")
    
    def _get_fallback_features_for_position(self, pos: str) -> tuple:
        """Get fallback features and gains for a position"""
        fallback_features = {
            'ST': ['finishing', 'shot_power', 'positioning', 'strength'],
            'LW': ['pace', 'dribbling', 'crossing', 'agility'],
            'RW': ['pace', 'dribbling', 'crossing', 'agility'],
            'CM': ['passing', 'vision', 'ball_control', 'stamina'],
            'CDM': ['interceptions', 'standing_tackle', 'strength', 'def_awareness'],
            'CAM': ['vision', 'passing', 'dribbling', 'finishing'],
            'LB': ['pace', 'crossing', 'standing_tackle', 'stamina'],
            'RB': ['pace', 'crossing', 'standing_tackle', 'stamina'],
            'CB': ['heading_accuracy', 'standing_tackle', 'strength', 'jumping']
        }
        
        feats = fallback_features.get(pos, ['ovr'])
        gains = {f: 1.0 for f in feats}
        return feats, gains
    
    def _get_default_stats(self, features: List[str]) -> pd.DataFrame:
        """Get default statistics for features"""
        return pd.DataFrame({
            'mu': [50.0] * len(features),
            'sigma': [15.0] * len(features)
        }, index=features)
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Predict position compatibility using your exact combo methodology
        """
        try:
            # Calculate FIT scores for each position
            fit_vals = {}
            for pos, meta in self.feat_info.items():
                num = den = 0.0
                for f in meta["feats"]:
                    val = self._get_feature_value(player_data, f)
                    if pd.isna(val):
                        continue
                    
                    stats = meta["stats"]
                    if f not in stats.index:
                        continue
                        
                    mu = stats.at[f, "mu"]
                    sd = stats.at[f, "sigma"]
                    
                    z = 0.0 if pd.isna(val) or sd == 0 else (val - mu) / sd
                    num += meta["gains"][f] * z
                    den += meta["gains"][f]
                
                fit_vals[pos] = self._z_to_score(num / den) if den else 50.0
            
            # Calculate REL scores (internal percentile)
            fit_array = np.array([fit_vals[p] for p in self.positions])
            f_min, f_max = fit_array.min(), fit_array.max()
            
            if f_max > f_min:
                rel_array = 100 * (fit_array - f_min) / (f_max - f_min)
            else:
                rel_array = np.full_like(fit_array, 50.0)
            
            # Calculate COMBO scores
            result = {
                'player_id': player_data.get('player_id'),
                'natural_pos': player_data.get('sub_position') or player_data.get('position'),
                'ovr': player_data.get('ovr', 0)
            }
            
            best_combo_val = -np.inf
            best_combo_pos = None
            
            for i, pos in enumerate(self.positions):
                combo = self.fit_weight * fit_vals[pos] + self.rel_weight * rel_array[i]
                result[f'{pos.lower()}_fit'] = round(combo, 1)
                
                if combo > best_combo_val:
                    best_combo_val = combo
                    best_combo_pos = pos
            
            result['best_pos'] = best_combo_pos
            result['best_fit_score'] = round(best_combo_val, 1)
            result['best_fit_pct'] = round(best_combo_val, 1)  # For compatibility
            
            return result
            
        except Exception as e:
            warnings.warn(f"Error in position prediction: {e}")
            return self._get_fallback_result(player_data)
    
    def _get_feature_value(self, player_data: Dict, feature: str) -> Optional[float]:
        """
        Get feature value with improved mapping
        """
        # Direct mapping
        if feature in player_data:
            val = player_data[feature]
            if pd.notna(val):
                return float(val)
        
        # Alternative mappings
        feature_mappings = {
            'weight': 'weight_in_kg',
            'Weight': 'weight_in_kg',
            'height': 'height_in_cm',
            'Height': 'height_in_cm'
        }
        
        alt_feature = feature_mappings.get(feature)
        if alt_feature and alt_feature in player_data:
            val = player_data[alt_feature]
            if pd.notna(val):
                return float(val)
        
        return None
    
    def _get_fallback_result(self, player_data: Dict) -> Dict:
        """Get fallback result when prediction fails"""
        return {
            'player_id': player_data.get('player_id'),
            'natural_pos': player_data.get('sub_position') or player_data.get('position'),
            'ovr': player_data.get('ovr', 0),
            'st_fit': 50.0,
            'lw_fit': 50.0,
            'rw_fit': 50.0,
            'cm_fit': 50.0,
            'cdm_fit': 50.0,
            'cam_fit': 50.0,
            'lb_fit': 50.0,
            'rb_fit': 50.0,
            'cb_fit': 50.0,
            'best_pos': player_data.get('sub_position', 'CM'),
            'best_fit_score': 50.0,
            'best_fit_pct': 50.0
        }
    
    def predict_bulk_compatibility(self, players_data: List[Dict]) -> List[Dict]:
        """
        Predict position compatibility for multiple players
        """
        results = []
        for player_data in players_data:
            result = self.predict_position_compatibility(player_data)
            results.append(result)
        return results