"""
Quick update using XGBoost ML methodology for sample players
"""

import psycopg2
import os
from xgboost_ml_processor import XGBoostMLProcessor

def quick_xgboost_update():
    """Update sample players with XGBoost ML methodology"""
    
    processor = XGBoostMLProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get sample players
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
        LIMIT 100
    """)
    
    players = cursor.fetchall()
    print(f"Processing {len(players)} sample players with XGBoost ML methodology...")
    
    for i, row in enumerate(players):
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
        
        if i % 20 == 0:
            print(f"Processed {i+1}/{len(players)} players")
            conn.commit()
    
    conn.commit()
    print(f"Successfully updated {len(players)} players with XGBoost ML methodology")
    
    # Show sample results
    cursor.execute("""
        SELECT p.player_id, p.name, p.sub_position, pc.best_pos, pc.best_fit_score,
               pc.st_fit, pc.lw_fit, pc.rw_fit, pc.cam_fit, pc.cm_fit, 
               pc.cdm_fit, pc.lb_fit, pc.rb_fit, pc.cb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        WHERE p.player_id IN (SELECT player_id FROM players ORDER BY player_id LIMIT 100)
        ORDER BY pc.best_fit_score DESC
        LIMIT 5
    """)
    
    results = cursor.fetchall()
    print("\nSample updated results with XGBoost methodology:")
    for row in results:
        player_id, name, natural_pos, best_pos, best_score = row[:5]
        scores = row[5:]
        print(f"\n{player_id}: {name} ({natural_pos}) -> Best: {best_pos} ({best_score:.1f}%)")
        positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB']
        score_lines = []
        for i in range(0, len(positions), 3):
            line_positions = positions[i:i+3]
            line_scores = scores[i:i+3]
            line = "  " + " | ".join([f"{pos}: {score:.1f}%" for pos, score in zip(line_positions, line_scores)])
            score_lines.append(line)
        for line in score_lines:
            print(line)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    quick_xgboost_update()