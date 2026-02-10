#!/usr/bin/env python3
"""
Complete Local Database Loader for REPOSITION Database
====================================================

Loads all data files with correct schema mapping:
- competitions.csv -> competitions table
- clubs.csv -> clubs table
- players.csv -> players table
- results.csv -> position_compatibility table

Connection: set DATABASE_URL in env, or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (see .env.example).
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime
import sys


def _get_db_config():
    """Build DB config from env (no hardcoded credentials)."""
    dsn = os.environ.get('DATABASE_URL')
    if dsn:
        return None, dsn
    pw = os.environ.get('DB_PASSWORD') or os.environ.get('DB_PASS')
    if not pw:
        raise SystemExit('Set DATABASE_URL or DB_PASSWORD (and DB_HOST, DB_USER, DB_NAME) in .env')
    return {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': int(os.environ.get('DB_PORT', '5432')),
        'database': os.environ.get('DB_NAME', 'reposition_db'),
        'user': os.environ.get('DB_USER', 'reposition_user'),
        'password': pw,
    }, None


def connect_db():
    """Connect to PostgreSQL using DATABASE_URL or DB_* env vars."""
    try:
        config, dsn = _get_db_config()
        if dsn:
            conn = psycopg2.connect(dsn)
        else:
            conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)

def safe_int(val):
    """Safely convert to int"""
    if pd.isna(val) or val == '' or val == 'null':
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None

def safe_float(val):
    """Safely convert to float"""
    if pd.isna(val) or val == '' or val == 'null':
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def safe_str(val):
    """Safely convert to string"""
    if pd.isna(val) or val == '' or val == 'null' or val is None:
        return None
    return str(val).strip() if str(val).strip() else None

def compute_age(dob_str):
    """Compute age from date of birth"""
    if not dob_str or pd.isna(dob_str):
        return None
    try:
        if '/' in str(dob_str):
            date_part = str(dob_str).split(' ')[0]
            month, day, year = date_part.split('/')
            birth_date = datetime(int(year), int(month), int(day))
        else:
            birth_date = pd.to_datetime(dob_str)
        
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age if 15 <= age <= 50 else None
    except:
        return None



def _build_rows(df: pd.DataFrame, mapping: list[tuple[str, str, callable]]):
    """Create ordered list of tuples according to mapping.
    mapping: list of (db_column, csv_column, converter). Converter can accept (value) or (value, row).
    """
    rows: list[tuple] = []
    for _, row in df.iterrows():
        built = []
        for db_col, src_col, conv in mapping:
            val = row.get(src_col)
            try:
                built.append(conv(val, row))
            except TypeError:
                built.append(conv(val))
        rows.append(tuple(built))
    return rows

def _load_csv_with_mapping(conn, csv_file: str, table: str, mapping: list[tuple[str, str, callable]]) -> bool:
    """Generic CSV -> table loader using a simple mapping configuration."""
    if not os.path.exists(csv_file):
        print(f"✗ {os.path.basename(csv_file)} not found!")
        return False

    try:
        df = pd.read_csv(csv_file)
        cur = conn.cursor()

        # Clear existing table for idempotent run
        cur.execute(f"DELETE FROM {table}")

        columns = ", ".join(db_col for db_col, _, _ in mapping)
        rows = _build_rows(df, mapping)

        if not rows:
            print(f"⚠️  No rows to insert for {table}")
            cur.close()
            return True

        execute_values(
            cur,
            f"INSERT INTO {table} ({columns}) VALUES %s",
            rows
        )

        conn.commit()
        cur.close()
        print(f"✅ {table.capitalize()} loaded successfully ({len(rows)} records)")
        return True
    except Exception as e:
        print(f"✗ Error loading {table}: {e}")
        return False

def load_competitions(conn):
    """Load competitions data from competitions.csv (generic loader)."""
    mapping = [
        ("competition_id", "competition_id", safe_str),
        ("competition_code", "competition_code", safe_str),
        ("name", "name", safe_str),
        ("sub_type", "sub_type", safe_str),
        ("type", "type", safe_str),
        ("country_id", "country_id", safe_int),
        ("country_name", "country_name", safe_str),
        ("domestic_league_code", "domestic_league_code", safe_str),
        ("confederation", "confederation", safe_str),
        ("url", "url", safe_str),
        ("is_major_national_league", "is_major_national_league", safe_str),
    ]
    return _load_csv_with_mapping(conn, 'data/competitions.csv', 'competitions', mapping)

def load_clubs(conn):
    """Load clubs data from clubs.csv (generic loader)."""
    mapping = [
        ("club_id", "club_id", safe_int),
        ("club_code", "club_code", safe_str),
        ("name", "name", safe_str),
        ("domestic_competition_id", "domestic_competition_id", safe_str),
        ("total_market_value", "total_market_value", safe_int),
        ("squad_size", "squad_size", safe_int),
        ("average_age", "average_age", safe_float),
        ("foreigners_number", "foreigners_number", safe_int),
        ("foreigners_percentage", "foreigners_percentage", safe_float),
        ("national_team_players", "national_team_players", safe_int),
        ("stadium_name", "stadium_name", safe_str),
        ("stadium_seats", "stadium_seats", safe_int),
        ("net_transfer_record", "net_transfer_record", safe_str),
        ("coach_name", "coach_name", safe_str),
        ("last_season", "last_season", safe_int),
    ]
    return _load_csv_with_mapping(conn, 'data/clubs.csv', 'clubs', mapping)

def load_players(conn):
    """Load players data from players.csv (generic loader with mapping)."""
    # Special converters that may depend on the whole row
    age_conv = lambda v, r: safe_int(v) or compute_age(r.get('date_of_birth'))
    created_at_conv = lambda v, r: safe_str(v) or datetime.now().isoformat()

    mapping = [
        ("player_id", "player_id", safe_int),
        ("name", "name", safe_str),
        ("country_of_citizenship", "country_of_citizenship", safe_str),
        ("date_of_birth", "date_of_birth", safe_str),
        ("sub_position", "sub_position", safe_str),
        ("position", "position", safe_str),
        ("foot", "foot", safe_str),
        ("height_in_cm", "height_in_cm", safe_int),
        ("current_club_name", "current_club_name", safe_str),
        ("market_value_in_eur", "market_value_in_eur", safe_int),
        ("highest_market_value_in_eur", "highest_market_value_in_eur", safe_int),
        ("club_id", "club_id", safe_int),
        ("ovr", "ovr", safe_int),
        ("pac", "pac", safe_int),
        ("sho", "sho", safe_int),
        ("pas", "pas", safe_int),
        ("dri", "dri", safe_int),
        ("def", "def", safe_int),
        ("phy", "phy", safe_int),
        ("acceleration", "acceleration", safe_int),
        ("sprint_speed", "sprint_speed", safe_int),
        ("positioning", "positioning", safe_int),
        ("finishing", "finishing", safe_int),
        ("shot_power", "shot_power", safe_int),
        ("long_shots", "long_shots", safe_int),
        ("volleys", "volleys", safe_int),
        ("penalties", "penalties", safe_int),
        ("vision", "vision", safe_int),
        ("crossing", "crossing", safe_int),
        ("free_kick_accuracy", "free_kick_accuracy", safe_int),
        ("short_passing", "short_passing", safe_int),
        ("long_passing", "long_passing", safe_int),
        ("curve", "curve", safe_int),
        ("dribbling", "dribbling", safe_int),
        ("agility", "agility", safe_int),
        ("balance", "balance", safe_int),
        ("reactions", "reactions", safe_int),
        ("ball_control", "ball_control", safe_int),
        ("composure", "composure", safe_int),
        ("interceptions", "interceptions", safe_int),
        ("heading_accuracy", "heading_accuracy", safe_int),
        ("def_awareness", "def_awareness", safe_int),
        ("standing_tackle", "standing_tackle", safe_int),
        ("sliding_tackle", "sliding_tackle", safe_int),
        ("jumping", "jumping", safe_int),
        ("stamina", "stamina", safe_int),
        ("strength", "strength", safe_int),
        ("aggression", "aggression", safe_int),
        ("weak_foot", "weak_foot", safe_int),
        ("skill_moves", "skill_moves", safe_int),
        ("preferred_foot", "preferred_foot", safe_str),
        ("league", "league", safe_str),
        ("team", "team", safe_str),
        ("weight_in_kg", "weight_in_kg", safe_float),
        ("age", "age", age_conv),
        ("image_url", "image_url", safe_str),
        ("created_at", "created_at", created_at_conv),
    ]

    # Perform minimal validation by filtering out rows without minimal fields inside the generic path
    csv_file = 'data/players.csv'
    if not os.path.exists(csv_file):
        print("✗ players.csv not found!")
        return False

    try:
        df = pd.read_csv(csv_file)
        # Keep only rows with required fields
        df = df[(df.get('player_id').notna()) & (df.get('name').notna())]

        cur = conn.cursor()
        cur.execute("DELETE FROM players")

        columns = ", ".join(db for db, _, _ in mapping)
        rows = _build_rows(df, mapping)
        if not rows:
            print("⚠️  No rows to insert for players")
            cur.close()
            return True

        # Insert in batches for large files
        batch_size = 500
        inserted_total = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            execute_values(cur, f"INSERT INTO players ({columns}) VALUES %s", batch)
            inserted_total += len(batch)

        conn.commit()
        cur.close()
        print(f"✅ Players loaded successfully ({inserted_total} records)")
        return True
    except Exception as e:
        print(f"✗ Error loading players: {e}")
        return False

def load_position_compatibility(conn):
    """Calculate and load position compatibility data using ML models"""
    import subprocess
    import sys
    
    try:
        # Get the path to the predict_player_positions.py script
        script_path = os.path.join(os.path.dirname(__file__), 'predict_player_positions.py')
        
        if not os.path.exists(script_path):
            print("✗ predict_player_positions.py not found!")
            return False
        
        print("Calculating position compatibility using ML models...")
        
        # Run the Python script
        result = subprocess.run([
            sys.executable,  # Use the same Python interpreter
            script_path
        ], capture_output=True, text=True, cwd=os.path.dirname(script_path))
        
        if result.returncode != 0:
            print(f"✗ Error running ML script: {result.stderr}")
            return False
        
        # Check if the script was successful
        if "OK - combo results also loaded to DB table 'position_compatibility'" in result.stdout:
            # Count the records that were inserted
            cur = conn.cursor()
            
            try:
                cur.execute("SELECT COUNT(*) FROM position_compatibility")
                count = cur.fetchone()[0]
                print(f"✅ Position compatibility calculated and loaded successfully ({count} records)")
            except Exception as e:
                print(f"⚠️  Position compatibility calculated but couldn't verify count: {e}")
            finally:
                cur.close()
            
            return True
        else:
            print("✗ ML script didn't complete successfully")
            return False
        
    except Exception as e:
        print(f"✗ Error calculating position compatibility: {e}")
        return False

def show_final_summary(conn):
    """Show comprehensive database summary"""
    cur = conn.cursor()
    
    try:
        # Count all main tables (excluding users as they register through the app)
        tables_info = [
            ('competitions', 'Competitions'),
            ('clubs', 'Clubs'),
            ('players', 'Players'),
            ('position_compatibility', 'Position Compatibility')
        ]
        
        total_records = 0
        
        for table, description in tables_info:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                total_records += count
                print(f"  • {description}: {count:,} records")
            except Exception as e:
                pass
        
        print(f"✅ Database loaded successfully - {total_records:,} total records")
        
    except Exception as e:
        print(f"Error generating summary: {e}")
    
    cur.close()

def main():
    """Main execution function"""
    print("Loading database...")
    
    # Connect to database once
    conn = connect_db()
    print(f"OK - Connected to {DB_CONFIG['database']} on {DB_CONFIG['host']}")
    
    try:
        # Execute loading sequence (removed Users as they register through the app)
        steps = [
            ("Competitions", load_competitions),
            ("Clubs", load_clubs),
            ("Players", load_players),
            ("Position Compatibility", load_position_compatibility)
        ]
        
        success_count = 0
        
        for step_name, step_function in steps:
            if step_function(conn):
                success_count += 1
            else:
                print(f"❌ FAILED: {step_name} loading failed!")
                return
        
        # Final results
        if success_count == len(steps):
            show_final_summary(conn)
        else:
            print(f"⚠️  PARTIAL SUCCESS: {success_count}/{len(steps)} steps completed")
    
    finally:
        conn.close()
        print("Database connection closed")

if __name__ == "__main__":
    main()