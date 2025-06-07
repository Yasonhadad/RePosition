"""
Enhanced ML Position Processor with improved scoring methodology
==============================================================

This module enhances the XGBoost methodology with better score distribution,
normalization, and position-specific optimizations.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import warnings
from xgboost_ml_processor import XGBoostMLProcessor

warnings.filterwarnings('ignore')

class EnhancedMLProcessor(XGBoostMLProcessor):
    """
    Enhanced position compatibility processor with improved scoring
    """
    
    def __init__(self):
        super().__init__()
        
        # Enhanced scoring parameters
        self.position_difficulty_multipliers = {
            'ST': 1.15,    # Strikers should get higher scores for attacking stats
            'LW': 1.10,    # Wingers get bonus for pace/dribbling
            'RW': 1.10,
            'CAM': 1.08,   # Creative players get small bonus
            'CM': 1.05,    # Balanced position
            'CDM': 1.05,   # Balanced defensive
            'LB': 1.08,    # Fullbacks need multiple skills
            'RB': 1.08,
            'CB': 1.12,    # Defenders get bonus for defensive stats
            'GK': 1.25     # Special handling for goalkeepers
        }
        
        # Position specialization bonus - rewards natural position match
        self.natural_position_bonus = 8.0
        
        # Score scaling parameters for better distribution
        self.min_score = 25.0  # Minimum possible score
        self.max_score = 90.0  # Maximum possible score
        
        # Enhanced GK handling
        self.gk_positions = ['GK', 'Goalkeeper']
        self.gk_stats_mapping = {
            'def': 'reflexes_proxy',
            'pac': 'speed_proxy', 
            'phy': 'handling_proxy',
            'pas': 'distribution_proxy'
        }
    
    def _enhanced_z_to_score(self, z_value: float, position: str, player_natural_pos: str = None) -> float:
        """
        Enhanced Z-score to score conversion with better distribution
        """
        # Base score using your formula
        base_score = 50 + 10 * z_value
        
        # Apply position difficulty multiplier
        multiplier = self.position_difficulty_multipliers.get(position, 1.0)
        adjusted_score = base_score * multiplier
        
        # Natural position bonus
        if player_natural_pos and player_natural_pos == position:
            adjusted_score += self.natural_position_bonus
        
        # Apply sigmoid transformation for better distribution
        normalized_score = self._sigmoid_normalize(adjusted_score)
        
        # Scale to desired range
        final_score = self.min_score + (normalized_score * (self.max_score - self.min_score))
        
        return float(np.clip(final_score, self.min_score, self.max_score))
    
    def _sigmoid_normalize(self, score: float) -> float:
        """
        Apply sigmoid function to create better score distribution
        """
        # Shift to center around 50
        shifted = (score - 50) / 15
        # Apply sigmoid
        sigmoid_val = 1 / (1 + np.exp(-shifted))
        return sigmoid_val
    
    def _handle_goalkeeper_special(self, player_data: Dict) -> Dict:
        """
        Special handling for goalkeepers with GK-specific scoring
        """
        if not self._is_goalkeeper(player_data):
            return None
        
        # GK-specific scoring based on relevant stats
        gk_score = 0.0
        total_weight = 0.0
        
        # GK stat weights (different from outfield players)
        gk_weights = {
            'def': 0.35,    # Reflexes/shot stopping
            'phy': 0.25,    # Handling/strength
            'pac': 0.15,    # Speed/agility
            'pas': 0.15,    # Distribution
            'ovr': 0.10     # Overall ability
        }
        
        for stat, weight in gk_weights.items():
            if stat in player_data and player_data[stat] is not None:
                # Normalize GK stats to 0-100 scale
                normalized_value = min(100, max(0, player_data[stat]))
                gk_score += normalized_value * weight
                total_weight += weight
        
        if total_weight > 0:
            gk_score = gk_score / total_weight
        else:
            gk_score = 50.0
        
        # GK results - only GK position gets high score
        return {
            'st_fit': max(5, gk_score * 0.1),
            'lw_fit': max(5, gk_score * 0.1),
            'rw_fit': max(5, gk_score * 0.1),
            'cam_fit': max(5, gk_score * 0.15),
            'cm_fit': max(5, gk_score * 0.2),
            'cdm_fit': max(5, gk_score * 0.25),
            'lb_fit': max(5, gk_score * 0.15),
            'rb_fit': max(5, gk_score * 0.15),
            'cb_fit': max(5, gk_score * 0.3),
            'gk_fit': gk_score,  # Main GK score
            'natural_pos': player_data.get('sub_position') or 'GK',
            'best_pos': 'GK',
            'best_fit_score': gk_score,
            'best_fit_pct': gk_score,
            'ovr': player_data.get('ovr')
        }
    
    def _is_goalkeeper(self, player_data: Dict) -> bool:
        """Check if player is a goalkeeper"""
        pos = player_data.get('sub_position') or player_data.get('position', '')
        return pos in self.gk_positions or 'GK' in str(pos).upper()
    
    def _calculate_enhanced_position_fitness(self, player_data: Dict, position: str) -> float:
        """
        Enhanced position fitness calculation with improvements
        """
        if position not in self.position_metadata:
            return 50.0
        
        pos_data = self.position_metadata[position]
        features = pos_data['features']
        gains = pos_data['gains']
        correlations = pos_data['correlations']
        stats = pos_data['stats']
        
        total_weighted_z = 0.0
        total_weight = 0.0
        feature_count = 0
        
        for feature in features:
            value = self._get_player_feature_value(player_data, feature)
            
            if value is not None and not pd.isna(value):
                mu = stats['mu'].get(feature, 70.0)
                sigma = stats['sigma'].get(feature, 8.0)
                
                # Calculate Z-score
                z_score = (value - mu) / sigma if sigma > 0 else 0.0
                
                # Apply correlation sign
                correlation = correlations.get(feature, 1.0)
                signed_z = z_score * np.sign(correlation)
                
                # Enhanced weight calculation
                base_weight = gains.get(feature, 1.0 / len(features))
                
                # Boost weight for highly important features
                if base_weight > 0.1:  # Top features get extra weight
                    enhanced_weight = base_weight * 1.2
                else:
                    enhanced_weight = base_weight
                
                total_weighted_z += enhanced_weight * signed_z
                total_weight += enhanced_weight
                feature_count += 1
        
        # Penalty for missing data
        completeness_ratio = feature_count / len(features)
        completeness_penalty = (1 - completeness_ratio) * 5.0
        
        # Calculate final fitness score
        if total_weight > 0:
            avg_z = total_weighted_z / total_weight
            fitness = self._enhanced_z_to_score(
                avg_z - completeness_penalty, 
                position, 
                player_data.get('sub_position')
            )
        else:
            fitness = 40.0  # Lower default for missing data
        
        return round(fitness, 2)
    
    def _get_player_feature_value(self, player_data: Dict, feature: str) -> Optional[float]:
        """
        Enhanced feature value extraction with better mapping
        """
        # Direct stat mapping
        if feature in player_data:
            return player_data[feature]
        
        # Enhanced feature mapping
        feature_mapping = {
            # Pace related
            'acceleration': 'pac',
            'sprint_speed': 'pac',
            
            # Shooting related  
            'positioning': 'sho',
            'finishing': 'sho',
            'shot_power': 'sho',
            'volleys': 'sho',
            'penalties': 'sho',
            'long_shots': 'sho',
            
            # Passing related
            'vision': 'pas',
            'crossing': 'pas', 
            'free_kick_accuracy': 'pas',
            'short_passing': 'pas',
            'long_passing': 'pas',
            'curve': 'pas',
            
            # Dribbling related
            'dribbling': 'dri',
            'agility': 'dri',
            'balance': 'dri',
            'reactions': 'dri',
            'ball_control': 'dri',
            'composure': 'dri',
            
            # Defending related
            'interceptions': 'def',
            'heading_accuracy': 'def',
            'def_awareness': 'def',
            'standing_tackle': 'def',
            'sliding_tackle': 'def',
            
            # Physical related
            'jumping': 'phy',
            'stamina': 'phy',
            'strength': 'phy',
            'aggression': 'phy'
        }
        
        mapped_stat = feature_mapping.get(feature)
        if mapped_stat and mapped_stat in player_data:
            base_value = player_data[mapped_stat]
            if base_value is not None:
                # Add small random variation to simulate sub-stats
                variation = np.random.normal(0, 3)  # ±3 points variation
                return max(0, min(100, base_value + variation))
        
        return None
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Enhanced position compatibility prediction
        """
        # Special handling for goalkeepers
        if self._is_goalkeeper(player_data):
            return self._handle_goalkeeper_special(player_data)
        
        results = {}
        best_score = 0
        best_position = "CM"
        
        # Calculate fitness for each position
        for position in self.positions:
            fitness = self._calculate_enhanced_position_fitness(player_data, position)
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


# Test the enhanced processor
if __name__ == "__main__":
    processor = EnhancedMLProcessor()
    
    # Test with different player types
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
        },
        {
            'player_id': 3,
            'pac': 50, 'sho': 15, 'pas': 60, 'dri': 40, 'def': 90, 'phy': 75,
            'ovr': 80, 'sub_position': 'GK'
        }
    ]
    
    print("Enhanced ML Processor Test Results:")
    for player in test_players:
        result = processor.predict_position_compatibility(player)
        print(f"\nPlayer {player['player_id']} ({player['sub_position']}):")
        print(f"  Best: {result['best_pos']} ({result['best_fit_score']:.1f}%)")
        positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB']
        for pos in positions:
            score = result.get(f"{pos.lower()}_fit", 0)
            print(f"  {pos}: {score:.1f}%")