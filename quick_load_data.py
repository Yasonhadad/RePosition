"""
Quick data loading with smaller batches
"""

import pandas as pd
import psycopg2
import os

def quick_load():
    """Load data quickly in small batches"""
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Read first 100 players for testing
    df = pd.read_csv('attached_assets/players_joined_clean_1749304538906.csv').head(100)
    print(f"Loading first {len(df)} players for testing...")
    
    # Insert a few key competitions
    competitions = ['LALIGA EA SPORTS', 'Premier League', 'Serie A Enilive', 'Bundesliga', 'Ligue 1 McDonald\'s']
    for comp in competitions:
        try:
            cursor.execute("""
                INSERT INTO competitions (competition_id, name, competition_code, type, country_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (comp, comp, comp[:3].upper(), 'League', 'Various'))
        except:
            pass  # Already exists
    
    # Insert players with minimal required fields
    inserted = 0
    for idx, row in df.iterrows():
        try:
            player_id = int(row['player_id'])
            name = str(row['name']).replace('"', '')
            
            cursor.execute("""
                INSERT INTO players (
                    player_id, name, position, sub_position, current_club_name,
                    ovr, pac, sho, pas, dri, def, phy, league, team
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                player_id, name, str(row.get('position', '')), str(row.get('sub_position', '')),
                str(row.get('current_club_name', '')), int(row.get('OVR', 0)),
                int(row.get('PAC', 0)), int(row.get('SHO', 0)), int(row.get('PAS', 0)),
                int(row.get('DRI', 0)), int(row.get('DEF', 0)), int(row.get('PHY', 0)),
                str(row.get('League', '')), str(row.get('Team', ''))
            ))
            inserted += 1
            
        except Exception as e:
            print(f"Failed to insert {row.get('name', 'Unknown')}: {e}")
    
    conn.commit()
    print(f"✓ Inserted {inserted} players")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    quick_load()