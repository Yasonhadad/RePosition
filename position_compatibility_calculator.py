"""
Position Compatibility Calculator for Football Players
=====================================================

This script calculates position compatibility scores for football players
based on their technical attributes using weighted scoring methodology.

Author: Football Analytics System
Date: June 2025
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Tuple

class PositionCompatibilityCalculator:
    """
    Calculator for determining player position compatibility scores
    """
    
    def __init__(self):
        """Initialize the calculator with position-specific weight configurations"""
        self.position_weights = {
            'ST': {  # Striker - חלוץ
                'pac': 0.25,        # מהירות כללית
                'sho': 0.30,        # כושר ירי - הכי חשוב לחלוץ
                'pas': 0.05,        # מסירות - פחות חשוב
                'dri': 0.20,        # כדרור
                'def': 0.0,         # הגנה - לא רלוונטי
                'phy': 0.20,        # כושר גופני
                'acceleration': 0.15,      # תאוצה
                'positioning': 0.25,       # מיקום - חשוב מאוד לחלוץ
                'finishing': 0.30,         # גימור - הכי חשוב
                'shot_power': 0.15,        # כוח ירי
                'long_shots': 0.10,        # ירי מרחוק
                'volleys': 0.15,           # וולי
                'penalties': 0.10,         # פנדלים
                'ball_control': 0.15,      # שליטה בכדור
                'composure': 0.10,         # קור רוח
                'jumping': 0.10,           # קפיצה
                'strength': 0.15,          # כוח
                'aggression': 0.05         # תוקפנות
            },
            
            'LW': {  # Left Winger - כנף שמאל
                'pac': 0.30,        # מהירות - חיוני לכנף
                'sho': 0.15,        # ירי
                'pas': 0.15,        # מסירות
                'dri': 0.25,        # כדרור - חשוב מאוד
                'def': 0.05,        # הגנה - מינימלי
                'phy': 0.10,        # כושר גופני
                'acceleration': 0.25,      # תאוצה - חיוני
                'sprint_speed': 0.20,      # מהירות ריצה
                'crossing': 0.20,          # חיתוכים - חשוב לכנף
                'dribbling': 0.25,         # כדרור מפורט
                'agility': 0.20,           # זריזות
                'ball_control': 0.15,      # שליטה בכדור
                'vision': 0.10,            # ראיית משחק
                'curve': 0.10,             # עקמומיות
                'finishing': 0.10,         # גימור
                'composure': 0.10          # קור רוח
            },
            
            'RW': {  # Right Winger - כנף ימין (זהה לכנף שמאל)
                'pac': 0.30,
                'sho': 0.15,
                'pas': 0.15,
                'dri': 0.25,
                'def': 0.05,
                'phy': 0.10,
                'acceleration': 0.25,
                'sprint_speed': 0.20,
                'crossing': 0.20,
                'dribbling': 0.25,
                'agility': 0.20,
                'ball_control': 0.15,
                'vision': 0.10,
                'curve': 0.10,
                'finishing': 0.10,
                'composure': 0.10
            },
            
            'CAM': {  # Central Attacking Midfielder - קשר התקפי
                'pac': 0.10,        # מהירות - פחות חשוב
                'sho': 0.20,        # ירי - חשוב
                'pas': 0.25,        # מסירות - חשוב מאוד
                'dri': 0.25,        # כדרור
                'def': 0.05,        # הגנה - מינימלי
                'phy': 0.15,        # כושר גופני
                'vision': 0.25,            # ראיית משחק - חיוני
                'short_passing': 0.20,     # מסירות קצרות
                'long_passing': 0.15,      # מסירות ארוכות
                'ball_control': 0.20,      # שליטה בכדור
                'dribbling': 0.20,         # כדרור
                'agility': 0.15,           # זריזות
                'composure': 0.15,         # קור רוח
                'finishing': 0.15,         # גימור
                'long_shots': 0.15,        # ירי מרחוק
                'free_kick_accuracy': 0.10 # דיוק בעיטות חופשיות
            },
            
            'CM': {  # Central Midfielder - קשר מרכזי
                'pac': 0.10,        # מהירות
                'sho': 0.10,        # ירי - פחות חשוב
                'pas': 0.30,        # מסירות - הכי חשוב
                'dri': 0.20,        # כדרור
                'def': 0.15,        # הגנה - חשוב
                'phy': 0.15,        # כושר גופני
                'vision': 0.20,            # ראיית משחק
                'short_passing': 0.25,     # מסירות קצרות - חיוני
                'long_passing': 0.20,      # מסירות ארוכות
                'ball_control': 0.15,      # שליטה בכדור
                'interceptions': 0.15,     # יירוטים
                'stamina': 0.15,           # סיבולת - חשוב לקשר
                'composure': 0.10,         # קור רוח
                'reactions': 0.10          # תגובות
            },
            
            'CDM': {  # Defensive Midfielder - קשר הגנתי
                'pac': 0.05,        # מהירות - פחות חשוב
                'sho': 0.05,        # ירי - לא חשוב
                'pas': 0.25,        # מסירות
                'dri': 0.15,        # כדרור
                'def': 0.25,        # הגנה - חשוב מאוד
                'phy': 0.25,        # כושר גופני - חשוב
                'interceptions': 0.25,     # יירוטים - חיוני
                'standing_tackle': 0.20,   # תקיפה עומדת
                'def_awareness': 0.20,     # מודעות הגנתית
                'short_passing': 0.20,     # מסירות קצרות
                'long_passing': 0.15,      # מסירות ארוכות
                'stamina': 0.15,           # סיבולת
                'strength': 0.15,          # כוח
                'aggression': 0.10,        # תוקפנות
                'composure': 0.10          # קור רוח
            },
            
            'LB': {  # Left Back - בק שמאל
                'pac': 0.20,        # מהירות - חשוב
                'sho': 0.05,        # ירי - לא חשוב
                'pas': 0.20,        # מסירות
                'dri': 0.15,        # כדרור
                'def': 0.25,        # הגנה - חשוב מאוד
                'phy': 0.15,        # כושר גופני
                'acceleration': 0.15,      # תאוצה
                'sprint_speed': 0.15,      # מהירות ריצה
                'crossing': 0.20,          # חיתוכים - חשוב לבק
                'standing_tackle': 0.20,   # תקיפה עומדת
                'def_awareness': 0.15,     # מודעות הגנתית
                'interceptions': 0.15,     # יירוטים
                'stamina': 0.20,           # סיבולת - רץ הרבה
                'strength': 0.10           # כוח
            },
            
            'RB': {  # Right Back - בק ימין (זהה לבק שמאל)
                'pac': 0.20,
                'sho': 0.05,
                'pas': 0.20,
                'dri': 0.15,
                'def': 0.25,
                'phy': 0.15,
                'acceleration': 0.15,
                'sprint_speed': 0.15,
                'crossing': 0.20,
                'standing_tackle': 0.20,
                'def_awareness': 0.15,
                'interceptions': 0.15,
                'stamina': 0.20,
                'strength': 0.10
            },
            
            'CB': {  # Center Back - סטופר
                'pac': 0.05,        # מהירות - פחות חשוב
                'sho': 0.05,        # ירי - לא רלוונטי
                'pas': 0.15,        # מסירות
                'dri': 0.05,        # כדרור - מינימלי
                'def': 0.35,        # הגנה - הכי חשוב
                'phy': 0.35,        # כושר גופני - חשוב מאוד
                'heading_accuracy': 0.25,  # דיוק ראש - חיוני
                'standing_tackle': 0.25,   # תקיפה עומדת
                'sliding_tackle': 0.20,    # תקיפה בגלישה
                'def_awareness': 0.25,     # מודעות הגנתית - חיוני
                'interceptions': 0.20,     # יירוטים
                'strength': 0.25,          # כוח - חשוב מאוד
                'jumping': 0.20,           # קפיצה
                'aggression': 0.15,        # תוקפנות
                'composure': 0.10          # קור רוח
            }
        }
    
    def calculate_player_compatibility(self, player_stats: Dict) -> Dict:
        """
        Calculate position compatibility for a single player
        
        Args:
            player_stats: Dictionary containing player's technical attributes
            
        Returns:
            Dictionary with compatibility scores for all positions
        """
        position_scores = {}
        
        # Calculate fitness score for each position
        for position, weights in self.position_weights.items():
            score = 0
            total_weight = 0
            
            for attribute, weight in weights.items():
                if attribute in player_stats and player_stats[attribute] is not None:
                    score += player_stats[attribute] * weight
                    total_weight += weight
            
            if total_weight > 0:
                # Normalize the score to 0-100 scale
                normalized_score = min(100, max(0, (score / total_weight)))
                position_scores[position] = round(normalized_score, 2)
            else:
                position_scores[position] = 0
        
        # Find best position
        best_position = max(position_scores.items(), key=lambda x: x[1])
        
        result = {
            'st_fit': position_scores.get('ST', 0),
            'lw_fit': position_scores.get('LW', 0),
            'rw_fit': position_scores.get('RW', 0),
            'cam_fit': position_scores.get('CAM', 0),
            'cm_fit': position_scores.get('CM', 0),
            'cdm_fit': position_scores.get('CDM', 0),
            'lb_fit': position_scores.get('LB', 0),
            'rb_fit': position_scores.get('RB', 0),
            'cb_fit': position_scores.get('CB', 0),
            'best_pos': best_position[0],
            'best_fit_score': best_position[1],
            'best_fit_pct': best_position[1]
        }
        
        return result
    
    def calculate_bulk_compatibility(self, players_data: List[Dict]) -> List[Dict]:
        """
        Calculate position compatibility for multiple players
        
        Args:
            players_data: List of dictionaries containing player stats
            
        Returns:
            List of compatibility results
        """
        results = []
        
        for player in players_data:
            compatibility = self.calculate_player_compatibility(player)
            
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
    # Create calculator instance
    calculator = PositionCompatibilityCalculator()
    
    # Example player data
    example_player = {
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
    
    # Calculate compatibility
    result = calculator.calculate_player_compatibility(example_player)
    
    print("Position Compatibility Results:")
    print(f"Player: {example_player['name']} ({example_player['sub_position']})")
    print(f"Overall Rating: {example_player['ovr']}")
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