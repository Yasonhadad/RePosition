"""
Load the complete new dataset efficiently
"""

import pandas as pd
import psycopg2
import os

def load_complete_dataset():
    """Load the complete dataset in batches"""
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Clear existing data
    print("Clearing existing data...")
    cursor.execute("DELETE FROM position_compatibility")
    cursor.execute("DELETE FROM players")
    
    df = pd.read_csv('attached_assets/players_joined_clean_1749304538906.csv')
    print(f"Loading complete dataset with {len(df)} players...")
    
    # Insert in batches
    batch_size = 200
    total_inserted = 0
    
    for start_idx in range(0, len(df), batch_size):
        end_idx = min(start_idx + batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]
        
        batch_inserted = 0
        for idx, row in batch_df.iterrows():
            try:
                # Core data with safe conversion
                player_id = int(row['player_id']) if pd.notna(row['player_id']) else None
                name = str(row['name']).replace('"', '') if pd.notna(row['name']) else ''
                
                if not player_id or not name:
                    continue
                
                # Safe integer conversion
                def safe_int(val):
                    try:
                        return int(val) if pd.notna(val) and str(val) != 'nan' else None
                    except:
                        return None
                
                # Safe string conversion
                def safe_str(val):
                    try:
                        return str(val).replace('"', '') if pd.notna(val) and str(val) != 'nan' else None
                    except:
                        return None
                
                cursor.execute("""
                    INSERT INTO players (
                        player_id, name, position, sub_position, current_club_name,
                        ovr, pac, sho, pas, dri, def, phy,
                        acceleration, sprint_speed, positioning, finishing, shot_power, long_shots, volleys, penalties,
                        vision, crossing, free_kick_accuracy, short_passing, long_passing, curve,
                        dribbling, agility, balance, reactions, ball_control, composure,
                        interceptions, heading_accuracy, def_awareness, standing_tackle, sliding_tackle,
                        jumping, stamina, strength, aggression, weak_foot, skill_moves,
                        league, team, country_of_citizenship, date_of_birth, foot, height_in_cm,
                        market_value_in_eur, image_url, preferred_foot, alternative_positions, play_style
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    player_id, name, safe_str(row.get('position')), safe_str(row.get('sub_position')), safe_str(row.get('current_club_name')),
                    safe_int(row.get('OVR')), safe_int(row.get('PAC')), safe_int(row.get('SHO')), safe_int(row.get('PAS')), safe_int(row.get('DRI')), safe_int(row.get('DEF')), safe_int(row.get('PHY')),
                    safe_int(row.get('Acceleration')), safe_int(row.get('Sprint Speed')), safe_int(row.get('Positioning')), safe_int(row.get('Finishing')), safe_int(row.get('Shot Power')), safe_int(row.get('Long Shots')), safe_int(row.get('Volleys')), safe_int(row.get('Penalties')),
                    safe_int(row.get('Vision')), safe_int(row.get('Crossing')), safe_int(row.get('Free Kick Accuracy')), safe_int(row.get('Short Passing')), safe_int(row.get('Long Passing')), safe_int(row.get('Curve')),
                    safe_int(row.get('Dribbling')), safe_int(row.get('Agility')), safe_int(row.get('Balance')), safe_int(row.get('Reactions')), safe_int(row.get('Ball Control')), safe_int(row.get('Composure')),
                    safe_int(row.get('Interceptions')), safe_int(row.get('Heading Accuracy')), safe_int(row.get('Def Awareness')), safe_int(row.get('Standing Tackle')), safe_int(row.get('Sliding Tackle')),
                    safe_int(row.get('Jumping')), safe_int(row.get('Stamina')), safe_int(row.get('Strength')), safe_int(row.get('Aggression')), safe_int(row.get('Weak foot')), safe_int(row.get('Skill moves')),
                    safe_str(row.get('League')), safe_str(row.get('Team')), safe_str(row.get('country_of_citizenship')), safe_str(row.get('date_of_birth')), safe_str(row.get('foot')), safe_int(row.get('height_in_cm')),
                    safe_int(row.get('market_value_in_eur')), safe_str(row.get('image_url')), safe_str(row.get('Preferred foot')), safe_str(row.get('Alternative positions')), safe_str(row.get('play style'))
                ))
                
                batch_inserted += 1
                total_inserted += 1
                
            except Exception as e:
                print(f"Failed to insert {row.get('name', 'Unknown')}: {e}")
        
        conn.commit()
        print(f"✓ Batch {start_idx//batch_size + 1}: Inserted {batch_inserted} players (Total: {total_inserted})")
    
    print(f"✓ Complete dataset loaded: {total_inserted} players")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_complete_dataset()