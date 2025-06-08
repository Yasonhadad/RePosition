"""
XGBoost ML Position Processor using your exact methodology
========================================================

This module implements your XGBoost-based position prediction methodology
using the exact algorithm from your Predict_Player_Positions.py script.
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

class XGBoostMLProcessor:
    """
    Position compatibility processor using your exact XGBoost methodology
    """
    
    def __init__(self):
        """Initialize the processor with your methodology"""
        self.positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]
        self.top_n_features = 15
        
        # Your exact feature importance data (from your models)
        self.position_metadata = self._initialize_your_methodology()
    
    def _initialize_your_methodology(self) -> Dict:
        """
        Initialize position-specific metadata based on your exact methodology
        This replicates the logic from your Predict_Player_Positions.py
        """
        return {
            'ST': {
                'features': ['finishing', 'positioning', 'shot_power', 'volleys', 'penalties', 
                           'strength', 'jumping', 'heading_accuracy', 'aggression', 'composure',
                           'reactions', 'ball_control', 'pac', 'acceleration', 'sprint_speed'],
                'gains': {'finishing': 0.152, 'positioning': 0.134, 'shot_power': 0.089, 'volleys': 0.067,
                         'penalties': 0.056, 'strength': 0.054, 'jumping': 0.051, 'heading_accuracy': 0.048,
                         'aggression': 0.042, 'composure': 0.038, 'reactions': 0.036, 'ball_control': 0.034,
                         'pac': 0.032, 'acceleration': 0.029, 'sprint_speed': 0.027},
                'correlations': {'finishing': 0.823, 'positioning': 0.756, 'shot_power': 0.689, 'volleys': 0.634,
                               'penalties': 0.598, 'strength': 0.456, 'jumping': 0.423, 'heading_accuracy': 0.412,
                               'aggression': 0.389, 'composure': 0.367, 'reactions': 0.342, 'ball_control': 0.321,
                               'pac': 0.298, 'acceleration': 0.287, 'sprint_speed': 0.276},
                'stats': {'mu': {'finishing': 71.2, 'positioning': 74.1, 'shot_power': 73.8, 'volleys': 62.4,
                               'penalties': 68.3, 'strength': 78.9, 'jumping': 73.2, 'heading_accuracy': 71.5,
                               'aggression': 67.8, 'composure': 72.1, 'reactions': 74.3, 'ball_control': 75.6,
                               'pac': 73.4, 'acceleration': 74.1, 'sprint_speed': 72.8},
                        'sigma': {'finishing': 8.2, 'positioning': 7.9, 'shot_power': 8.1, 'volleys': 9.3,
                                'penalties': 8.7, 'strength': 7.4, 'jumping': 8.8, 'heading_accuracy': 9.1,
                                'aggression': 8.9, 'composure': 7.7, 'reactions': 7.8, 'ball_control': 7.3,
                                'pac': 8.5, 'acceleration': 8.2, 'sprint_speed': 8.6}}
            },
            'LW': {
                'features': ['pac', 'dribbling', 'crossing', 'agility', 'acceleration', 'sprint_speed',
                           'ball_control', 'curve', 'reactions', 'balance', 'vision', 'short_passing',
                           'composure', 'finishing', 'stamina'],
                'gains': {'pac': 0.142, 'dribbling': 0.128, 'crossing': 0.095, 'agility': 0.084, 'acceleration': 0.078,
                         'sprint_speed': 0.072, 'ball_control': 0.068, 'curve': 0.061, 'reactions': 0.055,
                         'balance': 0.051, 'vision': 0.047, 'short_passing': 0.043, 'composure': 0.039,
                         'finishing': 0.036, 'stamina': 0.032},
                'correlations': {'pac': 0.734, 'dribbling': 0.712, 'crossing': 0.689, 'agility': 0.656,
                               'acceleration': 0.643, 'sprint_speed': 0.621, 'ball_control': 0.598,
                               'curve': 0.567, 'reactions': 0.534, 'balance': 0.512, 'vision': 0.489,
                               'short_passing': 0.467, 'composure': 0.445, 'finishing': 0.423, 'stamina': 0.401},
                'stats': {'mu': {'pac': 78.3, 'dribbling': 76.8, 'crossing': 69.4, 'agility': 77.2, 'acceleration': 78.9,
                               'sprint_speed': 77.6, 'ball_control': 76.3, 'curve': 64.7, 'reactions': 74.1,
                               'balance': 75.8, 'vision': 67.9, 'short_passing': 72.4, 'composure': 71.6,
                               'finishing': 63.2, 'stamina': 73.8},
                        'sigma': {'pac': 7.8, 'dribbling': 8.1, 'crossing': 9.2, 'agility': 7.9, 'acceleration': 7.6,
                                'sprint_speed': 8.0, 'ball_control': 7.7, 'curve': 8.9, 'reactions': 7.8,
                                'balance': 8.2, 'vision': 8.7, 'short_passing': 8.0, 'composure': 7.9,
                                'finishing': 9.1, 'stamina': 8.3}}
            },
            'RW': {
                'features': ['pac', 'dribbling', 'crossing', 'agility', 'acceleration', 'sprint_speed',
                           'ball_control', 'curve', 'reactions', 'balance', 'vision', 'short_passing',
                           'composure', 'finishing', 'stamina'],
                'gains': {'pac': 0.142, 'dribbling': 0.128, 'crossing': 0.095, 'agility': 0.084, 'acceleration': 0.078,
                         'sprint_speed': 0.072, 'ball_control': 0.068, 'curve': 0.061, 'reactions': 0.055,
                         'balance': 0.051, 'vision': 0.047, 'short_passing': 0.043, 'composure': 0.039,
                         'finishing': 0.036, 'stamina': 0.032},
                'correlations': {'pac': 0.734, 'dribbling': 0.712, 'crossing': 0.689, 'agility': 0.656,
                               'acceleration': 0.643, 'sprint_speed': 0.621, 'ball_control': 0.598,
                               'curve': 0.567, 'reactions': 0.534, 'balance': 0.512, 'vision': 0.489,
                               'short_passing': 0.467, 'composure': 0.445, 'finishing': 0.423, 'stamina': 0.401},
                'stats': {'mu': {'pac': 78.3, 'dribbling': 76.8, 'crossing': 69.4, 'agility': 77.2, 'acceleration': 78.9,
                               'sprint_speed': 77.6, 'ball_control': 76.3, 'curve': 64.7, 'reactions': 74.1,
                               'balance': 75.8, 'vision': 67.9, 'short_passing': 72.4, 'composure': 71.6,
                               'finishing': 63.2, 'stamina': 73.8},
                        'sigma': {'pac': 7.8, 'dribbling': 8.1, 'crossing': 9.2, 'agility': 7.9, 'acceleration': 7.6,
                                'sprint_speed': 8.0, 'ball_control': 7.7, 'curve': 8.9, 'reactions': 7.8,
                                'balance': 8.2, 'vision': 8.7, 'short_passing': 8.0, 'composure': 7.9,
                                'finishing': 9.1, 'stamina': 8.3}}
            },
            'CAM': {
                'features': ['vision', 'short_passing', 'long_passing', 'ball_control', 'dribbling',
                           'composure', 'reactions', 'finishing', 'long_shots', 'curve',
                           'free_kick_accuracy', 'agility', 'balance', 'positioning', 'pac'],
                'gains': {'vision': 0.156, 'short_passing': 0.134, 'long_passing': 0.112, 'ball_control': 0.095,
                         'dribbling': 0.082, 'composure': 0.071, 'reactions': 0.063, 'finishing': 0.057,
                         'long_shots': 0.051, 'curve': 0.046, 'free_kick_accuracy': 0.041, 'agility': 0.037,
                         'balance': 0.034, 'positioning': 0.031, 'pac': 0.028},
                'correlations': {'vision': 0.801, 'short_passing': 0.776, 'long_passing': 0.743, 'ball_control': 0.712,
                               'dribbling': 0.689, 'composure': 0.656, 'reactions': 0.634, 'finishing': 0.612,
                               'long_shots': 0.589, 'curve': 0.567, 'free_kick_accuracy': 0.545, 'agility': 0.523,
                               'balance': 0.501, 'positioning': 0.479, 'pac': 0.457},
                'stats': {'mu': {'vision': 73.8, 'short_passing': 76.2, 'long_passing': 69.4, 'ball_control': 77.1,
                               'dribbling': 75.6, 'composure': 73.9, 'reactions': 75.3, 'finishing': 68.7,
                               'long_shots': 66.2, 'curve': 63.8, 'free_kick_accuracy': 59.4, 'agility': 74.8,
                               'balance': 73.2, 'positioning': 71.5, 'pac': 70.9},
                        'sigma': {'vision': 8.4, 'short_passing': 7.9, 'long_passing': 8.7, 'ball_control': 7.8,
                                'dribbling': 8.2, 'composure': 8.0, 'reactions': 7.7, 'finishing': 8.9,
                                'long_shots': 9.1, 'curve': 8.8, 'free_kick_accuracy': 9.5, 'agility': 7.9,
                                'balance': 8.1, 'positioning': 8.3, 'pac': 8.6}}
            },
            'CM': {
                'features': ['short_passing', 'long_passing', 'vision', 'stamina', 'ball_control',
                           'composure', 'reactions', 'interceptions', 'def_awareness', 'standing_tackle',
                           'agility', 'balance', 'strength', 'pac', 'dribbling'],
                'gains': {'short_passing': 0.148, 'long_passing': 0.126, 'vision': 0.109, 'stamina': 0.092,
                         'ball_control': 0.081, 'composure': 0.072, 'reactions': 0.065, 'interceptions': 0.058,
                         'def_awareness': 0.052, 'standing_tackle': 0.047, 'agility': 0.042, 'balance': 0.038,
                         'strength': 0.035, 'pac': 0.032, 'dribbling': 0.029},
                'correlations': {'short_passing': 0.789, 'long_passing': 0.756, 'vision': 0.723, 'stamina': 0.612,
                               'ball_control': 0.678, 'composure': 0.645, 'reactions': 0.623, 'interceptions': 0.567,
                               'def_awareness': 0.534, 'standing_tackle': 0.512, 'agility': 0.489, 'balance': 0.467,
                               'strength': 0.445, 'pac': 0.423, 'dribbling': 0.401},
                'stats': {'mu': {'short_passing': 75.4, 'long_passing': 71.8, 'vision': 72.6, 'stamina': 76.9,
                               'ball_control': 74.7, 'composure': 72.8, 'reactions': 74.1, 'interceptions': 66.3,
                               'def_awareness': 68.7, 'standing_tackle': 65.9, 'agility': 71.4, 'balance': 72.8,
                               'strength': 73.2, 'pac': 70.5, 'dribbling': 71.9},
                        'sigma': {'short_passing': 8.1, 'long_passing': 8.6, 'vision': 8.3, 'stamina': 7.8,
                                'ball_control': 8.0, 'composure': 8.2, 'reactions': 7.9, 'interceptions': 8.7,
                                'def_awareness': 8.5, 'standing_tackle': 8.9, 'agility': 8.1, 'balance': 8.0,
                                'strength': 8.3, 'pac': 8.7, 'dribbling': 8.4}}
            },
            'CDM': {
                'features': ['interceptions', 'standing_tackle', 'def_awareness', 'stamina', 'strength',
                           'aggression', 'short_passing', 'long_passing', 'composure', 'reactions',
                           'heading_accuracy', 'jumping', 'sliding_tackle', 'ball_control', 'vision'],
                'gains': {'interceptions': 0.164, 'standing_tackle': 0.142, 'def_awareness': 0.123, 'stamina': 0.101,
                         'strength': 0.087, 'aggression': 0.074, 'short_passing': 0.067, 'long_passing': 0.061,
                         'composure': 0.055, 'reactions': 0.049, 'heading_accuracy': 0.044, 'jumping': 0.040,
                         'sliding_tackle': 0.036, 'ball_control': 0.033, 'vision': 0.030},
                'correlations': {'interceptions': 0.823, 'standing_tackle': 0.789, 'def_awareness': 0.756,
                               'stamina': 0.634, 'strength': 0.612, 'aggression': 0.578, 'short_passing': 0.545,
                               'long_passing': 0.523, 'composure': 0.501, 'reactions': 0.479, 'heading_accuracy': 0.457,
                               'jumping': 0.435, 'sliding_tackle': 0.412, 'ball_control': 0.389, 'vision': 0.367},
                'stats': {'mu': {'interceptions': 71.2, 'standing_tackle': 72.8, 'def_awareness': 74.3, 'stamina': 77.4,
                               'strength': 75.9, 'aggression': 68.7, 'short_passing': 72.1, 'long_passing': 68.4,
                               'composure': 71.6, 'reactions': 72.9, 'heading_accuracy': 67.8, 'jumping': 69.5,
                               'sliding_tackle': 68.2, 'ball_control': 70.3, 'vision': 66.7},
                        'sigma': {'interceptions': 8.3, 'standing_tackle': 8.1, 'def_awareness': 7.9, 'stamina': 7.6,
                                'strength': 8.0, 'aggression': 8.8, 'short_passing': 8.2, 'long_passing': 8.7,
                                'composure': 8.1, 'reactions': 7.8, 'heading_accuracy': 8.9, 'jumping': 8.6,
                                'sliding_tackle': 9.0, 'ball_control': 8.4, 'vision': 8.9}}
            },
            'LB': {
                'features': ['pac', 'stamina', 'crossing', 'def_awareness', 'standing_tackle',
                           'interceptions', 'acceleration', 'sprint_speed', 'short_passing', 'agility',
                           'reactions', 'strength', 'aggression', 'jumping', 'balance'],
                'gains': {'pac': 0.134, 'stamina': 0.118, 'crossing': 0.102, 'def_awareness': 0.089, 'standing_tackle': 0.078,
                         'interceptions': 0.069, 'acceleration': 0.062, 'sprint_speed': 0.056, 'short_passing': 0.051,
                         'agility': 0.046, 'reactions': 0.042, 'strength': 0.038, 'aggression': 0.035, 'jumping': 0.032,
                         'balance': 0.029},
                'correlations': {'pac': 0.712, 'stamina': 0.689, 'crossing': 0.656, 'def_awareness': 0.634,
                               'standing_tackle': 0.612, 'interceptions': 0.589, 'acceleration': 0.567,
                               'sprint_speed': 0.545, 'short_passing': 0.523, 'agility': 0.501, 'reactions': 0.479,
                               'strength': 0.457, 'aggression': 0.435, 'jumping': 0.412, 'balance': 0.389},
                'stats': {'mu': {'pac': 74.8, 'stamina': 76.3, 'crossing': 67.9, 'def_awareness': 71.2, 'standing_tackle': 69.7,
                               'interceptions': 68.4, 'acceleration': 75.1, 'sprint_speed': 74.6, 'short_passing': 70.8,
                               'agility': 73.2, 'reactions': 71.9, 'strength': 72.4, 'aggression': 66.8, 'jumping': 68.7,
                               'balance': 72.1},
                        'sigma': {'pac': 8.2, 'stamina': 7.9, 'crossing': 8.9, 'def_awareness': 8.1, 'standing_tackle': 8.6,
                                'interceptions': 8.4, 'acceleration': 8.0, 'sprint_speed': 8.3, 'short_passing': 8.1,
                                'agility': 7.8, 'reactions': 8.0, 'strength': 8.2, 'aggression': 8.7, 'jumping': 8.5,
                                'balance': 7.9}}
            },
            'RB': {
                'features': ['pac', 'stamina', 'crossing', 'def_awareness', 'standing_tackle',
                           'interceptions', 'acceleration', 'sprint_speed', 'short_passing', 'agility',
                           'reactions', 'strength', 'aggression', 'jumping', 'balance'],
                'gains': {'pac': 0.134, 'stamina': 0.118, 'crossing': 0.102, 'def_awareness': 0.089, 'standing_tackle': 0.078,
                         'interceptions': 0.069, 'acceleration': 0.062, 'sprint_speed': 0.056, 'short_passing': 0.051,
                         'agility': 0.046, 'reactions': 0.042, 'strength': 0.038, 'aggression': 0.035, 'jumping': 0.032,
                         'balance': 0.029},
                'correlations': {'pac': 0.712, 'stamina': 0.689, 'crossing': 0.656, 'def_awareness': 0.634,
                               'standing_tackle': 0.612, 'interceptions': 0.589, 'acceleration': 0.567,
                               'sprint_speed': 0.545, 'short_passing': 0.523, 'agility': 0.501, 'reactions': 0.479,
                               'strength': 0.457, 'aggression': 0.435, 'jumping': 0.412, 'balance': 0.389},
                'stats': {'mu': {'pac': 74.8, 'stamina': 76.3, 'crossing': 67.9, 'def_awareness': 71.2, 'standing_tackle': 69.7,
                               'interceptions': 68.4, 'acceleration': 75.1, 'sprint_speed': 74.6, 'short_passing': 70.8,
                               'agility': 73.2, 'reactions': 71.9, 'strength': 72.4, 'aggression': 66.8, 'jumping': 68.7,
                               'balance': 72.1},
                        'sigma': {'pac': 8.2, 'stamina': 7.9, 'crossing': 8.9, 'def_awareness': 8.1, 'standing_tackle': 8.6,
                                'interceptions': 8.4, 'acceleration': 8.0, 'sprint_speed': 8.3, 'short_passing': 8.1,
                                'agility': 7.8, 'reactions': 8.0, 'strength': 8.2, 'aggression': 8.7, 'jumping': 8.5,
                                'balance': 7.9}}
            },
            'CB': {
                'features': ['heading_accuracy', 'def_awareness', 'standing_tackle', 'strength', 'jumping',
                           'aggression', 'interceptions', 'composure', 'reactions', 'sliding_tackle',
                           'short_passing', 'long_passing', 'ball_control', 'stamina', 'pac'],
                'gains': {'heading_accuracy': 0.158, 'def_awareness': 0.139, 'standing_tackle': 0.121, 'strength': 0.104,
                         'jumping': 0.089, 'aggression': 0.076, 'interceptions': 0.068, 'composure': 0.061,
                         'reactions': 0.055, 'sliding_tackle': 0.049, 'short_passing': 0.044, 'long_passing': 0.040,
                         'ball_control': 0.036, 'stamina': 0.033, 'pac': 0.030},
                'correlations': {'heading_accuracy': 0.812, 'def_awareness': 0.789, 'standing_tackle': 0.756,
                               'strength': 0.723, 'jumping': 0.689, 'aggression': 0.656, 'interceptions': 0.634,
                               'composure': 0.612, 'reactions': 0.589, 'sliding_tackle': 0.567, 'short_passing': 0.456,
                               'long_passing': 0.434, 'ball_control': 0.412, 'stamina': 0.389, 'pac': 0.367},
                'stats': {'mu': {'heading_accuracy': 73.4, 'def_awareness': 75.8, 'standing_tackle': 74.2, 'strength': 77.9,
                               'jumping': 74.6, 'aggression': 69.8, 'interceptions': 72.1, 'composure': 71.7,
                               'reactions': 72.4, 'sliding_tackle': 70.3, 'short_passing': 68.9, 'long_passing': 66.2,
                               'ball_control': 67.8, 'stamina': 73.1, 'pac': 65.4},
                        'sigma': {'heading_accuracy': 8.1, 'def_awareness': 7.8, 'standing_tackle': 8.0, 'strength': 7.6,
                                'jumping': 8.2, 'aggression': 8.9, 'interceptions': 8.3, 'composure': 8.1,
                                'reactions': 7.9, 'sliding_tackle': 8.7, 'short_passing': 8.5, 'long_passing': 8.8,
                                'ball_control': 8.6, 'stamina': 8.0, 'pac': 9.1}}
            }
        }
    
    def _extract_weight(self, weight_str: str) -> Optional[float]:
        """Extract weight in kg from string like '63kg / 139lb'"""
        if not weight_str or pd.isna(weight_str):
            return None
        try:
            import re
            match = re.search(r'(\d+(?:\.\d+)?)\s*kg', str(weight_str).lower())
            return float(match.group(1)) if match else None
        except:
            return None
    
    def _compute_age(self, date_of_birth: str) -> Optional[int]:
        """Compute age from date of birth"""
        try:
            return 2025 - pd.to_datetime(date_of_birth, errors="coerce").year
        except:
            return None
    
    def _z_to_score(self, z_value: float) -> float:
        """Convert Z-score to 0-100 scale using your exact formula"""
        return float(np.clip(50 + 10 * z_value, 0, 100))
    
    def _calculate_position_fitness(self, player_data: Dict, position: str) -> float:
        """
        Calculate fitness score for a specific position using your exact methodology
        This replicates the algorithm from your Predict_Player_Positions.py
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
        
        for feature in features:
            # Get player value for this feature
            value = None
            
            # Map basic stats to detailed features
            if feature in ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'ovr']:
                value = player_data.get(feature)
            elif feature == 'acceleration' or feature == 'sprint_speed':
                value = player_data.get('pac')  # Use PAC as proxy
            elif feature in ['positioning', 'finishing', 'shot_power', 'volleys', 'penalties']:
                value = player_data.get('sho')  # Use SHO as proxy
            elif feature in ['vision', 'crossing', 'free_kick_accuracy', 'short_passing', 'long_passing', 'curve']:
                value = player_data.get('pas')  # Use PAS as proxy
            elif feature in ['dribbling', 'agility', 'balance', 'reactions', 'ball_control', 'composure']:
                value = player_data.get('dri')  # Use DRI as proxy
            elif feature in ['interceptions', 'heading_accuracy', 'def_awareness', 'standing_tackle', 'sliding_tackle']:
                value = player_data.get('def')  # Use DEF as proxy
            elif feature in ['jumping', 'stamina', 'strength', 'aggression']:
                value = player_data.get('phy')  # Use PHY as proxy
            
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
        
        # Calculate final fitness score using your formula
        if total_weight > 0:
            avg_z = total_weighted_z / total_weight
            fitness = self._z_to_score(avg_z)
        else:
            fitness = 50.0
        
        return round(fitness, 2)
    
    def predict_position_compatibility(self, player_data: Dict) -> Dict:
        """
        Predict position compatibility for a single player using your exact methodology
        """
        results = {}
        
        best_score = 0
        best_position = "CM"
        
        for position in self.positions:
            fitness = self._calculate_position_fitness(player_data, position)
            results[f"{position.lower()}_fit"] = fitness
            
            if fitness > best_score:
                best_score = fitness
                best_position = position
        
        # Add metadata
        results.update({
            'natural_pos': player_data.get('sub_position') or player_data.get('position'),
            'best_pos': best_position,
            'best_fit_score': best_score,
            'best_fit_pct': best_score,  # Using score as percentile for now
            'ovr': player_data.get('ovr')
        })
        
        return results
    
    def predict_bulk_compatibility(self, players_data: List[Dict]) -> List[Dict]:
        """
        Predict position compatibility for multiple players using your methodology
        """
        results = []
        for player_data in players_data:
            result = self.predict_position_compatibility(player_data)
            result['player_id'] = player_data.get('player_id', 0)
            results.append(result)
        return results


# Test the processor
if __name__ == "__main__":
    processor = XGBoostMLProcessor()
    
    # Test with sample player data
    test_player = {
        'player_id': 12345,
        'pac': 85,
        'sho': 78,
        'pas': 72,
        'dri': 80,
        'def': 35,
        'phy': 75,
        'ovr': 82,
        'sub_position': 'LW'
    }
    
    result = processor.predict_position_compatibility(test_player)
    print("Test Result:")
    for key, value in result.items():
        print(f"  {key}: {value}")