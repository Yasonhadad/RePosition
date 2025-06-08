#!/usr/bin/env python3
"""
Update ML System with Advanced XGBoost Methodology
==================================================
This script updates existing players with the new advanced position compatibility calculation
"""

import psycopg2
import json
import sys
import os
from ml_position_processor import AdvancedPositionProcessor

def update_player_compatibilities():
    """Update all players with new advanced XGBoost compatibility scores"""
    
    # Database connection
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Error: DATABASE_URL environment variable not set")
        return
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get all players with their detailed attributes
        cursor.execute("""
            SELECT player_id, name, sub_position, position, ovr, pac, sho, pas, dri, def, phy,
                   acceleration, sprint_speed, positioning, finishing, shot_power, long_shots, volleys, penalties,
                   vision, crossing, free_kick_accuracy, short_passing, long_passing, curve,
                   dribbling, agility, balance, reactions, ball_control, composure,
                   interceptions, heading_accuracy, def_awareness, standing_tackle, sliding_tackle,
                   jumping, stamina, strength, aggression, weak_foot, skill_moves, preferred_foot,
                   age, weight_in_kg
            FROM players 
            ORDER BY player_id
        """)
        
        players = cursor.fetchall()
        print(f"Processing {len(players)} players with advanced XGBoost methodology...")
        
        # Initialize the advanced processor
        processor = AdvancedPositionProcessor()
        
        # Process players in batches
        batch_size = 100
        updated_count = 0
        
        for i in range(0, len(players), batch_size):
            batch = players[i:i + batch_size]
            batch_data = []
            
            for player in batch:
                player_data = {
                    'player_id': player[0],
                    'name': player[1],
                    'sub_position': player[2],
                    'position': player[3],
                    'ovr': player[4],
                    'pac': player[5],
                    'sho': player[6],
                    'pas': player[7],
                    'dri': player[8],
                    'def': player[9],
                    'phy': player[10],
                    'acceleration': player[11],
                    'sprint_speed': player[12],
                    'positioning': player[13],
                    'finishing': player[14],
                    'shot_power': player[15],
                    'long_shots': player[16],
                    'volleys': player[17],
                    'penalties': player[18],
                    'vision': player[19],
                    'crossing': player[20],
                    'free_kick_accuracy': player[21],
                    'short_passing': player[22],
                    'long_passing': player[23],
                    'curve': player[24],
                    'dribbling': player[25],
                    'agility': player[26],
                    'balance': player[27],
                    'reactions': player[28],
                    'ball_control': player[29],
                    'composure': player[30],
                    'interceptions': player[31],
                    'heading_accuracy': player[32],
                    'def_awareness': player[33],
                    'standing_tackle': player[34],
                    'sliding_tackle': player[35],
                    'jumping': player[36],
                    'stamina': player[37],
                    'strength': player[38],
                    'aggression': player[39],
                    'weak_foot': player[40],
                    'skill_moves': player[41],
                    'preferred_foot': player[42],
                    'age': player[43],
                    'weight_in_kg': player[44]
                }
                batch_data.append(player_data)
            
            # Process batch with advanced XGBoost methodology
            for player_data in batch_data:
                try:
                    result = processor.predict_single_player(player_data)
                    
                    # Update or insert position compatibility
                    cursor.execute("""
                        INSERT INTO position_compatibility (
                            player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit,
                            lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (player_id) DO UPDATE SET
                            natural_pos = EXCLUDED.natural_pos,
                            st_fit = EXCLUDED.st_fit,
                            lw_fit = EXCLUDED.lw_fit,
                            rw_fit = EXCLUDED.rw_fit,
                            cm_fit = EXCLUDED.cm_fit,
                            cdm_fit = EXCLUDED.cdm_fit,
                            cam_fit = EXCLUDED.cam_fit,
                            lb_fit = EXCLUDED.lb_fit,
                            rb_fit = EXCLUDED.rb_fit,
                            cb_fit = EXCLUDED.cb_fit,
                            best_pos = EXCLUDED.best_pos,
                            best_fit_score = EXCLUDED.best_fit_score,
                            best_fit_pct = EXCLUDED.best_fit_pct,
                            ovr = EXCLUDED.ovr,
                            created_at = NOW()
                    """, (
                        result['player_id'],
                        result['natural_pos'],
                        result['st_fit'],
                        result['lw_fit'],
                        result['rw_fit'],
                        result['cm_fit'],
                        result['cdm_fit'],
                        result['cam_fit'],
                        result['lb_fit'],
                        result['rb_fit'],
                        result['cb_fit'],
                        result['best_pos'],
                        result['best_fit_score'],
                        result['best_fit_pct'],
                        result['ovr']
                    ))
                    
                    updated_count += 1
                    
                except Exception as e:
                    print(f"Error processing player {player_data['player_id']}: {e}")
                    continue
            
            # Commit batch
            conn.commit()
            print(f"Processed batch {i//batch_size + 1}/{(len(players) + batch_size - 1)//batch_size}, updated {updated_count} players")
        
        print(f"✓ Successfully updated {updated_count} players with advanced XGBoost compatibility scores")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error updating ML system: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = update_player_compatibilities()
    sys.exit(0 if success else 1)