"""
ML Position Predictor using your trained XGBoost models
======================================================

This module integrates your XGBoost models to predict position compatibility
for football players based on their technical attributes.
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import warnings
import os

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

class MLPositionPredictor:
    """
    Position predictor using trained XGBoost models for each position
    """
    
    def __init__(self, models_dir: str = "attached_assets"):
        """
        Initialize the predictor with trained models
        
        Args:
            models_dir: Directory containing the trained model files
        """
        self.models_dir = Path(models_dir)
        self.positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
        self.models = {}
        self.feature_importances = {}
        self.correlations = {}
        
        # Load models and metadata
        self._load_models()
        self._load_feature_metadata()
    
    def _load_models(self):
        """Load all position-specific XGBoost models"""
        print("Loading XGBoost models...")
        
        for position in self.positions:
            model_file = self.models_dir / f"xgb_{position}_full.joblib"
            
            if model_file.exists():
                try:
                    self.models[position] = joblib.load(model_file)
                    print(f"✓ Loaded model for {position}")
                except Exception as e:
                    print(f"⚠ Failed to load model for {position}: {e}")
                    # Use fallback scoring for this position
                    self.models[position] = None
            else:
                print(f"⚠ Model file not found for {position}: {model_file}")
                self.models[position] = None
    
    def _load_feature_metadata(self):
        """Load feature importance and correlation data"""
        print("Loading feature metadata...")
        
        for position in self.positions:
            # Load feature importance
            feat_file = self.models_dir / f"feat_{position}_full.csv"
            if feat_file.exists():
                self.feature_importances[position] = pd.read_csv(feat_file)
            
            # Load correlations
            corr_file = self.models_dir / f"corr_{position}_with_target.csv"
            if corr_file.exists():
                corr_df = pd.read_csv(corr_file, index_col=0)
                self.correlations[position] = corr_df[f"is_{position}"]
    
    def _extract_weight(self, weight_str: str) -> Optional[float]:
        """Extract weight in kg from string like '63kg / 139lb'"""
        if pd.isna(weight_str):
            return None
        
        try:
            import re
            match = re.search(r"(\d+(?:\.\d+)?)\s*kg", str(weight_str).lower())
            return float(match.group(1)) if match else None
        except:
            return None
    
    def _compute_age(self, date_of_birth: str) -> Optional[int]:
        """Compute age from date of birth"""
        try:
            return 2025 - pd.to_datetime(date_of_birth, errors="coerce").dt.year
        except:
            return None
    
    def _prepare_player_data(self, player_data: Dict) -> pd.DataFrame:
        """
        Prepare player data for model prediction
        
        Args:
            player_data: Dictionary containing player attributes
            
        Returns:
            DataFrame ready for model input
        """
        # Create a DataFrame with the player data
        df = pd.DataFrame([player_data])
        
        # Process weight if present
        if 'Weight' in df.columns:
            df['Weight'] = df['Weight'].apply(self._extract_weight)
        
        # Compute age if date_of_birth is present
        if 'date_of_birth' in df.columns and 'age' not in df.columns:
            df['age'] = self._compute_age(df['date_of_birth'].iloc[0])
        
        return df
    
    def _get_model_features(self, position: str, player_df: pd.DataFrame) -> Tuple[List[str], List[str]]:
        """
        Get the features needed for a specific position model
        
        Returns:
            Tuple of (numerical_features, categorical_features)
        """
        # Define meta columns to exclude
        meta_cols = {
            "player_id", "name", "country_of_citizenship", "date_of_birth",
            "current_club_name", "play_style", "position", "sub_position",
            "Alternative positions", "play style", "foot", "Preferred foot",
            "OVR", "highest_market_value_in_eur", "market_value_in_eur",
            "Weak foot", "Skill moves", "League", "Team", "target",
            "DEF", "PHY", "DRI", "PAS", "SHO", "PAC"
        }
        
        # Get numerical columns
        num_cols = [c for c in player_df.select_dtypes(["int64", "float64"]).columns 
                   if c not in meta_cols]
        
        # Get categorical columns
        cat_cols = [c for c in ["Preferred foot", "foot"] if c in player_df.columns]
        
        # Separate height from other numerical features (as per your model structure)
        height_col = ["height_in_cm"] if "height_in_cm" in num_cols else []
        other_num = [c for c in num_cols if c not in height_col]
        
        return height_col + other_num + cat_cols, cat_cols
    
    def _fallback_scoring(self, position: str, player_data: Dict) -> float:
        """
        Fallback scoring method when model is not available
        Uses simplified weighted approach based on your correlation data
        """
        # Define position-specific weights (simplified version)
        weights = {
            'ST': {'pac': 0.25, 'sho': 0.30, 'finishing': 0.25, 'positioning': 0.20},
            'LW': {'pac': 0.30, 'dri': 0.25, 'crossing': 0.20, 'agility': 0.25},
            'RW': {'pac': 0.30, 'dri': 0.25, 'crossing': 0.20, 'agility': 0.25},
            'CAM': {'pas': 0.25, 'dri': 0.25, 'vision': 0.25, 'long_shots': 0.25},
            'CM': {'pas': 0.30, 'vision': 0.20, 'stamina': 0.15, 'short_passing': 0.35},
            'CDM': {'def': 0.25, 'interceptions': 0.25, 'standing_tackle': 0.25, 'stamina': 0.25},
            'LB': {'pac': 0.20, 'def': 0.25, 'crossing': 0.20, 'stamina': 0.35},
            'RB': {'pac': 0.20, 'def': 0.25, 'crossing': 0.20, 'stamina': 0.35},
            'CB': {'def': 0.35, 'heading_accuracy': 0.25, 'strength': 0.25, 'def_awareness': 0.15}
        }
        
        pos_weights = weights.get(position, {})
        if not pos_weights:
            return 50.0
        
        score = 0
        total_weight = 0
        
        for attr, weight in pos_weights.items():
            if attr in player_data and player_data[attr] is not None:
                score += player_data[attr] * weight
                total_weight += weight
        
        if total_weight > 0:
            return min(100, max(0, score / total_weight))
        return 50.0
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Predict position compatibility for a single player
        
        Args:
            player_data: Dictionary containing player's attributes
            
        Returns:
            Dictionary with compatibility scores for all positions
        """
        results = {}
        
        # Prepare data
        player_df = self._prepare_player_data(player_data)
        
        best_score = 0
        best_position = "CM"
        
        for position in self.positions:
            try:
                if self.models[position] is not None:
                    # Use trained XGBoost model
                    features, cat_features = self._get_model_features(position, player_df)
                    
                    # Prepare feature matrix
                    X = player_df[features].fillna(0)  # Handle missing values
                    
                    # Get prediction probability
                    try:
                        proba = self.models[position].predict_proba(X)[0, 1]
                        # Convert probability to 0-100 scale
                        score = min(100, max(0, proba * 100))
                    except Exception as e:
                        print(f"Prediction error for {position}: {e}")
                        score = self._fallback_scoring(position, player_data)
                else:
                    # Use fallback scoring
                    score = self._fallback_scoring(position, player_data)
                
                results[f"{position.lower()}_fit"] = round(score, 2)
                
                if score > best_score:
                    best_score = score
                    best_position = position
                    
            except Exception as e:
                print(f"Error processing {position}: {e}")
                results[f"{position.lower()}_fit"] = 50.0
        
        # Add best position info
        results.update({
            'best_pos': best_position,
            'best_fit_score': round(best_score, 2),
            'best_fit_pct': round(best_score, 2)
        })
        
        return results
    
    def predict_bulk_compatibility(self, players_data: List[Dict]) -> List[Dict]:
        """
        Predict position compatibility for multiple players
        
        Args:
            players_data: List of player data dictionaries
            
        Returns:
            List of compatibility results
        """
        results = []
        
        for i, player in enumerate(players_data):
            if i % 10 == 0:
                print(f"Processing player {i+1}/{len(players_data)}")
            
            compatibility = self.predict_position_compatibility(player)
            
            result = {
                'player_id': player.get('player_id'),
                'natural_pos': player.get('sub_position') or player.get('position'),
                'ovr': player.get('ovr'),
                **compatibility
            }
            
            results.append(result)
        
        return results

