"""
Load all remaining clubs from the CSV file
"""

import pandas as pd
import psycopg2
import os

def load_all_clubs():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("SELECT COUNT(*) FROM clubs")
    current_count = cursor.fetchone()[0]
    print(f"Current clubs in database: {current_count}")
    
    # Load all clubs from CSV
    df = pd.read_csv('attached_assets/clubs_1749305425906.csv')
    print(f"Total clubs in CSV: {len(df)}")
    
    # Get already loaded club IDs
    cursor.execute("SELECT club_id FROM clubs")
    existing_ids = set([row[0] for row in cursor.fetchall()])
    
    count = 0
    for _, row in df.iterrows():
        try:
            club_id = int(row['club_id'])
            
            # Skip if already loaded
            if club_id in existing_ids:
                continue
                
            cursor.execute("""
                INSERT INTO clubs (club_id, name, club_code, domestic_competition_id)
                VALUES (%s, %s, %s, %s)
            """, (
                club_id,
                str(row['name'])[:100],
                str(row.get('club_code', ''))[:10] if pd.notna(row.get('club_code')) else None,
                str(row.get('domestic_competition_id', '')) if pd.notna(row.get('domestic_competition_id')) else None
            ))
            count += 1
            
            if count % 100 == 0:
                conn.commit()
                print(f"Loaded {count} additional clubs...")
                
        except Exception as e:
            print(f"Error with club {row.get('name', 'Unknown')}: {e}")
    
    conn.commit()
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM clubs")
    final_count = cursor.fetchone()[0]
    
    print(f"✓ Loaded {count} new clubs")
    print(f"✓ Total clubs in database: {final_count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_all_clubs()