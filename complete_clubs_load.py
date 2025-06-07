"""
Complete the clubs loading process
"""

import pandas as pd
import psycopg2
import os

def complete_clubs():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    print("Loading clubs data...")
    df = pd.read_csv('attached_assets/clubs_1749305425906.csv')
    
    count = 0
    for _, row in df.iterrows():
        try:
            cursor.execute("""
                INSERT INTO clubs (club_id, name, club_code, domestic_competition_id)
                VALUES (%s, %s, %s, %s)
            """, (
                int(row['club_id']),
                str(row['name'])[:100],
                str(row.get('club_code', ''))[:10] if pd.notna(row.get('club_code')) else None,
                str(row.get('domestic_competition_id', '')) if pd.notna(row.get('domestic_competition_id')) else None
            ))
            count += 1
            
            if count % 50 == 0:
                conn.commit()
                print(f"Loaded {count} clubs...")
                
        except Exception as e:
            print(f"Error: {e}")
    
    conn.commit()
    print(f"✓ Total clubs loaded: {count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    complete_clubs()