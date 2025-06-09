#!/usr/bin/env python3
"""
Load CSV data into local PostgreSQL database
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'reposition_db',
    'user': 'reposition_user',
    'password': 'reposition123'
}

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def load_competitions():
    """Load competitions data"""
    print("Loading competitions...")
    try:
        df = pd.read_csv('attached_assets/competitions.csv')
        print(f"Found {len(df)} competitions")
        
        conn = connect_db()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        # Clear existing data
        cur.execute("DELETE FROM competitions")
        
        # Prepare data
        competitions_data = []
        for _, row in df.iterrows():
            competitions_data.append((
                int(row['competition_id']) if pd.notna(row['competition_id']) else None,
                str(row['competition_name']) if pd.notna(row['competition_name']) else None,
                str(row['country_name']) if pd.notna(row['country_name']) else None,
                str(row['competition_gender']) if pd.notna(row['competition_gender']) else None,
                str(row['competition_youth']) if pd.notna(row['competition_youth']) else None,
                str(row['competition_international']) if pd.notna(row['competition_international']) else None,
                str(row['season_name']) if pd.notna(row['season_name']) else None
            ))
        
        # Insert data
        execute_values(
            cur,
            """INSERT INTO competitions (id, name, country, gender, youth, international, season) 
               VALUES %s ON CONFLICT (id) DO NOTHING""",
            competitions_data
        )
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✓ Loaded {len(competitions_data)} competitions")
        return True
        
    except Exception as e:
        print(f"Error loading competitions: {e}")
        return False

def load_clubs():
    """Load clubs data"""
    print("Loading clubs...")
    try:
        df = pd.read_csv('attached_assets/clubs.csv')
        print(f"Found {len(df)} clubs")
        
        conn = connect_db()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        # Clear existing data
        cur.execute("DELETE FROM clubs")
        
        # Prepare data
        clubs_data = []
        for _, row in df.iterrows():
            clubs_data.append((
                int(row['club_id']) if pd.notna(row['club_id']) else None,
                str(row['club_name']) if pd.notna(row['club_name']) else None,
                int(row['competition_id']) if pd.notna(row['competition_id']) else None
            ))
        
        # Insert data
        execute_values(
            cur,
            """INSERT INTO clubs (id, name, competition_id) 
               VALUES %s ON CONFLICT (id) DO NOTHING""",
            clubs_data
        )
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✓ Loaded {len(clubs_data)} clubs")
        return True
        
    except Exception as e:
        print(f"Error loading clubs: {e}")
        return False

def extract_weight(weight_str):
    """Extract weight in kg from string like '63kg / 139lb'"""
    if pd.isna(weight_str) or not isinstance(weight_str, str):
        return None
    try:
        if 'kg' in weight_str:
            return float(weight_str.split('kg')[0].strip())
        return None
    except:
        return None

def compute_age(dob_str):
    """Compute age from date of birth"""
    if pd.isna(dob_str):
        return None
    try:
        dob = pd.to_datetime(dob_str)
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age if 15 <= age <= 50 else None
    except:
        return None

def safe_int(val):
    """Safely convert to int"""
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except:
        return None

def safe_float(val):
    """Safely convert to float"""
    if pd.isna(val):
        return None
    try:
        return float(val)
    except:
        return None

def safe_str(val):
    """Safely convert to string"""
    if pd.isna(val):
        return None
    return str(val).strip() if str(val).strip() else None

def load_players():
    """Load players data"""
    print("Loading players...")
    try:
        # Try the cleaned dataset first
        if os.path.exists('attached_assets/players_joined_clean.csv'):
            df = pd.read_csv('attached_assets/players_joined_clean.csv')
            print(f"Using cleaned dataset with {len(df)} players")
        else:
            df = pd.read_csv('attached_assets/players.csv')
            print(f"Using regular dataset with {len(df)} players")
        
        conn = connect_db()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        # Clear existing data
        cur.execute("DELETE FROM players")
        
        # Prepare data
        players_data = []
        processed = 0
        
        for _, row in df.iterrows():
            try:
                # Extract basic info
                player_id = safe_int(row.get('player_id'))
                if not player_id:
                    continue
                
                name = safe_str(row.get('player_name') or row.get('name'))
                if not name:
                    continue
                
                # Extract other fields
                age = compute_age(row.get('date_of_birth')) or safe_int(row.get('age'))
                height = safe_float(row.get('height_cm'))
                weight = extract_weight(row.get('weight')) or safe_float(row.get('weight_kg'))
                foot = safe_str(row.get('foot'))
                club_id = safe_int(row.get('club_id'))
                position = safe_str(row.get('position') or row.get('primary_position'))
                
                # Stats
                overall_rating = safe_int(row.get('overall_rating') or row.get('overall'))
                potential = safe_int(row.get('potential'))
                value_eur = safe_float(row.get('value_eur'))
                wage_eur = safe_float(row.get('wage_eur'))
                
                # Skills
                pace = safe_int(row.get('pace'))
                shooting = safe_int(row.get('shooting'))
                passing = safe_int(row.get('passing'))
                dribbling = safe_int(row.get('dribbling'))
                defending = safe_int(row.get('defending'))
                physic = safe_int(row.get('physic'))
                
                # Add more fields as available in CSV
                players_data.append((
                    player_id, name, age, height, weight, foot, club_id, position,
                    overall_rating, potential, value_eur, wage_eur,
                    pace, shooting, passing, dribbling, defending, physic
                ))
                
                processed += 1
                if processed % 100 == 0:
                    print(f"Processed {processed} players...")
                    
            except Exception as e:
                print(f"Error processing player {row.get('player_id', 'unknown')}: {e}")
                continue
        
        print(f"Prepared {len(players_data)} players for insertion")
        
        # Insert data in batches
        batch_size = 500
        for i in range(0, len(players_data), batch_size):
            batch = players_data[i:i + batch_size]
            
            execute_values(
                cur,
                """INSERT INTO players (
                    id, name, age, height, weight, foot, club_id, position,
                    overall_rating, potential, value_eur, wage_eur,
                    pace, shooting, passing, dribbling, defending, physic
                ) VALUES %s ON CONFLICT (id) DO NOTHING""",
                batch
            )
            print(f"Inserted batch {i//batch_size + 1}")
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✓ Loaded {len(players_data)} players")
        return True
        
    except Exception as e:
        print(f"Error loading players: {e}")
        return False

def main():
    """Main function to load all data"""
    print("=== Loading Data to Local Database ===")
    print(f"Database: {DB_CONFIG['database']} on {DB_CONFIG['host']}")
    
    success = True
    
    # Load in order (competitions -> clubs -> players)
    if not load_competitions():
        success = False
    
    if not load_clubs():
        success = False
        
    if not load_players():
        success = False
    
    if success:
        print("\n✓ All data loaded successfully!")
        
        # Show summary
        conn = connect_db()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM competitions")
            comp_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM clubs")
            club_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM players")
            player_count = cur.fetchone()[0]
            
            print(f"\nSummary:")
            print(f"- Competitions: {comp_count}")
            print(f"- Clubs: {club_count}")
            print(f"- Players: {player_count}")
            
            cur.close()
            conn.close()
    else:
        print("\n✗ Some data failed to load")

if __name__ == "__main__":
    main()