# Example usage and testing
if __name__ == "__main__":
    # Create predictor instance
    predictor = MLPositionPredictor()
    
    # Test with sample player data
    sample_player = {
        'player_id': 85295,
        'name': 'Iván Balliu',
        'position': 'Defender',
        'sub_position': 'RB',
        'ovr': 77,
        'pac': 81, 'sho': 51, 'pas': 70, 'dri': 74, 'def': 72, 'phy': 71,
        'acceleration': 78, 'sprint_speed': 83, 'positioning': 67,
        'finishing': 50, 'shot_power': 45, 'long_shots': 59,
        'volleys': 24, 'penalties': 69, 'vision': 64,
        'crossing': 77, 'free_kick_accuracy': 58, 'short_passing': 72,
        'long_passing': 68, 'curve': 63, 'dribbling': 72,
        'agility': 78, 'balance': 76, 'reactions': 71,
        'ball_control': 77, 'composure': 74, 'interceptions': 72,
        'heading_accuracy': 65, 'def_awareness': 73, 'standing_tackle': 75,
        'sliding_tackle': 70, 'jumping': 75, 'stamina': 84,
        'strength': 63, 'aggression': 73
    }
    
    # Get predictions
    result = predictor.predict_position_compatibility(sample_player)
    
    print("\nML Position Compatibility Results:")
    print(f"Player: {sample_player['name']} ({sample_player['sub_position']})")
    print(f"Overall Rating: {sample_player['ovr']}")
    print()
    print("Position Fitness Scores:")
    print(f"ST (Striker):           {result['st_fit']:.1f}%")
    print(f"LW (Left Winger):       {result['lw_fit']:.1f}%")
    print(f"RW (Right Winger):      {result['rw_fit']:.1f}%")
    print(f"CAM (Attacking Mid):    {result['cam_fit']:.1f}%")
    print(f"CM (Central Mid):       {result['cm_fit']:.1f}%")
    print(f"CDM (Defensive Mid):    {result['cdm_fit']:.1f}%")
    print(f"LB (Left Back):         {result['lb_fit']:.1f}%")
    print(f"RB (Right Back):        {result['rb_fit']:.1f}%")
    print(f"CB (Center Back):       {result['cb_fit']:.1f}%")
    print()
    print(f"Best Position: {result['best_pos']} ({result['best_fit_score']:.1f}%)")