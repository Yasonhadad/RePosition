"""
Apply improved ML methodology to the updated dataset
"""

import pandas as pd
import psycopg2
import os
from psycopg2.extras import execute_values
import sys
sys.path.append('.')
from improved_xgboost_processor import ImprovedXGBoostProcessor

def apply_ml_to_updated_data():
    """Apply ML methodology to all players in updated dataset"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    print("Applying improved ML methodology to updated dataset...")
    
    # Initialize processor
    processor = ImprovedXGBoostProcessor()
    
    # Get all players
    cursor.execute("""
        SELECT player_id, name, position, age, height_in_cm, weight_in_kg,
               ovr, pac, sho, pas, dri, def, phy, acceleration, sprint_speed,
               positioning, finishing, shot_power, long_shots, volleys, penalties,
               vision, crossing, free_kick_accuracy, short_passing, long_passing,
               curve, dribbling, agility, balance, reactions, ball_control,
               composure, interceptions, heading_accuracy, def_awareness,
               standing_tackle, sliding_tackle, jumping, stamina, strength, aggression
        FROM players 
        ORDER BY player_id
    """)
    
    players = cursor.fetchall()
    print(f"Processing {len(players)} players...")
    
    # Clear existing position compatibility data
    cursor.execute("DELETE FROM position_compatibility")
    conn.commit()
    
    batch_size = 100
    compatibility_data = []
    
    for i, player in enumerate(players):
        try:
            # Prepare player data for ML
            player_data = {
                'player_id': player[0],
                'name': player[1],
                'position': player[2],
                'age': player[3],
                'height_in_cm': player[4],
                'weight': player[5],
                'ovr': player[6],
                'pac': player[7],
                'sho': player[8],
                'pas': player[9],
                'dri': player[10],
                'def': player[11],
                'phy': player[12],
                'acceleration': player[13],
                'sprint_speed': player[14],
                'positioning': player[15],
                'finishing': player[16],
                'shot_power': player[17],
                'long_shots': player[18],
                'volleys': player[19],
                'penalties': player[20],
                'vision': player[21],
                'crossing': player[22],
                'free_kick_accuracy': player[23],
                'short_passing': player[24],
                'long_passing': player[25],
                'curve': player[26],
                'dribbling': player[27],
                'agility': player[28],
                'balance': player[29],
                'reactions': player[30],
                'ball_control': player[31],
                'composure': player[32],
                'interceptions': player[33],
                'heading_accuracy': player[34],
                'def_awareness': player[35],
                'standing_tackle': player[36],
                'sliding_tackle': player[37],
                'jumping': player[38],
                'stamina': player[39],
                'strength': player[40],
                'aggression': player[41]
            }
            
            # Get ML predictions
            result = processor.predict_position_compatibility(player_data)
            
            if result:
                compatibility_data.append((
                    player[0],  # player_id
                    result.get('natural_pos'),
                    result.get('st_fit'),
                    result.get('lw_fit'), 
                    result.get('rw_fit'),
                    result.get('cm_fit'),
                    result.get('cdm_fit'),
                    result.get('cam_fit'),
                    result.get('lb_fit'),
                    result.get('rb_fit'),
                    result.get('cb_fit'),
                    result.get('best_pos'),
                    result.get('best_fit_score'),
                    result.get('best_fit_pct'),
                    result.get('ovr')
                ))
            
            # Insert in batches
            if len(compatibility_data) >= batch_size or i == len(players) - 1:
                if compatibility_data:
                    execute_values(
                        cursor,
                        """
                        INSERT INTO position_compatibility (
                            player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit,
                            cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos,
                            best_fit_score, best_fit_pct, ovr
                        ) VALUES %s
                        """,
                        compatibility_data
                    )
                    conn.commit()
                    print(f"Processed {i + 1}/{len(players)} players...")
                    compatibility_data = []
                    
        except Exception as e:
            print(f"Error processing player {player[1]}: {e}")
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM position_compatibility")
    final_count = cursor.fetchone()[0]
    
    print(f"✓ Processed {final_count} players with improved ML methodology")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    apply_ml_to_updated_data()