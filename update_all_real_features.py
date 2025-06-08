#!/usr/bin/env python3
"""
Update all players with real XGBoost features from your models
"""

import psycopg2
import os
import json
from ml_position_processor import AdvancedPositionProcessor
import time

def update_all_players_with_real_features():
    """Update all players with real XGBoost methodology"""
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return False
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get all players
        cursor.execute("""
            SELECT p.player_id, p.name, p.sub_position, p.position, p.ovr, p.pac, p.sho, p.pas, p.dri, p.def, p.phy,
                   p.acceleration, p.sprint_speed, p.positioning, p.finishing, p.shot_power, p.long_shots, p.volleys, p.penalties,
                   p.vision, p.crossing, p.free_kick_accuracy, p.short_passing, p.long_passing, p.curve,
                   p.dribbling, p.agility, p.balance, p.reactions, p.ball_control, p.composure,
                   p.interceptions, p.heading_accuracy, p.def_awareness, p.standing_tackle, p.sliding_tackle,
                   p.jumping, p.stamina, p.strength, p.aggression, p.weak_foot, p.skill_moves, p.preferred_foot,
                   p.age, p.weight_in_kg, p.height_in_cm
            FROM players p
            ORDER BY p.player_id
            LIMIT 1000
        """)
        
        players = cursor.fetchall()
        processor = AdvancedPositionProcessor()
        
        print(f"עידכון {len(players)} שחקנים עם הנתונים האמיתיים מהמודלים שלך...")
        
        batch_size = 50
        updated_count = 0
        
        for i in range(0, len(players), batch_size):
            batch = players[i:i + batch_size]
            
            for player in batch:
                player_data = {
                    'player_id': player[0],
                    'name': player[1],
                    'sub_position': player[2],
                    'position': player[3],
                    'ovr': player[4] or 60,
                    'pac': player[5] or 50,
                    'sho': player[6] or 50,
                    'pas': player[7] or 50,
                    'dri': player[8] or 50,
                    'def': player[9] or 50,
                    'phy': player[10] or 50,
                    'acceleration': player[11] or 50,
                    'sprint_speed': player[12] or 50,
                    'positioning': player[13] or 50,
                    'finishing': player[14] or 50,
                    'shot_power': player[15] or 50,
                    'long_shots': player[16] or 50,
                    'volleys': player[17] or 50,
                    'penalties': player[18] or 50,
                    'vision': player[19] or 50,
                    'crossing': player[20] or 50,
                    'free_kick_accuracy': player[21] or 50,
                    'short_passing': player[22] or 50,
                    'long_passing': player[23] or 50,
                    'curve': player[24] or 50,
                    'dribbling': player[25] or 50,
                    'agility': player[26] or 50,
                    'balance': player[27] or 50,
                    'reactions': player[28] or 50,
                    'ball_control': player[29] or 50,
                    'composure': player[30] or 50,
                    'interceptions': player[31] or 50,
                    'heading_accuracy': player[32] or 50,
                    'def_awareness': player[33] or 50,
                    'standing_tackle': player[34] or 50,
                    'sliding_tackle': player[35] or 50,
                    'jumping': player[36] or 50,
                    'stamina': player[37] or 50,
                    'strength': player[38] or 50,
                    'aggression': player[39] or 50,
                    'weak_foot': player[40] or 3,
                    'skill_moves': player[41] or 3,
                    'preferred_foot': player[42],
                    'age': player[43] or 25,
                    'weight_in_kg': player[44] or 75,
                    'height_in_cm': player[45] or 180
                }
                
                try:
                    result = processor.predict_single_player(player_data)
                    
                    cursor.execute("""
                        UPDATE position_compatibility SET
                            natural_pos = %s,
                            st_fit = %s,
                            lw_fit = %s,
                            rw_fit = %s,
                            cm_fit = %s,
                            cdm_fit = %s,
                            cam_fit = %s,
                            lb_fit = %s,
                            rb_fit = %s,
                            cb_fit = %s,
                            best_pos = %s,
                            best_fit_score = %s,
                            best_fit_pct = %s,
                            ovr = %s,
                            created_at = NOW()
                        WHERE player_id = %s
                    """, (
                        result['natural_pos'],
                        round(result['st_fit'], 1),
                        round(result['lw_fit'], 1),
                        round(result['rw_fit'], 1),
                        round(result['cm_fit'], 1),
                        round(result['cdm_fit'], 1),
                        round(result['cam_fit'], 1),
                        round(result['lb_fit'], 1),
                        round(result['rb_fit'], 1),
                        round(result['cb_fit'], 1),
                        result['best_pos'],
                        round(result['best_fit_score'], 1),
                        round(result['best_fit_pct'], 1),
                        result['ovr'],
                        result['player_id']
                    ))
                    
                    updated_count += 1
                    
                    if updated_count % 100 == 0:
                        print(f"עודכנו {updated_count} שחקנים...")
                    
                except Exception as e:
                    print(f"שגיאה בעידכון שחקן {player_data['player_id']}: {e}")
                    continue
            
            # Commit batch
            conn.commit()
            time.sleep(0.1)  # Small delay to prevent overwhelming
        
        print(f"✓ הושלם העידכון בהצלחה! עודכנו {updated_count} שחקנים עם הנתונים האמיתיים")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"שגיאה במסד הנתונים: {e}")
        return False

if __name__ == "__main__":
    update_all_players_with_real_features()