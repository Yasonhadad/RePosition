"""
Apply improved XGBoost methodology to the new dataset
"""

import psycopg2
import os
from improved_xgboost_processor import ImprovedXGBoostProcessor

def apply_improved_ml():
    """Apply improved ML methodology to all players in the new dataset"""
    
    processor = ImprovedXGBoostProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get all players
    cursor.execute("""
        SELECT player_id, pac, sho, pas, dri, def, phy, ovr, sub_position, position, name
        FROM players 
        ORDER BY player_id
    """)
    
    players = cursor.fetchall()
    print(f"Applying improved methodology to {len(players)} players...")
    
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
            
            # Calculate position compatibility using improved methodology
            result = processor.predict_position_compatibility(player_data)
            
            # Insert or update position compatibility
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
                    ovr = EXCLUDED.ovr
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
            
            if processed_count % 25 == 0:
                conn.commit()
                print(f"✓ Processed {processed_count}/{len(players)} players...")
                
        except Exception as e:
            print(f"Failed to process {name} (ID: {player_id}): {e}")
    
    conn.commit()
    print(f"✓ Applied improved methodology to {processed_count} players")
    
    # Show sample results
    cursor.execute("""
        SELECT p.name, p.position, pc.best_pos, pc.best_fit_score, pc.st_fit, pc.lb_fit, pc.rb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        ORDER BY pc.best_fit_score DESC
        LIMIT 10
    """)
    
    print("\nTop 10 players by position compatibility:")
    for row in cursor.fetchall():
        name, pos, best_pos, best_score, st_fit, lb_fit, rb_fit = row
        print(f"  {name} ({pos}) -> Best: {best_pos} ({best_score:.1f}%) | ST: {st_fit:.1f}% | LB: {lb_fit:.1f}% | RB: {rb_fit:.1f}%")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    apply_improved_ml()