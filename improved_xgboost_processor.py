"""
Improved XGBoost ML Position Processor
====================================

This maintains your original XGBoost methodology but adds score normalization
and better distribution for more realistic results.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import warnings
from xgboost_ml_processor import XGBoostMLProcessor

warnings.filterwarnings('ignore')

class ImprovedXGBoostProcessor(XGBoostMLProcessor):
    """
    Improved version of your XGBoost processor with better score distribution
    """
    
    def __init__(self):
        super().__init__()
        
        # Improved scoring parameters
        self.score_floor = 15.0  # Minimum score
        self.score_ceiling = 85.0  # Maximum score
        self.natural_position_bonus = 5.0  # Bonus for playing in natural position
        
        # Position difficulty factors (subtle adjustments)
        self.position_factors = {
            'ST': 1.05,   # Slight bonus for specialist positions
            'LW': 1.03,
            'RW': 1.03,
            'CAM': 1.02,
            'CM': 1.0,    # Baseline
            'CDM': 1.02,
            'LB': 1.03,
            'RB': 1.03,
            'CB': 1.05
        }
    
    def _improved_z_to_score(self, z_value: float, position: str, natural_position: str = None) -> float:
        """
        Improved Z-score conversion with better distribution
        """
        # Base score using your original formula
        base_score = 50 + 10 * z_value
        
        # Apply position factor
        factor = self.position_factors.get(position, 1.0)
        adjusted_score = base_score * factor
        
        # Natural position bonus
        if natural_position and natural_position == position:
            adjusted_score += self.natural_position_bonus
        
        # Smooth the distribution with a gentle sigmoid
        centered = (adjusted_score - 50) / 20  # Center around 50, scale down
        smoothed = 50 + 20 * np.tanh(centered)  # Apply tanh for smooth curve
        
        # Apply floor and ceiling
        final_score = np.clip(smoothed, self.score_floor, self.score_ceiling)
        
        return float(final_score)
    
    def _calculate_improved_position_fitness(self, player_data: Dict, position: str) -> float:
        """
        Calculate position fitness with improved scoring
        """
        if position not in self.position_metadata:
            return 40.0
        
        pos_data = self.position_metadata[position]
        features = pos_data['features']
        gains = pos_data['gains']
        correlations = pos_data['correlations']
        stats = pos_data['stats']
        
        total_weighted_z = 0.0
        total_weight = 0.0
        
        for feature in features:
            # Get player value for this feature
            value = self._get_feature_value(player_data, feature)
            
            if value is not None and not pd.isna(value):
                # Get position-specific stats
                mu = stats['mu'].get(feature, 70.0)
                sigma = stats['sigma'].get(feature, 8.0)
                
                # Calculate Z-score
                z_score = (value - mu) / sigma if sigma > 0 else 0.0
                
                # Apply correlation sign (your methodology)
                correlation = correlations.get(feature, 1.0)
                signed_z = z_score * np.sign(correlation)
                
                # Weight by XGBoost gain (your methodology)
                weight = gains.get(feature, 1.0 / len(features))
                
                total_weighted_z += weight * signed_z
                total_weight += weight
        
        # Calculate final fitness score
        if total_weight > 0:
            avg_z = total_weighted_z / total_weight
            fitness = self._improved_z_to_score(
                avg_z, 
                position, 
                player_data.get('sub_position')
            )
        else:
            fitness = 40.0
        
        return round(fitness, 2)
    
    def _get_feature_value(self, player_data: Dict, feature: str) -> Optional[float]:
        """
        Get feature value with improved mapping
        """
        # Direct stat mapping
        if feature in ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'ovr']:
            return player_data.get(feature)
        
        # Feature mapping to main stats
        if feature in ['acceleration', 'sprint_speed']:
            return player_data.get('pac')
        elif feature in ['positioning', 'finishing', 'shot_power', 'volleys', 'penalties']:
            return player_data.get('sho')
        elif feature in ['vision', 'crossing', 'free_kick_accuracy', 'short_passing', 'long_passing', 'curve']:
            return player_data.get('pas')
        elif feature in ['dribbling', 'agility', 'balance', 'reactions', 'ball_control', 'composure']:
            return player_data.get('dri')
        elif feature in ['interceptions', 'heading_accuracy', 'def_awareness', 'standing_tackle', 'sliding_tackle']:
            return player_data.get('def')
        elif feature in ['jumping', 'stamina', 'strength', 'aggression']:
            return player_data.get('phy')
        
        return None
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Predict position compatibility with improved scoring
        """
        results = {}
        best_score = 0
        best_position = "CM"
        
        for position in self.positions:
            fitness = self._calculate_improved_position_fitness(player_data, position)
            results[f"{position.lower()}_fit"] = fitness
            
            if fitness > best_score:
                best_score = fitness
                best_position = position
        
        # Add metadata
        results.update({
            'natural_pos': player_data.get('sub_position') or player_data.get('position'),
            'best_pos': best_position,
            'best_fit_score': best_score,
            'best_fit_pct': best_score,
            'ovr': player_data.get('ovr')
        })
        
        return results


# Test the improved processor
if __name__ == "__main__":
    processor = ImprovedXGBoostProcessor()
    
    # Test with sample players
    test_players = [
        {
            'player_id': 1,
            'pac': 85, 'sho': 78, 'pas': 72, 'dri': 80, 'def': 35, 'phy': 75,
            'ovr': 82, 'sub_position': 'LW'
        },
        {
            'player_id': 2,
            'pac': 45, 'sho': 25, 'pas': 55, 'dri': 30, 'def': 85, 'phy': 80,
            'ovr': 78, 'sub_position': 'CB'
        }
    ]
    
    print("Improved XGBoost Processor Test:")
    for player in test_players:
        result = processor.predict_position_compatibility(player)
        print(f"\nPlayer {player['player_id']} ({player['sub_position']}):")
        print(f"Best: {result['best_pos']} ({result['best_fit_score']:.1f}%)")
        positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB']
        for pos in positions:
            score = result.get(f"{pos.lower()}_fit", 0)
            print(f"  {pos}: {score:.1f}%")