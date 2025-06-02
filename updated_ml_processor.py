"""
Updated ML Position Processor using your methodology
==================================================

This module integrates your position prediction algorithm to calculate
position compatibility scores based on your trained models approach.
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Optional
import warnings
import os

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

class UpdatedMLProcessor:
    """
    Position compatibility processor using your methodology
    """
    
    def __init__(self):
        """Initialize the processor"""
        self.positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
        self.top_n_features = 15
        
        # Your feature importance and correlation data (simplified version)
        # In a full implementation, these would be loaded from your model files
        self.position_metadata = self._initialize_position_metadata()
    
    def _initialize_position_metadata(self) -> Dict:
        """
        Initialize position-specific metadata based on your methodology
        This is a simplified version of what would be loaded from your model files
        """
        return {
            'ST': {
                'important_features': ['finishing', 'positioning', 'shot_power', 'pac', 'strength', 
                                     'volleys', 'acceleration', 'jumping', 'aggression', 'composure',
                                     'reactions', 'sprint_speed', 'ball_control', 'heading_accuracy', 'penalties'],
                'feature_weights': {'finishing': 0.25, 'positioning': 0.20, 'pac': 0.15, 'shot_power': 0.12, 'strength': 0.10},
                'correlations': {'finishing': 0.8, 'positioning': 0.7, 'shot_power': 0.6, 'pac': 0.5, 'strength': 0.4}
            },
            'LW': {
                'important_features': ['pac', 'dribbling', 'crossing', 'agility', 'acceleration', 
                                     'sprint_speed', 'ball_control', 'curve', 'reactions', 'balance',
                                     'vision', 'short_passing', 'composure', 'finishing', 'stamina'],
                'feature_weights': {'pac': 0.20, 'dribbling': 0.18, 'crossing': 0.15, 'agility': 0.12, 'acceleration': 0.10},
                'correlations': {'pac': 0.7, 'dribbling': 0.8, 'crossing': 0.6, 'agility': 0.7, 'acceleration': 0.6}
            },
            'RW': {
                'important_features': ['pac', 'dribbling', 'crossing', 'agility', 'acceleration', 
                                     'sprint_speed', 'ball_control', 'curve', 'reactions', 'balance',
                                     'vision', 'short_passing', 'composure', 'finishing', 'stamina'],
                'feature_weights': {'pac': 0.20, 'dribbling': 0.18, 'crossing': 0.15, 'agility': 0.12, 'acceleration': 0.10},
                'correlations': {'pac': 0.7, 'dribbling': 0.8, 'crossing': 0.6, 'agility': 0.7, 'acceleration': 0.6}
            },
            'CAM': {
                'important_features': ['vision', 'short_passing', 'long_passing', 'ball_control', 'dribbling',
                                     'composure', 'reactions', 'finishing', 'long_shots', 'curve',
                                     'free_kick_accuracy', 'agility', 'balance', 'positioning', 'pac'],
                'feature_weights': {'vision': 0.20, 'short_passing': 0.18, 'ball_control': 0.15, 'dribbling': 0.12, 'composure': 0.10},
                'correlations': {'vision': 0.8, 'short_passing': 0.7, 'ball_control': 0.7, 'dribbling': 0.6, 'composure': 0.5}
            },
            'CM': {
                'important_features': ['short_passing', 'long_passing', 'vision', 'stamina', 'ball_control',
                                     'composure', 'reactions', 'interceptions', 'pac', 'dribbling',
                                     'agility', 'balance', 'def_awareness', 'standing_tackle', 'strength'],
                'feature_weights': {'short_passing': 0.22, 'long_passing': 0.18, 'vision': 0.15, 'stamina': 0.12, 'ball_control': 0.10},
                'correlations': {'short_passing': 0.8, 'long_passing': 0.7, 'vision': 0.7, 'stamina': 0.5, 'ball_control': 0.6}
            },
            'CDM': {
                'important_features': ['interceptions', 'standing_tackle', 'def_awareness', 'stamina', 'strength',
                                     'aggression', 'short_passing', 'long_passing', 'composure', 'reactions',
                                     'heading_accuracy', 'jumping', 'sliding_tackle', 'ball_control', 'vision'],
                'feature_weights': {'interceptions': 0.20, 'standing_tackle': 0.18, 'def_awareness': 0.15, 'stamina': 0.12, 'strength': 0.10},
                'correlations': {'interceptions': 0.8, 'standing_tackle': 0.7, 'def_awareness': 0.7, 'stamina': 0.5, 'strength': 0.6}
            },
            'LB': {
                'important_features': ['pac', 'stamina', 'crossing', 'def_awareness', 'standing_tackle',
                                     'interceptions', 'acceleration', 'sprint_speed', 'short_passing', 'agility',
                                     'reactions', 'strength', 'aggression', 'jumping', 'balance'],
                'feature_weights': {'pac': 0.18, 'stamina': 0.16, 'crossing': 0.14, 'def_awareness': 0.12, 'standing_tackle': 0.10},
                'correlations': {'pac': 0.6, 'stamina': 0.7, 'crossing': 0.5, 'def_awareness': 0.6, 'standing_tackle': 0.6}
            },
            'RB': {
                'important_features': ['pac', 'stamina', 'crossing', 'def_awareness', 'standing_tackle',
                                     'interceptions', 'acceleration', 'sprint_speed', 'short_passing', 'agility',
                                     'reactions', 'strength', 'aggression', 'jumping', 'balance'],
                'feature_weights': {'pac': 0.18, 'stamina': 0.16, 'crossing': 0.14, 'def_awareness': 0.12, 'standing_tackle': 0.10},
                'correlations': {'pac': 0.6, 'stamina': 0.7, 'crossing': 0.5, 'def_awareness': 0.6, 'standing_tackle': 0.6}
            },
            'CB': {
                'important_features': ['heading_accuracy', 'def_awareness', 'standing_tackle', 'strength', 'jumping',
                                     'aggression', 'interceptions', 'composure', 'reactions', 'sliding_tackle',
                                     'short_passing', 'long_passing', 'ball_control', 'stamina', 'pac'],
                'feature_weights': {'heading_accuracy': 0.20, 'def_awareness': 0.18, 'standing_tackle': 0.15, 'strength': 0.12, 'jumping': 0.10},
                'correlations': {'heading_accuracy': 0.8, 'def_awareness': 0.7, 'standing_tackle': 0.7, 'strength': 0.6, 'jumping': 0.6}
            }
        }
    
    def _compute_age(self, date_of_birth: str) -> Optional[int]:
        """Compute age from date of birth"""
        try:
            return 2025 - pd.to_datetime(date_of_birth, errors="coerce").year
        except:
            return None
    
    def _z_to_score(self, z_value: float) -> float:
        """Convert Z-score to 0-100 scale (similar to your methodology)"""
        return float(np.clip(50 + 10 * z_value, 0, 100))
    
    def _calculate_position_fitness(self, player_data: Dict, position: str) -> float:
        """
        Calculate fitness score for a specific position using your methodology
        
        Args:
            player_data: Dictionary containing player attributes
            position: Position to calculate fitness for
            
        Returns:
            Fitness score (0-100)
        """
        if position not in self.position_metadata:
            return 50.0
        
        meta = self.position_metadata[position]
        features = meta['important_features']
        weights = meta['feature_weights']
        correlations = meta['correlations']
        
        # Calculate weighted Z-score
        total_weighted_z = 0.0
        total_weight = 0.0
        
        # Get position-specific normalization stats (simplified)
        position_means = self._get_position_means(position)
        position_stds = self._get_position_stds(position)
        
        for feature in features:
            if feature in player_data and player_data[feature] is not None:
                value = float(player_data[feature])
                
                # Get mean and std for this feature for this position
                mean_val = position_means.get(feature, 65.0)  # Default mean
                std_val = position_stds.get(feature, 10.0)    # Default std
                
                # Calculate Z-score
                z_score = (value - mean_val) / std_val if std_val > 0 else 0.0
                
                # Apply correlation sign
                correlation = correlations.get(feature, 1.0)
                signed_z = z_score * np.sign(correlation)
                
                # Weight the Z-score
                weight = weights.get(feature, 1.0 / len(features))  # Equal weight if not specified
                
                total_weighted_z += weight * signed_z
                total_weight += weight
        
        # Calculate final fitness score
        if total_weight > 0:
            avg_z = total_weighted_z / total_weight
            fitness = self._z_to_score(avg_z)
        else:
            fitness = 50.0
        
        return round(fitness, 2)
    
    def _get_position_means(self, position: str) -> Dict[str, float]:
        """
        Get mean values for each attribute for a specific position
        These would normally be calculated from training data
        """
        # Simplified position-specific means
        base_means = {
            'pac': 70, 'sho': 65, 'pas': 70, 'dri': 70, 'def': 60, 'phy': 70,
            'acceleration': 70, 'sprint_speed': 70, 'positioning': 65, 'finishing': 60,
            'shot_power': 65, 'long_shots': 60, 'volleys': 55, 'penalties': 60,
            'vision': 65, 'crossing': 60, 'free_kick_accuracy': 55, 'short_passing': 70,
            'long_passing': 65, 'curve': 60, 'dribbling': 70, 'agility': 70,
            'balance': 70, 'reactions': 70, 'ball_control': 70, 'composure': 65,
            'interceptions': 60, 'heading_accuracy': 60, 'def_awareness': 60,
            'standing_tackle': 60, 'sliding_tackle': 55, 'jumping': 65,
            'stamina': 70, 'strength': 70, 'aggression': 60
        }
        
        # Adjust means based on position
        position_adjustments = {
            'ST': {'pac': 75, 'sho': 80, 'finishing': 80, 'positioning': 75, 'strength': 75},
            'LW': {'pac': 80, 'dri': 80, 'crossing': 75, 'agility': 80, 'dribbling': 80},
            'RW': {'pac': 80, 'dri': 80, 'crossing': 75, 'agility': 80, 'dribbling': 80},
            'CAM': {'pas': 80, 'vision': 80, 'short_passing': 80, 'ball_control': 80, 'dribbling': 75},
            'CM': {'pas': 75, 'stamina': 80, 'short_passing': 75, 'long_passing': 75, 'vision': 70},
            'CDM': {'def': 75, 'interceptions': 80, 'standing_tackle': 75, 'def_awareness': 75, 'stamina': 75},
            'LB': {'pac': 75, 'def': 70, 'crossing': 65, 'stamina': 80, 'def_awareness': 70},
            'RB': {'pac': 75, 'def': 70, 'crossing': 65, 'stamina': 80, 'def_awareness': 70},
            'CB': {'def': 80, 'heading_accuracy': 80, 'strength': 80, 'def_awareness': 80, 'jumping': 75}
        }
        
        means = base_means.copy()
        if position in position_adjustments:
            means.update(position_adjustments[position])
        
        return means
    
    def _get_position_stds(self, position: str) -> Dict[str, float]:
        """
        Get standard deviations for each attribute
        These would normally be calculated from training data
        """
        # Standard deviations are roughly similar across positions
        return {attr: 8.0 for attr in self._get_position_means(position).keys()}
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Predict position compatibility for a single player using your methodology
        
        Args:
            player_data: Dictionary containing player's attributes
            
        Returns:
            Dictionary with compatibility scores for all positions
        """
        results = {}
        
        # Add age if date_of_birth is present
        if 'date_of_birth' in player_data and 'age' not in player_data:
            player_data['age'] = self._compute_age(player_data['date_of_birth'])
        
        best_score = 0
        best_position = "CM"
        
        # Calculate fitness for each position
        for position in self.positions:
            try:
                fitness = self._calculate_position_fitness(player_data, position)
                results[f"{position.lower()}_fit"] = fitness
                
                if fitness > best_score:
                    best_score = fitness
                    best_position = position
                    
            except Exception as e:
                print(f"Error calculating fitness for {position}: {e}")
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
            if i % 100 == 0:
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
    # Create processor instance
    processor = UpdatedMLProcessor()
    
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
    result = processor.predict_position_compatibility(sample_player)
    
    print("Updated ML Position Compatibility Results:")
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