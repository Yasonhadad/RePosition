#!/usr/bin/env python3
"""
Load CSV data into local PostgreSQL database - Fixed for schema
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
        df = pd.read_csv('attached_assets/competitions_1749456052016.csv')
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
            comp_id = str(row['competition_id']) if pd.notna(row['competition_id']) else None
            if comp_id and comp_id.isdigit():
                competitions_data.append((
                    comp_id,
                    str(row['competition_name']) if pd.notna(row['competition_name']) else None,
                    str(row['country_name']) if pd.notna(row['country_name']) else None
                ))
        
        # Insert data
        execute_values(
            cur,
            """INSERT INTO competitions (competition_id, name, country_name) 
               VALUES %s ON CONFLICT (competition_id) DO NOTHING""",
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
        df = pd.read_csv('attached_assets/clubs_1749456052018.csv')
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
            """INSERT INTO clubs (club_id, name, competition_id) 
               VALUES %s ON CONFLICT (club_id) DO NOTHING""",
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
    """Load players data according to actual schema"""
    print("Loading players...")
    try:
        # Use the updated players dataset
        df = pd.read_csv('attached_assets/players_1749456052013.csv')
        print(f"Using updated dataset with {len(df)} players")
        
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
                
                # Extract fields according to schema
                age = compute_age(row.get('date_of_birth')) or safe_int(row.get('age'))
                height_in_cm = safe_int(row.get('height_cm') or row.get('height_in_cm'))
                weight_in_kg = extract_weight(row.get('weight')) or safe_float(row.get('weight_kg') or row.get('weight_in_kg'))
                foot = safe_str(row.get('foot') or row.get('preferred_foot'))
                club_id = safe_int(row.get('club_id'))
                position = safe_str(row.get('position') or row.get('primary_position'))
                date_of_birth = safe_str(row.get('date_of_birth'))
                country_of_citizenship = safe_str(row.get('country_of_citizenship') or row.get('nationality'))
                
                # Stats according to schema
                ovr = safe_int(row.get('overall_rating') or row.get('overall') or row.get('ovr'))
                pac = safe_int(row.get('pace') or row.get('pac'))
                sho = safe_int(row.get('shooting') or row.get('sho'))
                pas = safe_int(row.get('passing') or row.get('pas'))
                dri = safe_int(row.get('dribbling') or row.get('dri'))
                def_ = safe_int(row.get('defending') or row.get('def'))
                phy = safe_int(row.get('physic') or row.get('phy'))
                
                players_data.append((
                    player_id, name, country_of_citizenship, date_of_birth, 
                    position, foot, height_in_cm, club_id, ovr,
                    pac, sho, pas, dri, def_, phy, weight_in_kg, age
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
                    player_id, name, country_of_citizenship, date_of_birth,
                    position, foot, height_in_cm, club_id, ovr,
                    pac, sho, pas, dri, def, phy, weight_in_kg, age
                ) VALUES %s ON CONFLICT (player_id) DO NOTHING""",
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

def load_users():
    """Load users data"""
    print("Loading users...")
    try:
        df = pd.read_csv('attached_assets/users_1749456052020.csv')
        print(f"Found {len(df)} users")
        
        conn = connect_db()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        # Clear existing data (keep admin user if exists)
        cur.execute("DELETE FROM users WHERE id > 1")
        
        # Prepare data
        users_data = []
        for _, row in df.iterrows():
            users_data.append((
                safe_int(row['id']),
                safe_str(row['email']),
                safe_str(row['password']),
                safe_str(row['first_name']),
                safe_str(row['last_name'])
            ))
        
        # Insert data
        execute_values(
            cur,
            """INSERT INTO users (id, email, password, first_name, last_name) 
               VALUES %s ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               password = EXCLUDED.password,
               first_name = EXCLUDED.first_name,
               last_name = EXCLUDED.last_name""",
            users_data
        )
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✓ Loaded {len(users_data)} users")
        return True
        
    except Exception as e:
        print(f"Error loading users: {e}")
        return False

def load_position_compatibility():
    """Load position compatibility results"""
    print("Loading position compatibility results...")
    try:
        df = pd.read_csv('attached_assets/results_1749456111247.csv')
        print(f"Found {len(df)} compatibility records")
        
        conn = connect_db()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        # Clear existing data
        cur.execute("DELETE FROM position_compatibility")
        
        # Prepare data
        compatibility_data = []
        processed = 0
        
        for _, row in df.iterrows():
            try:
                player_id = safe_int(row['player_id'])
                if not player_id:
                    continue
                
                # Create compatibility scores object
                compatibility_scores = {
                    'ST': safe_float(row['ST_combo']),
                    'LW': safe_float(row['LW_combo']),
                    'RW': safe_float(row['RW_combo']),
                    'CM': safe_float(row['CM_combo']),
                    'CDM': safe_float(row['CDM_combo']),
                    'CAM': safe_float(row['CAM_combo']),
                    'LB': safe_float(row['LB_combo']),
                    'RB': safe_float(row['RB_combo']),
                    'CB': safe_float(row['CB_combo'])
                }
                
                compatibility_data.append((
                    player_id,
                    safe_str(row['natural_pos']),
                    safe_str(row['best_combo_pos']),
                    safe_float(row['best_combo_score']),
                    str(compatibility_scores).replace("'", '"')  # Convert to JSON string
                ))
                
                processed += 1
                if processed % 500 == 0:
                    print(f"Processed {processed} compatibility records...")
                    
            except Exception as e:
                print(f"Error processing compatibility for player {row.get('player_id', 'unknown')}: {e}")
                continue
        
        print(f"Prepared {len(compatibility_data)} compatibility records for insertion")
        
        # Insert data in batches
        batch_size = 500
        for i in range(0, len(compatibility_data), batch_size):
            batch = compatibility_data[i:i + batch_size]
            
            execute_values(
                cur,
                """INSERT INTO position_compatibility (
                    player_id, natural_position, best_position, best_score, compatibility_scores
                ) VALUES %s ON CONFLICT (player_id) DO UPDATE SET
                natural_position = EXCLUDED.natural_position,
                best_position = EXCLUDED.best_position,
                best_score = EXCLUDED.best_score,
                compatibility_scores = EXCLUDED.compatibility_scores""",
                batch
            )
            print(f"Inserted compatibility batch {i//batch_size + 1}")
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✓ Loaded {len(compatibility_data)} compatibility records")
        return True
        
    except Exception as e:
        print(f"Error loading position compatibility: {e}")
        return False

def main():
    """Main function to load all data"""
    print("=== Loading Data to Local Database (Fixed Schema) ===")
    print(f"Database: {DB_CONFIG['database']} on {DB_CONFIG['host']}")
    
    success = True
    
    # Load in order (competitions -> clubs -> users -> players -> compatibility)
    if not load_competitions():
        success = False
    
    if not load_clubs():
        success = False
        
    if not load_users():
        success = False
        
    if not load_players():
        success = False
        
    if not load_position_compatibility():
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