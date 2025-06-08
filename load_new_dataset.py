"""
Load new players dataset (without goalkeepers) into the database
"""

import pandas as pd
import psycopg2
import os
import numpy as np
from typing import Optional

def extract_weight(weight_str: str) -> Optional[float]:
    """Extract weight in kg from string like '63kg / 139lb'"""
    if not weight_str or pd.isna(weight_str):
        return None
    try:
        # Look for number followed by 'kg'
        import re
        match = re.search(r'(\d+(?:\.\d+)?)kg', str(weight_str))
        if match:
            return float(match.group(1))
    except:
        pass
    return None

def compute_age(dob_str: str) -> Optional[int]:
    """Compute age from date of birth"""
    if not dob_str or pd.isna(dob_str):
        return None
    try:
        dob = pd.to_datetime(dob_str, errors='coerce')
        if pd.isna(dob):
            return None
        return 2025 - dob.year
    except:
        return None

def safe_int(value) -> Optional[int]:
    """Safely convert to int"""
    if pd.isna(value) or value == '' or value == 'nan':
        return None
    try:
        return int(float(value))
    except:
        return None

def safe_float(value) -> Optional[float]:
    """Safely convert to float"""
    if pd.isna(value) or value == '' or value == 'nan':
        return None
    try:
        return float(value)
    except:
        return None

def safe_str(value) -> Optional[str]:
    """Safely convert to string"""
    if pd.isna(value) or value == '' or value == 'nan':
        return None
    return str(value).strip().replace('"', '')

