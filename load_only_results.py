#!/usr/bin/env python3
"""
Load only position compatibility results
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Database connection parameters
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

if __name__ == "__main__":
    print("=== Loading Position Compatibility Results ===")
    if load_position_compatibility():
        print("✓ Position compatibility data loaded successfully!")
    else:
        print("✗ Failed to load position compatibility data")