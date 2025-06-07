"""
Update player position compatibility using XGBoost ML methodology
"""

import psycopg2
import pandas as pd
import os
from xgboost_ml_processor import XGBoostMLProcessor

def update_players_with_xgboost_ml():
    """Update all players with XGBoost ML methodology"""
    
    # Initialize the XGBoost processor
    processor = XGBoostMLProcessor()
    
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get all players with basic stats
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
    
    updated_count = 0
    
    for i, (player_id, pac, sho, pas, dri, defense, phy, ovr, sub_position, position, name) in enumerate(players):
        if i % 100 == 0:
            print(f"Processing player {i+1}/{len(players)}")
        
        # Prepare player data
        player_data = {
            'player_id': player_id,
            'pac': pac,
            'sho': sho,
            'pas': pas,
            'dri': dri,
            'def': defense,
            'phy': phy,
            'ovr': ovr,
            'sub_position': sub_position,
            'position': position
        }
        
        # Calculate compatibility using XGBoost methodology
        result = processor.predict_position_compatibility(player_data)
        
        # Check if record exists
        cursor.execute("SELECT player_id FROM position_compatibility WHERE player_id = %s", (player_id,))
        exists = cursor.fetchone()
        
        if exists:
            # Update existing record
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
        else:
            # Insert new record
            cursor.execute("""
                INSERT INTO position_compatibility (
                    player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, 
                    cam_fit, lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr
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
        
        updated_count += 1
        
        # Commit every 100 records
        if updated_count % 100 == 0:
            conn.commit()
    
    # Final commit
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Successfully updated {updated_count} players with XGBoost ML methodology")
    
    # Show sample results
    print("\nSample updated results:")
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.player_id, p.name, p.sub_position, pc.best_pos, pc.best_fit_score,
               pc.st_fit, pc.lw_fit, pc.rw_fit, pc.cam_fit, pc.cm_fit, 
               pc.cdm_fit, pc.lb_fit, pc.rb_fit, pc.cb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        ORDER BY pc.best_fit_score DESC
        LIMIT 5
    """)
    
    results = cursor.fetchall()
    for row in results:
        player_id, name, natural_pos, best_pos, best_score = row[:5]
        scores = row[5:]
        print(f"\n{player_id}: {name} ({natural_pos}) -> Best: {best_pos} ({best_score:.1f}%)")
        positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB']
        for i, (pos, score) in enumerate(zip(positions, scores)):
            if i % 3 == 0:
                print("  ", end="")
            print(f"{pos}: {score:.1f}% | ", end="")
            if (i + 1) % 3 == 0:
                print()
        if len(positions) % 3 != 0:
            print()
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    update_players_with_xgboost_ml()