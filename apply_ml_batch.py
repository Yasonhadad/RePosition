"""
Apply improved ML methodology in smaller batches
"""

import psycopg2
import os
from improved_xgboost_processor import ImprovedXGBoostProcessor

def apply_ml_batch(batch_size=500):
    """Apply ML methodology in manageable batches"""
    
    processor = ImprovedXGBoostProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get first batch of players
    cursor.execute("""
        SELECT player_id, pac, sho, pas, dri, def, phy, ovr, sub_position, position, name
        FROM players 
        ORDER BY player_id
        LIMIT %s
    """, (batch_size,))
    
    players = cursor.fetchall()
    print(f"Processing first {len(players)} players with improved methodology...")
    
    processed_count = 0
    
    for player in players:
        player_id, pac, sho, pas, dri, def_stat, phy, ovr, sub_position, position, name = player
        
        try:
            player_data = {
                'player_id': player_id,
                'pac': pac or 50,
                'sho': sho or 50,
                'pas': pas or 50,
                'dri': dri or 50,
                'def': def_stat or 50,
                'phy': phy or 50,
                'ovr': ovr or 60,
                'sub_position': sub_position,
                'position': position
            }
            
            result = processor.predict_position_compatibility(player_data)
            
            cursor.execute("""
                INSERT INTO position_compatibility (
                    player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit,
                    lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                player_id,
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
            
            processed_count += 1
            
            if processed_count % 100 == 0:
                conn.commit()
                print(f"✓ Processed {processed_count}/{len(players)} players")
                
        except Exception as e:
            print(f"Error processing {name}: {e}")
    
    conn.commit()
    print(f"✓ Successfully processed {processed_count} players")
    
    # Show top results
    cursor.execute("""
        SELECT p.name, p.position, pc.best_pos, pc.best_fit_score, 
               pc.st_fit, pc.lw_fit, pc.rw_fit, pc.cm_fit, pc.lb_fit, pc.rb_fit, pc.cb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        ORDER BY pc.best_fit_score DESC
        LIMIT 10
    """)
    
    print("\nTop 10 players by compatibility score:")
    results = cursor.fetchall()
    for row in results:
        name, pos, best_pos, best_score, st, lw, rw, cm, lb, rb, cb = row
        print(f"  {name} ({pos}) -> {best_pos}: {best_score:.1f}% | ST:{st:.1f} LW:{lw:.1f} RW:{rw:.1f} CM:{cm:.1f}")
    
    cursor.close()
    conn.close()
    
    return processed_count

if __name__ == "__main__":
    apply_ml_batch(500)