def load_new_dataset():
    """Load the new dataset into the database"""
    
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    print("Loading new dataset: players_joined_clean_1749304538906.csv")
    
    # Read CSV file
    df = pd.read_csv('attached_assets/players_joined_clean_1749304538906.csv')
    print(f"Loaded {len(df)} players from CSV")
    
    # Clear existing data
    print("Clearing existing data...")
    cursor.execute("DELETE FROM position_compatibility")
    cursor.execute("DELETE FROM players")
    cursor.execute("DELETE FROM clubs")
    cursor.execute("DELETE FROM competitions")
    
    # Track unique clubs and competitions
    unique_clubs = df['current_club_name'].dropna().unique()
    unique_leagues = df['League'].dropna().unique()
    
    print(f"Found {len(unique_clubs)} unique clubs and {len(unique_leagues)} unique leagues")
    
    # Insert competitions
    print("Inserting competitions...")
    for i, league in enumerate(unique_leagues):
        cursor.execute("""
            INSERT INTO competitions (competition_id, name, competition_code, type, country_name)
            VALUES (%s, %s, %s, %s, %s)
        """, (league, league, league[:3].upper(), 'League', 'Various'))
    
    # Insert clubs
    print("Inserting clubs...")
    for i, club_name in enumerate(unique_clubs):
        # Find league for this club
        club_league = df[df['current_club_name'] == club_name]['League'].iloc[0]
        cursor.execute("""
            INSERT INTO clubs (club_id, name, club_code, domestic_competition_id)
            VALUES (%s, %s, %s, %s)
        """, (i + 1, club_name, club_name[:3].lower(), club_league))
    
    # Insert players
    print("Inserting players...")
    inserted_count = 0
    failed_count = 0
    
    for idx, row in df.iterrows():
        try:
            # Extract and clean data
            player_data = {
                'player_id': safe_int(row['player_id']),
                'name': safe_str(row['name']),
                'country_of_citizenship': safe_str(row['country_of_citizenship']),
                'date_of_birth': safe_str(row['date_of_birth']),
                'sub_position': safe_str(row['sub_position']),
                'position': safe_str(row['position']),
                'foot': safe_str(row['foot']),
                'height_in_cm': safe_int(row['height_in_cm']),
                'current_club_name': safe_str(row['current_club_name']),
                'market_value_in_eur': safe_int(row['market_value_in_eur']),
                'highest_market_value_in_eur': safe_int(row['highest_market_value_in_eur']),
                'image_url': safe_str(row['image_url']),
                'club_id': safe_int(row['club_id']),
                'ovr': safe_int(row['OVR']),
                'pac': safe_int(row['PAC']),
                'sho': safe_int(row['SHO']),
                'pas': safe_int(row['PAS']),
                'dri': safe_int(row['DRI']),
                'def': safe_int(row['DEF']),
                'phy': safe_int(row['PHY']),
                'acceleration': safe_int(row['Acceleration']),
                'sprint_speed': safe_int(row['Sprint Speed']),
                'positioning': safe_int(row['Positioning']),
                'finishing': safe_int(row['Finishing']),
                'shot_power': safe_int(row['Shot Power']),
                'long_shots': safe_int(row['Long Shots']),
                'volleys': safe_int(row['Volleys']),
                'penalties': safe_int(row['Penalties']),
                'vision': safe_int(row['Vision']),
                'crossing': safe_int(row['Crossing']),
                'free_kick_accuracy': safe_int(row['Free Kick Accuracy']),
                'short_passing': safe_int(row['Short Passing']),
                'long_passing': safe_int(row['Long Passing']),
                'curve': safe_int(row['Curve']),
                'dribbling': safe_int(row['Dribbling']),
                'agility': safe_int(row['Agility']),
                'balance': safe_int(row['Balance']),
                'reactions': safe_int(row['Reactions']),
                'ball_control': safe_int(row['Ball Control']),
                'composure': safe_int(row['Composure']),
                'interceptions': safe_int(row['Interceptions']),
                'heading_accuracy': safe_int(row['Heading Accuracy']),
                'def_awareness': safe_int(row['Def Awareness']),
                'standing_tackle': safe_int(row['Standing Tackle']),
                'sliding_tackle': safe_int(row['Sliding Tackle']),
                'jumping': safe_int(row['Jumping']),
                'stamina': safe_int(row['Stamina']),
                'strength': safe_int(row['Strength']),
                'aggression': safe_int(row['Aggression']),
                'weak_foot': safe_int(row['Weak foot']),
                'skill_moves': safe_int(row['Skill moves']),
                'preferred_foot': safe_str(row['Preferred foot']),
                'alternative_positions': safe_str(row['Alternative positions']),
                'play_style': safe_str(row['play style']),
                'league': safe_str(row['League']),
                'team': safe_str(row['Team']),
                'weight_in_kg': extract_weight(safe_str(row['Weight'])),
                'age': compute_age(safe_str(row['date_of_birth']))
            }
            
            if not player_data['player_id'] or not player_data['name']:
                failed_count += 1
                continue
            
            # Insert player
            cursor.execute("""
                INSERT INTO players (
                    player_id, name, country_of_citizenship, date_of_birth, sub_position, position, foot,
                    height_in_cm, current_club_name, market_value_in_eur, highest_market_value_in_eur,
                    image_url, club_id, ovr, pac, sho, pas, dri, def, phy,
                    acceleration, sprint_speed, positioning, finishing, shot_power, long_shots, volleys, penalties,
                    vision, crossing, free_kick_accuracy, short_passing, long_passing, curve,
                    dribbling, agility, balance, reactions, ball_control, composure,
                    interceptions, heading_accuracy, def_awareness, standing_tackle, sliding_tackle,
                    jumping, stamina, strength, aggression, weak_foot, skill_moves,
                    preferred_foot, alternative_positions, play_style, league, team, weight_in_kg, age
                ) VALUES (
                    %(player_id)s, %(name)s, %(country_of_citizenship)s, %(date_of_birth)s, %(sub_position)s, %(position)s, %(foot)s,
                    %(height_in_cm)s, %(current_club_name)s, %(market_value_in_eur)s, %(highest_market_value_in_eur)s,
                    %(image_url)s, %(club_id)s, %(ovr)s, %(pac)s, %(sho)s, %(pas)s, %(dri)s, %(def)s, %(phy)s,
                    %(acceleration)s, %(sprint_speed)s, %(positioning)s, %(finishing)s, %(shot_power)s, %(long_shots)s, %(volleys)s, %(penalties)s,
                    %(vision)s, %(crossing)s, %(free_kick_accuracy)s, %(short_passing)s, %(long_passing)s, %(curve)s,
                    %(dribbling)s, %(agility)s, %(balance)s, %(reactions)s, %(ball_control)s, %(composure)s,
                    %(interceptions)s, %(heading_accuracy)s, %(def_awareness)s, %(standing_tackle)s, %(sliding_tackle)s,
                    %(jumping)s, %(stamina)s, %(strength)s, %(aggression)s, %(weak_foot)s, %(skill_moves)s,
                    %(preferred_foot)s, %(alternative_positions)s, %(play_style)s, %(league)s, %(team)s, %(weight_in_kg)s, %(age)s
                )
            """, player_data)
            
            inserted_count += 1
            
            if inserted_count % 500 == 0:
                print(f"Inserted {inserted_count} players...")
                conn.commit()
                
        except Exception as e:
            print(f"Failed to insert player {row.get('name', 'Unknown')} (ID: {row.get('player_id', 'Unknown')}): {e}")
            failed_count += 1
    
    conn.commit()
    
    print(f"✓ Successfully inserted {inserted_count} players")
    print(f"✗ Failed to insert {failed_count} players")
    print(f"✓ Total competitions: {len(unique_leagues)}")
    print(f"✓ Total clubs: {len(unique_clubs)}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_new_dataset()