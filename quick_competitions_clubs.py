"""
Quick load of competitions and clubs data
"""

import pandas as pd
import psycopg2
import os

def load_data():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Load competitions
    print("Loading competitions...")
    df_comp = pd.read_csv('attached_assets/competitions_1749305425905.csv')
    
    comp_count = 0
    for _, row in df_comp.iterrows():
        try:
            cursor.execute("""
                INSERT INTO competitions (competition_id, name, competition_code, type, country_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                str(row['competition_id']),
                str(row['name']),
                str(row.get('competition_code', ''))[:10] if pd.notna(row.get('competition_code')) else None,
                str(row.get('type', '')) if pd.notna(row.get('type')) else None,
                str(row.get('country_name', '')) if pd.notna(row.get('country_name')) else None
            ))
            comp_count += 1
        except Exception as e:
            print(f"Competition error: {e}")
    
    conn.commit()
    print(f"✓ Inserted {comp_count} competitions")
    
    # Load clubs
    print("Loading clubs...")
    df_clubs = pd.read_csv('attached_assets/clubs_1749305425906.csv')
    
    club_count = 0
    for _, row in df_clubs.iterrows():
        try:
            cursor.execute("""
                INSERT INTO clubs (club_id, name, club_code, domestic_competition_id)
                VALUES (%s, %s, %s, %s)
            """, (
                int(row['club_id']) if pd.notna(row['club_id']) else None,
                str(row['name'])[:100] if pd.notna(row['name']) else None,
                str(row.get('club_code', ''))[:10] if pd.notna(row.get('club_code')) else None,
                str(row.get('domestic_competition_id', '')) if pd.notna(row.get('domestic_competition_id')) else None
            ))
            club_count += 1
        except Exception as e:
            print(f"Club error: {e}")
    
    conn.commit()
    print(f"✓ Inserted {club_count} clubs")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_data()