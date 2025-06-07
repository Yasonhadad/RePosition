"""
Update players with enhanced ML methodology
"""

import psycopg2
import os
from enhanced_ml_processor import EnhancedMLProcessor

def update_players_enhanced():
    """Update players with enhanced ML methodology"""
    
    processor = EnhancedMLProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get all players with complete data
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
        LIMIT 200
    """)
    
    players = cursor.fetchall()
    print(f"Processing {len(players)} players with enhanced ML methodology...")
    
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
        
        if i % 50 == 0:
            print(f"Processed {i+1}/{len(players)} players")
            conn.commit()
    
    conn.commit()
    print(f"Successfully updated {len(players)} players with enhanced ML methodology")
    
    # Show improved results
    cursor.execute("""
        SELECT p.player_id, p.name, p.sub_position, pc.best_pos, pc.best_fit_score,
               pc.st_fit, pc.lw_fit, pc.rw_fit, pc.cam_fit, pc.cm_fit, 
               pc.cdm_fit, pc.lb_fit, pc.rb_fit, pc.cb_fit
        FROM players p
        JOIN position_compatibility pc ON p.player_id = pc.player_id
        WHERE p.player_id IN (SELECT player_id FROM players ORDER BY player_id LIMIT 200)
        ORDER BY pc.best_fit_score DESC
        LIMIT 10
    """)
    
    results = cursor.fetchall()
    print("\nTop 10 players with enhanced methodology:")
    for row in results:
        player_id, name, natural_pos, best_pos, best_score = row[:5]
        scores = row[5:]
        print(f"\n{player_id}: {name} ({natural_pos}) -> Best: {best_pos} ({best_score:.1f}%)")
        positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB']
        for i in range(0, len(positions), 3):
            line_positions = positions[i:i+3]
            line_scores = scores[i:i+3]
            line = "  " + " | ".join([f"{pos}: {score:.1f}%" for pos, score in zip(line_positions, line_scores)])
            print(line)
    
    # Statistics comparison
    cursor.execute("""
        SELECT 
            COUNT(*) as total_players,
            AVG(best_fit_score) as avg_best_score,
            MAX(best_fit_score) as max_score,
            MIN(best_fit_score) as min_score,
            STDDEV(best_fit_score) as std_dev
        FROM position_compatibility 
        WHERE best_fit_score IS NOT NULL
    """)
    
    stats = cursor.fetchone()
    print(f"\nEnhanced Methodology Statistics:")
    print(f"Total players: {stats[0]}")
    print(f"Average best score: {stats[1]:.2f}%")
    print(f"Score range: {stats[3]:.2f}% - {stats[2]:.2f}%")
    print(f"Standard deviation: {stats[4]:.2f}%")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    update_players_enhanced()