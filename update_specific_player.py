"""
Update specific player with improved methodology
"""

import psycopg2
import os
from improved_xgboost_processor import ImprovedXGBoostProcessor

def update_specific_player(player_id):
    """Update specific player with improved methodology"""
    
    processor = ImprovedXGBoostProcessor()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get specific player
    cursor.execute("""
        SELECT player_id, pac, sho, pas, dri, def, phy, ovr, sub_position, position, name
        FROM players 
        WHERE player_id = %s
    """, (player_id,))
    
    player = cursor.fetchone()
    if not player:
        print(f"Player {player_id} not found")
        return
    
    player_id, pac, sho, pas, dri, def_stat, phy, ovr, sub_position, position, name = player
    
    print(f"Updating {name} (ID: {player_id}) with improved methodology...")
    
    # Get old scores for comparison
    cursor.execute("""
        SELECT st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos, best_fit_score
        FROM position_compatibility 
        WHERE player_id = %s
    """, (player_id,))
    
    old_result = cursor.fetchone()
    
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
    
    print(f"Player stats: PAC:{pac}, SHO:{sho}, PAS:{pas}, DRI:{dri}, DEF:{def_stat}, PHY:{phy}")
    
    # Calculate new scores
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
    
    conn.commit()
    
    print(f"\nCOMPARISON FOR {name}:")
    if old_result:
        positions = ['ST', 'LW', 'RW', 'CM', 'CDM', 'CAM', 'LB', 'RB', 'CB']
        old_scores = old_result[:9]
        new_scores = [result.get(f"{pos.lower()}_fit") for pos in positions]
        
        print("BEFORE (Old methodology):")
        for i, (pos, score) in enumerate(zip(positions, old_scores)):
            if i % 3 == 0:
                print("  ", end="")
            print(f"{pos}: {score:.1f}% | ", end="")
            if (i + 1) % 3 == 0:
                print()
        
        print("\nAFTER (Improved methodology):")
        for i, (pos, score) in enumerate(zip(positions, new_scores)):
            if i % 3 == 0:
                print("  ", end="")
            print(f"{pos}: {score:.1f}% | ", end="")
            if (i + 1) % 3 == 0:
                print()
        
        print(f"\nBest position changed: {old_result[9]} ({old_result[10]:.1f}%) -> {result['best_pos']} ({result['best_fit_score']:.1f}%)")
    
    print(f"\n✓ Player {player_id} updated successfully")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    # Update Iván Balliu specifically
    update_specific_player(85295)