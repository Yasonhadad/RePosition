#!/usr/bin/env python3
"""
Ultra fast update process for all remaining players
"""

import sys
sys.path.append('.')
from ml_position_processor import AdvancedPositionProcessor
import psycopg2
import os
import json

def ultra_fast_update():
    """Update all remaining players using ultra fast bulk processing"""
    processor = AdvancedPositionProcessor()
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    total_updated = 0
    
    # Process in larger chunks for maximum efficiency
    while True:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get remaining count
        cursor.execute('SELECT COUNT(*) FROM players WHERE player_id NOT IN (SELECT player_id FROM position_compatibility)')
        remaining = cursor.fetchone()[0]
        
        if remaining == 0:
            break
        
        # Get 200 players at once for ultra fast processing
        cursor.execute('''
            SELECT player_id, name, sub_position, ovr, pac, sho, pas, dri, def, phy,
                   acceleration, sprint_speed, positioning, finishing, shot_power, long_shots,
                   volleys, penalties, vision, crossing, free_kick_accuracy, short_passing,
                   long_passing, curve, dribbling, agility, balance, reactions, ball_control,
                   composure, interceptions, heading_accuracy, def_awareness, standing_tackle,
                   sliding_tackle, jumping, stamina, strength, aggression, height_in_cm, age
            FROM players 
            WHERE player_id NOT IN (SELECT player_id FROM position_compatibility)
            ORDER BY player_id
            LIMIT 200
        ''')
        
        players = cursor.fetchall()
        if not players:
            break
        
        # Bulk process all players
        bulk_inserts = []
        
        for player in players:
            # Create player data with optimized defaults
            player_data = {
                'player_id': player[0],
                'name': player[1],
                'sub_position': player[2] or 'CM',
                'ovr': player[3] or 70,
                'pac': player[4] or 70,
                'sho': player[5] or 70,
                'pas': player[6] or 70,
                'dri': player[7] or 70,
                'def': player[8] or 70,
                'phy': player[9] or 70,
                'acceleration': player[10] or player[4] or 70,
                'sprint_speed': player[11] or player[4] or 70,
                'positioning': player[12] or player[5] or 70,
                'finishing': player[13] or player[5] or 70,
                'shot_power': player[14] or player[5] or 70,
                'long_shots': player[15] or player[5] or 70,
                'volleys': player[16] or player[5] or 70,
                'penalties': player[17] or player[5] or 70,
                'vision': player[18] or player[6] or 70,
                'crossing': player[19] or player[6] or 70,
                'free_kick_accuracy': player[20] or player[6] or 70,
                'short_passing': player[21] or player[6] or 70,
                'long_passing': player[22] or player[6] or 70,
                'curve': player[23] or player[6] or 70,
                'dribbling': player[24] or player[7] or 70,
                'agility': player[25] or player[7] or 70,
                'balance': player[26] or player[7] or 70,
                'reactions': player[27] or 70,
                'ball_control': player[28] or player[7] or 70,
                'composure': player[29] or 70,
                'interceptions': player[30] or player[8] or 70,
                'heading_accuracy': player[31] or player[9] or 70,
                'def_awareness': player[32] or player[8] or 70,
                'standing_tackle': player[33] or player[8] or 70,
                'sliding_tackle': player[34] or player[8] or 70,
                'jumping': player[35] or player[9] or 70,
                'stamina': player[36] or player[9] or 70,
                'strength': player[37] or player[9] or 70,
                'aggression': player[38] or player[9] or 70,
                'height_in_cm': player[39] or 180,
                'age': player[40] or 25
            }
            
            try:
                result = processor.predict_single_player(player_data)
                bulk_inserts.append((
                    result['player_id'], result['natural_pos'], result['st_fit'], result['lw_fit'],
                    result['rw_fit'], result['cm_fit'], result['cdm_fit'], result['cam_fit'],
                    result['lb_fit'], result['rb_fit'], result['cb_fit'], result['best_pos'],
                    result['best_fit_score'], result['best_fit_pct']
                ))
            except:
                continue
        
        # Ultra fast bulk insert
        if bulk_inserts:
            cursor.executemany('''
                INSERT INTO position_compatibility 
                (player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ''', bulk_inserts)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        batch_count = len(bulk_inserts)
        total_updated += batch_count
        
        print(f"Updated {batch_count} players, Total: {total_updated}, Remaining: ~{remaining - batch_count}")
        
        # Stop if we've updated enough for this session
        if total_updated >= 1000:
            print(f"Session limit reached: {total_updated} players updated")
            break
    
    print(f"Ultra fast update completed: {total_updated} players")
    return total_updated

if __name__ == "__main__":
    ultra_fast_update()