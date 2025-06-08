#!/usr/bin/env python3
"""
Efficient batch update for all remaining players
"""

import sys
sys.path.append('.')
from ml_position_processor import AdvancedPositionProcessor
import psycopg2
import os
import time
import threading

def worker_update_batch(start_id, end_id, worker_id):
    """Worker function to update a range of players"""
    processor = AdvancedPositionProcessor()
    DATABASE_URL = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    processed = 0
    
    try:
        cursor.execute(f'''
            SELECT player_id, name, sub_position, ovr, pac, sho, pas, dri, def, phy,
                   acceleration, sprint_speed, positioning, finishing, shot_power, long_shots,
                   volleys, penalties, vision, crossing, free_kick_accuracy, short_passing,
                   long_passing, curve, dribbling, agility, balance, reactions, ball_control,
                   composure, interceptions, heading_accuracy, def_awareness, standing_tackle,
                   sliding_tackle, jumping, stamina, strength, aggression, height_in_cm, age
            FROM players 
            WHERE player_id >= {start_id} AND player_id < {end_id}
              AND player_id NOT IN (SELECT player_id FROM position_compatibility)
            ORDER BY player_id
        ''')
        
        players = cursor.fetchall()
        
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
                
                cursor.execute('''
                    INSERT INTO position_compatibility 
                    (player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ''', (
                    result['player_id'], result['natural_pos'], result['st_fit'], result['lw_fit'],
                    result['rw_fit'], result['cm_fit'], result['cdm_fit'], result['cam_fit'],
                    result['lb_fit'], result['rb_fit'], result['cb_fit'], result['best_pos'],
                    result['best_fit_score'], result['best_fit_pct']
                ))
                
                processed += 1
                
                if processed % 20 == 0:
                    conn.commit()
                
            except Exception as e:
                continue
        
        conn.commit()
        print(f'Worker {worker_id}: עודכנו {processed} שחקנים')
    
    except Exception as e:
        print(f'Worker {worker_id} error: {e}')
    
    finally:
        cursor.close()
        conn.close()
    
    return processed

def efficient_batch_update():
    """Update all remaining players efficiently"""
    
    # Get total range of player IDs
    DATABASE_URL = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute('SELECT MIN(player_id), MAX(player_id) FROM players')
    min_id, max_id = cursor.fetchone()
    
    cursor.execute('SELECT COUNT(*) FROM position_compatibility')
    current_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM players')
    total_players = cursor.fetchone()[0]
    
    cursor.close()
    conn.close()
    
    print(f'מתחיל עדכון: {current_count}/{total_players} שחקנים כבר עודכנו')
    print(f'טווח IDs: {min_id} - {max_id}')
    
    # Split into chunks and process sequentially for stability
    chunk_size = (max_id - min_id) // 20
    total_processed = 0
    
    for i in range(20):
        start_id = min_id + (i * chunk_size)
        end_id = min_id + ((i + 1) * chunk_size) if i < 19 else max_id + 1
        
        print(f'מעבד chunk {i+1}/20: IDs {start_id}-{end_id}')
        processed = worker_update_batch(start_id, end_id, i+1)
        total_processed += processed
        
        # Brief pause between chunks
        time.sleep(0.5)
    
    print(f'הושלם: {total_processed} שחקנים עודכנו בסיבוב זה')
    
    # Final status check
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM position_compatibility')
    final_count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    
    print(f'סטטוס סופי: {final_count}/{total_players} שחקנים עם ציוני התאמה')
    
    return final_count

if __name__ == "__main__":
    efficient_batch_update()