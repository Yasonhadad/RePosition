"""
Load competitions and clubs from the new CSV files
"""

import pandas as pd
import psycopg2
import os

def load_competitions_and_clubs():
    """Load competitions and clubs data"""
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Clear existing data
    print("Clearing existing competitions and clubs...")
    cursor.execute("DELETE FROM competitions")
    cursor.execute("DELETE FROM clubs")
    
    # Load competitions
    print("Loading competitions...")
    competitions_df = pd.read_csv('attached_assets/competitions_1749305425905.csv')
    
    inserted_competitions = 0
    for idx, row in competitions_df.iterrows():
        try:
            cursor.execute("""
                INSERT INTO competitions (
                    competition_id, competition_code, name, sub_type, type,
                    country_id, country_name, domestic_league_code, confederation, url, is_major_national_league
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(row['competition_id']),
                str(row['competition_code']) if pd.notna(row['competition_code']) else None,
                str(row['name']),
                str(row['sub_type']) if pd.notna(row['sub_type']) else None,
                str(row['type']) if pd.notna(row['type']) else None,
                int(row['country_id']) if pd.notna(row['country_id']) and str(row['country_id']) != '-1' else None,
                str(row['country_name']) if pd.notna(row['country_name']) else None,
                str(row['domestic_league_code']) if pd.notna(row['domestic_league_code']) else None,
                str(row['confederation']) if pd.notna(row['confederation']) else None,
                str(row['url']) if pd.notna(row['url']) else None,
                str(row['is_major_national_league']).lower() == 'true'
            ))
            inserted_competitions += 1
        except Exception as e:
            print(f"Failed to insert competition {row.get('name', 'Unknown')}: {e}")
    
    conn.commit()
    print(f"✓ Inserted {inserted_competitions} competitions")
    
    # Load clubs
    print("Loading clubs...")
    clubs_df = pd.read_csv('attached_assets/clubs_1749305425906.csv')
    
    inserted_clubs = 0
    for idx, row in clubs_df.iterrows():
        try:
            # Clean and prepare values
            def safe_int(val):
                try:
                    if pd.isna(val) or str(val) == '' or str(val) == 'nan':
                        return None
                    return int(float(val))
                except:
                    return None
            
            def safe_float(val):
                try:
                    if pd.isna(val) or str(val) == '' or str(val) == 'nan':
                        return None
                    return float(val)
                except:
                    return None
            
            def safe_str(val):
                try:
                    if pd.isna(val) or str(val) == '' or str(val) == 'nan':
                        return None
                    return str(val).strip()
                except:
                    return None
            
            cursor.execute("""
                INSERT INTO clubs (
                    club_id, club_code, name, domestic_competition_id,
                    total_market_value, squad_size, average_age, foreigners_number, foreigners_percentage,
                    national_team_players, stadium_name, stadium_seats, net_transfer_record, coach_name, last_season
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                safe_int(row['club_id']),
                safe_str(row['club_code']),
                safe_str(row['name']),
                safe_str(row['domestic_competition_id']),
                safe_int(row['total_market_value']),
                safe_int(row['squad_size']),
                safe_float(row['average_age']),
                safe_int(row['foreigners_number']),
                safe_float(row['foreigners_percentage']),
                safe_int(row['national_team_players']),
                safe_str(row['stadium_name']),
                safe_int(row['stadium_seats']),
                safe_str(row['net_transfer_record']),
                safe_str(row['coach_name']),
                safe_int(row['last_season'])
            ))
            inserted_clubs += 1
            
            if inserted_clubs % 50 == 0:
                conn.commit()
                print(f"✓ Inserted {inserted_clubs} clubs...")
                
        except Exception as e:
            print(f"Failed to insert club {row.get('name', 'Unknown')}: {e}")
    
    conn.commit()
    print(f"✓ Inserted {inserted_clubs} clubs")
    
    # Show statistics
    cursor.execute("SELECT COUNT(*) FROM competitions")
    total_competitions = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM clubs")
    total_clubs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM players")
    total_players = cursor.fetchone()[0]
    
    print(f"\nFinal statistics:")
    print(f"  Competitions: {total_competitions}")
    print(f"  Clubs: {total_clubs}")
    print(f"  Players: {total_players}")
    
    # Show some sample data
    cursor.execute("""
        SELECT name, type, country_name 
        FROM competitions 
        WHERE is_major_national_league = true
        ORDER BY name
    """)
    
    print("\nMajor national leagues:")
    for row in cursor.fetchall():
        name, comp_type, country = row
        print(f"  {name} ({country})")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_competitions_and_clubs()