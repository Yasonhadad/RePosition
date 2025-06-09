#!/usr/bin/env python3
"""
Load CSV data into local PostgreSQL database - Windows version
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime

# Database connection parameters for your local setup
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'reposition_db',
    'user': 'reposition_user',
    'password': '1234'
}

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
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
        
        # Prepare data according to your schema
        competitions_data = []
        for _, row in df.iterrows():
            competitions_data.append((
                safe_str(row['competition_id']),
                safe_str(row['name']),
                safe_str(row['country_name'])
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
        
        # Prepare data according to your schema
        clubs_data = []
        for _, row in df.iterrows():
            clubs_data.append((
                safe_int(row['club_id']),
                safe_str(row['name']),
                safe_str(row['domestic_competition_id'])
            ))
        
        # Insert data - using domestic_competition_id instead of competition_id
        execute_values(
            cur,
            """INSERT INTO clubs (club_id, name, domestic_competition_id) 
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

def load_players():
    """Load players data"""
    print("Loading players...")
    try:
        df = pd.read_csv('attached_assets/players_1749456052013.csv')
        print(f"Found {len(df)} players")
        
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
                
                name = safe_str(row.get('name'))
                if not name:
                    continue
                
                # Extract fields according to your schema
                age = compute_age(row.get('date_of_birth')) or safe_int(row.get('age'))
                height_in_cm = safe_int(row.get('height_in_cm'))
                weight_in_kg = extract_weight(row.get('weight')) or safe_float(row.get('weight_in_kg'))
                foot = safe_str(row.get('foot'))
                club_id = safe_int(row.get('club_id'))
                position = safe_str(row.get('position'))
                date_of_birth = safe_str(row.get('date_of_birth'))
                country_of_citizenship = safe_str(row.get('country_of_citizenship'))
                
                # Stats according to your schema
                ovr = safe_int(row.get('ovr'))
                pac = safe_int(row.get('pac'))
                sho = safe_int(row.get('sho'))
                pas = safe_int(row.get('pas'))
                dri = safe_int(row.get('dri'))
                def_ = safe_int(row.get('def'))
                phy = safe_int(row.get('phy'))
                
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
                
                compatibility_data.append((
                    player_id,
                    safe_str(row['natural_pos']),
                    safe_float(row['ST_combo']),
                    safe_float(row['LW_combo']),
                    safe_float(row['RW_combo']),
                    safe_float(row['CM_combo']),
                    safe_float(row['CDM_combo']),
                    safe_float(row['CAM_combo']),
                    safe_float(row['LB_combo']),
                    safe_float(row['RB_combo']),
                    safe_float(row['CB_combo']),
                    safe_str(row['best_combo_pos']),
                    safe_float(row['best_combo_score']),
                    safe_int(row['OVR'])
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
                    player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, 
                    cdm_fit, cam_fit, lb_fit, rb_fit, cb_fit, best_pos, 
                    best_fit_score, ovr
                ) VALUES %s""",
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
    print("=== Loading Data to Local Database (Windows) ===")
    print(f"Database: {DB_CONFIG['database']} on {DB_CONFIG['host']}")
    
    results = []
    
    # Load data in order
    results.append(load_competitions())
    results.append(load_clubs())
    results.append(load_users())
    results.append(load_players())
    results.append(load_position_compatibility())
    
    if all(results):
        print("\n✓ All data loaded successfully!")
    else:
        print("\n✗ Some data failed to load")

if __name__ == "__main__":
    main()