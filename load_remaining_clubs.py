"""
Load all remaining clubs efficiently
"""

import pandas as pd
import psycopg2
import os
from psycopg2.extras import execute_values

def load_remaining_clubs():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("SELECT COUNT(*) FROM clubs")
    current_count = cursor.fetchone()[0]
    print(f"Current clubs in database: {current_count}")
    
    # Load CSV
    df = pd.read_csv('attached_assets/clubs_1749305425906.csv')
    print(f"Total clubs in CSV: {len(df)}")
    
    # Get existing club IDs
    cursor.execute("SELECT club_id FROM clubs")
    existing_ids = set(row[0] for row in cursor.fetchall())
    print(f"Existing club IDs: {len(existing_ids)}")
    
    # Prepare data for bulk insert
    new_clubs = []
    for _, row in df.iterrows():
        try:
            club_id = int(row['club_id'])
            if club_id not in existing_ids:
                club_data = (
                    club_id,
                    str(row['name'])[:100],
                    str(row.get('club_code', ''))[:10] if pd.notna(row.get('club_code')) else None,
                    str(row.get('domestic_competition_id', '')) if pd.notna(row.get('domestic_competition_id')) else None
                )
                new_clubs.append(club_data)
        except Exception as e:
            print(f"Error processing club {row.get('name', 'Unknown')}: {e}")
    
    print(f"New clubs to insert: {len(new_clubs)}")
    
    # Bulk insert
    if new_clubs:
        execute_values(
            cursor,
            """
            INSERT INTO clubs (club_id, name, club_code, domestic_competition_id)
            VALUES %s
            """,
            new_clubs,
            page_size=100
        )
        conn.commit()
    
    # Final count
    cursor.execute("SELECT COUNT(*) FROM clubs")
    final_count = cursor.fetchone()[0]
    
    print(f"✓ Loaded {len(new_clubs)} new clubs")
    print(f"✓ Total clubs now: {final_count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_remaining_clubs()