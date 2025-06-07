"""
Update all players with XGBoost ML methodology
"""

import psycopg2
import os
from xgboost_ml_processor import XGBoostMLProcessor

def update_all_players():
    """Update all players with XGBoost ML methodology"""
    
    processor = XGBoostMLProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get all players
    cursor.execute("""
        SELECT player_id, pac, sho, pas, dri, def, phy, ovr, sub_position, position, name
        FROM players 
        WHERE ovr IS NOT NULL 
        AND pac IS NOT NULL 
        AND sho IS NOT NULL 
        AND pas IS NOT NULL 
        AND dri IS NOT NULL 
        AND def IS NOT NULL 
        AND phy IS NOT NULL
        ORDER BY player_id
    """)
    
    players = cursor.fetchall()
    print(f"Processing {len(players)} players with XGBoost ML methodology...")
    
    batch_size = 200
    for i in range(0, len(players), batch_size):
        batch = players[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}: players {i+1}-{min(i+batch_size, len(players))}")
        
        for j, row in enumerate(batch):
            player_id, pac, sho, pas, dri, def_stat, phy, ovr, sub_position, position, name = row
            
            player_data = {
                'player_id': player_id,
                'pac': pac,
                'sho': sho,
                'pas': pas,
                'dri': dri,
                'def': def_stat,
                'phy': phy,
                'ovr': ovr,
                'sub_position': sub_position,
                'position': position
            }
            
            result = processor.predict_position_compatibility(player_data)
            
            # Update database
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
                    ovr = %s
                WHERE player_id = %s
            """, (
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
                result.get('ovr'),
                player_id
            ))
        
        # Commit each batch
        conn.commit()
        print(f"Completed batch {i//batch_size + 1}")
    
    print(f"Successfully updated all {len(players)} players with XGBoost ML methodology")
    
    # Show final statistics
    cursor.execute("""
        SELECT 
            COUNT(*) as total_players,
            AVG(best_fit_score) as avg_best_score,
            MAX(best_fit_score) as max_score,
            MIN(best_fit_score) as min_score
        FROM position_compatibility 
        WHERE best_fit_score IS NOT NULL
    """)
    
    stats = cursor.fetchone()
    print(f"\nFinal Statistics:")
    print(f"Total players: {stats[0]}")
    print(f"Average best score: {stats[1]:.2f}%")
    print(f"Highest score: {stats[2]:.2f}%")
    print(f"Lowest score: {stats[3]:.2f}%")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    update_all_players()