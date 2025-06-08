"""
Complete ML processing for remaining players
"""

import pandas as pd
import psycopg2
import os
from psycopg2.extras import execute_values
import sys
sys.path.append('.')
from improved_xgboost_processor import ImprovedXGBoostProcessor

def complete_remaining_ml():
    """Complete ML processing for remaining players"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    print("Completing ML processing for remaining players...")
    
    # Initialize processor
    processor = ImprovedXGBoostProcessor()
    
    # Get players without compatibility data
    cursor.execute("""
        SELECT p.player_id, p.name, p.position, p.age, p.height_in_cm, p.weight_in_kg,
               p.ovr, p.pac, p.sho, p.pas, p.dri, p.def, p.phy, p.acceleration, p.sprint_speed,
               p.positioning, p.finishing, p.shot_power, p.long_shots, p.volleys, p.penalties,
               p.vision, p.crossing, p.free_kick_accuracy, p.short_passing, p.long_passing,
               p.curve, p.dribbling, p.agility, p.balance, p.reactions, p.ball_control,
               p.composure, p.interceptions, p.heading_accuracy, p.def_awareness,
               p.standing_tackle, p.sliding_tackle, p.jumping, p.stamina, p.strength, p.aggression
        FROM players p
        LEFT JOIN position_compatibility pc ON p.player_id = pc.player_id
        WHERE pc.player_id IS NULL
        ORDER BY p.player_id
    """)
    
    remaining_players = cursor.fetchall()
    print(f"Processing {len(remaining_players)} remaining players...")
    
    if not remaining_players:
        print("No remaining players to process!")
        return
    
    batch_size = 50
    compatibility_data = []
    
    for i, player in enumerate(remaining_players):
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
            if len(compatibility_data) >= batch_size or i == len(remaining_players) - 1:
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
                    print(f"Processed {i + 1}/{len(remaining_players)} remaining players...")
                    compatibility_data = []
                    
        except Exception as e:
            print(f"Error processing player {player[1]}: {e}")
    
    # Final counts
    cursor.execute("SELECT COUNT(*) FROM position_compatibility")
    final_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM players")
    total_players = cursor.fetchone()[0]
    
    print(f"✓ Completed! Total processed: {final_count}/{total_players} players")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    complete_remaining_ml()