"""
Complete ML processing for all remaining players
"""

import psycopg2
import os
from improved_xgboost_processor import ImprovedXGBoostProcessor

def complete_ml_processing():
    """Process all remaining players efficiently"""
    
    processor = ImprovedXGBoostProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get unprocessed players
    cursor.execute("""
        SELECT p.player_id, p.pac, p.sho, p.pas, p.dri, p.def, p.phy, p.ovr, p.sub_position, p.position, p.name
        FROM players p
        LEFT JOIN position_compatibility pc ON p.player_id = pc.player_id
        WHERE pc.player_id IS NULL
        ORDER BY p.player_id
        LIMIT 1000
    """)
    
    remaining_players = cursor.fetchall()
    print(f"Processing {len(remaining_players)} remaining players...")
    
    processed = 0
    batch_values = []
    
    for player in remaining_players:
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
            
            batch_values.append((
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
            
            processed += 1
            
            # Insert in batches of 50
            if len(batch_values) >= 50:
                cursor.executemany("""
                    INSERT INTO position_compatibility (
                        player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit,
                        lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, batch_values)
                conn.commit()
                batch_values = []
                print(f"✓ Processed {processed} players")
                
        except Exception as e:
            print(f"Error with {name}: {str(e)[:50]}")
    
    # Insert remaining batch
    if batch_values:
        cursor.executemany("""
            INSERT INTO position_compatibility (
                player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit,
                lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, batch_values)
        conn.commit()
    
    print(f"✓ Completed processing {processed} players")
    
    # Show final statistics
    cursor.execute("SELECT COUNT(*) FROM position_compatibility")
    total_processed = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM players")
    total_players = cursor.fetchone()[0]
    
    print(f"Total processed: {total_processed}/{total_players} players")
    
    # Show top results with improved methodology
    cursor.execute("""
        SELECT p.name, p.position, pc.best_pos, pc.best_fit_score, 
               pc.st_fit, pc.cm_fit, pc.lb_fit, pc.rb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        ORDER BY pc.best_fit_score DESC
        LIMIT 15
    """)
    
    print("\nTop 15 players with improved XGBoost methodology:")
    for row in cursor.fetchall():
        name, pos, best_pos, best_score, st, cm, lb, rb = row
        print(f"  {name} ({pos}) -> {best_pos}: {best_score:.1f}% | ST:{st:.1f}% CM:{cm:.1f}% LB:{lb:.1f}% RB:{rb:.1f}%")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    complete_ml_processing()