#!/usr/bin/env python3
"""
Batch update all players with real XGBoost position compatibility
"""

import sys
sys.path.append('.')
from ml_position_processor import AdvancedPositionProcessor
import psycopg2
import os

def batch_update_all_positions():
    """Update all players with position compatibility using real XGBoost models"""
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    processor = AdvancedPositionProcessor()
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Get all players in batches
    batch_size = 200
    offset = 0
    total_processed = 0
    
    while True:
        cursor.execute(f'''
            SELECT player_id, name, sub_position, ovr, pac, sho, pas, dri, def, phy,
                   acceleration, sprint_speed, positioning, finishing, shot_power, long_shots,
                   volleys, penalties, vision, crossing, free_kick_accuracy, short_passing,
                   long_passing, curve, dribbling, agility, balance, reactions, ball_control,
                   composure, interceptions, heading_accuracy, def_awareness, standing_tackle,
                   sliding_tackle, jumping, stamina, strength, aggression, height_in_cm, age
            FROM players 
            ORDER BY player_id
            LIMIT {batch_size} OFFSET {offset}
        ''')
        
        players = cursor.fetchall()
        if not players:
            break
            
        print(f'מעבד batch {offset//batch_size + 1}: {len(players)} שחקנים...')
        
        batch_inserts = []
        for player in players:
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
                
                batch_inserts.append((
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
                    result['best_fit_pct']
                ))
                
            except Exception as e:
                print(f'שגיאה בשחקן {player[0]}: {e}')
        
        # Batch insert/update
        if batch_inserts:
            for insert_data in batch_inserts:
                cursor.execute('''
                    DELETE FROM position_compatibility WHERE player_id = %s
                ''', (insert_data[0],))
                
                cursor.execute('''
                    INSERT INTO position_compatibility 
                    (player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ''', insert_data)
        
        conn.commit()
        total_processed += len(batch_inserts)
        print(f'הושלם batch {offset//batch_size + 1}: {len(batch_inserts)} שחקנים עודכנו')
        
        offset += batch_size
    
    cursor.close()
    conn.close()
    
    print(f'✓ הושלם העדכון: {total_processed} שחקנים עודכנו עם המודלים האמיתיים')
    return total_processed

if __name__ == "__main__":
    batch_update_all_positions()