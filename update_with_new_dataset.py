"""
Update database with the new complete dataset
"""

import pandas as pd
import psycopg2
import os
from psycopg2.extras import execute_values

def extract_weight(weight_str):
    """Extract weight in kg from string like '63kg / 139lb'"""
    if pd.isna(weight_str) or not weight_str:
        return None
    try:
        if 'kg' in str(weight_str):
            return float(str(weight_str).split('kg')[0].strip())
    except:
        pass
    return None

def compute_age(dob_str):
    """Compute age from date of birth"""
    if pd.isna(dob_str) or not dob_str:
        return None
    try:
        from datetime import datetime
        dob = pd.to_datetime(dob_str)
        return 2025 - dob.year
    except:
        return None

def safe_int(val):
    """Safely convert to int"""
    if pd.isna(val) or val == '':
        return None
    try:
        return int(float(val))
    except:
        return None

def safe_float(val):
    """Safely convert to float"""
    if pd.isna(val) or val == '':
        return None
    try:
        return float(val)
    except:
        return None

def safe_str(val):
    """Safely convert to string"""
    if pd.isna(val) or val == '':
        return None
    return str(val).strip()

def update_with_new_dataset():
    """Update database with new comprehensive dataset"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    print("Starting database update with new dataset...")
    
    # Clear existing data
    print("Clearing existing players...")
    cursor.execute("DELETE FROM position_compatibility")
    cursor.execute("DELETE FROM players")
    conn.commit()
    
    # Load new dataset
    print("Loading new dataset...")
    df = pd.read_csv('attached_assets/players_joined_clean_1749307617145.csv')
    print(f"Found {len(df)} players in new dataset")
    
    # Prepare players data
    players_data = []
    for _, row in df.iterrows():
        try:
            player_data = (
                safe_int(row['player_id']),
                safe_str(row['name'])[:100] if safe_str(row['name']) else 'Unknown',
                safe_str(row['country_of_citizenship']),
                safe_str(row['date_of_birth']),
                safe_str(row['sub_position']),
                safe_str(row['position']),
                safe_str(row['foot']),
                safe_float(row['height_in_cm']),
                safe_str(row['current_club_name']),
                safe_int(row['current_club_id']),
                safe_float(row['market_value_in_eur']),
                safe_float(row['highest_market_value_in_eur']),
                safe_str(row['image_url']),
                safe_int(row['OVR']),
                safe_int(row['PAC']),
                safe_int(row['SHO']),
                safe_int(row['PAS']),
                safe_int(row['DRI']),
                safe_int(row['DEF']),
                safe_int(row['PHY']),
                safe_int(row['Acceleration']),
                safe_int(row['Sprint Speed']),
                safe_int(row['Positioning']),
                safe_int(row['Finishing']),
                safe_int(row['Shot Power']),
                safe_int(row['Long Shots']),
                safe_int(row['Volleys']),
                safe_int(row['Penalties']),
                safe_int(row['Vision']),
                safe_int(row['Crossing']),
                safe_int(row['Free Kick Accuracy']),
                safe_int(row['Short Passing']),
                safe_int(row['Long Passing']),
                safe_int(row['Curve']),
                safe_int(row['Dribbling']),
                safe_int(row['Agility']),
                safe_int(row['Balance']),
                safe_int(row['Reactions']),
                safe_int(row['Ball Control']),
                safe_int(row['Composure']),
                safe_int(row['Interceptions']),
                safe_int(row['Heading Accuracy']),
                safe_int(row['Def Awareness']),
                safe_int(row['Standing Tackle']),
                safe_int(row['Sliding Tackle']),
                safe_int(row['Jumping']),
                safe_int(row['Stamina']),
                safe_int(row['Strength']),
                safe_int(row['Aggression']),
                safe_int(row['Weak foot']),
                safe_int(row['Skill moves']),
                safe_str(row['Preferred foot']),
                safe_str(row['Alternative positions']),
                safe_str(row['play style']),
                safe_str(row['League']),
                safe_str(row['Team']),
                extract_weight(row.get('Weight')),
                compute_age(row['date_of_birth'])
            )
            players_data.append(player_data)
        except Exception as e:
            print(f"Error processing player {row.get('name', 'Unknown')}: {e}")
    
    print(f"Prepared {len(players_data)} players for insertion")
    
    # Bulk insert players
    if players_data:
        execute_values(
            cursor,
            """
            INSERT INTO players (
                player_id, name, country_of_citizenship, date_of_birth, sub_position, position, foot,
                height_in_cm, current_club_name, current_club_id, market_value_in_eur, highest_market_value_in_eur,
                image_url, ovr, pac, sho, pas, dri, def, phy, acceleration, sprint_speed, positioning,
                finishing, shot_power, long_shots, volleys, penalties, vision, crossing, free_kick_accuracy,
                short_passing, long_passing, curve, dribbling, agility, balance, reactions, ball_control,
                composure, interceptions, heading_accuracy, def_awareness, standing_tackle, sliding_tackle,
                jumping, stamina, strength, aggression, weak_foot, skill_moves, preferred_foot,
                alternative_positions, play_style, league, team, weight, age
            ) VALUES %s
            """,
            players_data,
            page_size=200
        )
        conn.commit()
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM players")
    final_count = cursor.fetchone()[0]
    
    print(f"✓ Updated database with {final_count} players")
    print("✓ Database successfully updated with new comprehensive dataset")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    update_with_new_dataset()