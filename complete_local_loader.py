#!/usr/bin/env python3
"""
Complete Local Database Loader for REPOSITION Database
====================================================

Loads all data files with correct schema mapping:
- competitions.csv -> competitions table  
- clubs.csv -> clubs table
- players.csv -> players table
- results.csv -> position_compatibility table

Note: Users are not loaded from CSV as they register through the web application.
The users table is managed dynamically by the authentication system.

Database: reposition_db on localhost
User: reposition_user
Password: 1234
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime
import sys

# Local PostgreSQL configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'reposition_db',
    'user': 'reposition_user',
    'password': '1234'
}

def connect_db():
    """Connect to local PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
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



def load_competitions(conn):
    """Load competitions data from competitions.csv"""
    csv_file = 'attached_assets/competitions.csv'
    if not os.path.exists(csv_file):
        print("✗ competitions.csv not found!")
        return False
    
    try:
        df = pd.read_csv(csv_file)
        cur = conn.cursor()
        
        # Clear existing competitions
        cur.execute("DELETE FROM competitions")
        
        competitions_data = []
        for _, row in df.iterrows():
            competitions_data.append((
                safe_str(row.get('competition_id')),     # competition_id
                safe_str(row.get('competition_code')),   # competition_code
                safe_str(row.get('name')),               # name
                safe_str(row.get('sub_type')),           # sub_type
                safe_str(row.get('type')),               # type
                safe_int(row.get('country_id')),         # country_id
                safe_str(row.get('country_name')),       # country_name
                safe_str(row.get('domestic_league_code')), # domestic_league_code
                safe_str(row.get('confederation')),      # confederation
                safe_str(row.get('url')),                # url
                safe_str(row.get('is_major_national_league')) # is_major_national_league
            ))
        
        # Insert competitions
        execute_values(
            cur,
            """INSERT INTO competitions (
                competition_id, competition_code, name, sub_type, type, country_id, 
                country_name, domestic_league_code, confederation, url, is_major_national_league
            ) VALUES %s""",
            competitions_data
        )
        
        conn.commit()
        cur.close()
        
        print(f"✅ Competitions loaded successfully ({len(competitions_data)} records)")
        return True
        
    except Exception as e:
        print(f"✗ Error loading competitions: {e}")
        return False

def load_clubs(conn):
    """Load clubs data from clubs.csv"""
    csv_file = 'attached_assets/clubs.csv'
    if not os.path.exists(csv_file):
        print("✗ clubs.csv not found!")
        return False
    
    try:
        df = pd.read_csv(csv_file)
        cur = conn.cursor()
        
        # Clear existing clubs
        cur.execute("DELETE FROM clubs")
        
        clubs_data = []
        for _, row in df.iterrows():
            clubs_data.append((
                safe_int(row.get('club_id')),            # club_id
                safe_str(row.get('club_code')),          # club_code
                safe_str(row.get('name')),               # name
                safe_str(row.get('domestic_competition_id')), # domestic_competition_id
                safe_int(row.get('total_market_value')), # total_market_value
                safe_int(row.get('squad_size')),         # squad_size
                safe_float(row.get('average_age')),      # average_age
                safe_int(row.get('foreigners_number')),  # foreigners_number
                safe_float(row.get('foreigners_percentage')), # foreigners_percentage
                safe_int(row.get('national_team_players')), # national_team_players
                safe_str(row.get('stadium_name')),       # stadium_name
                safe_int(row.get('stadium_seats')),      # stadium_seats
                safe_str(row.get('net_transfer_record')), # net_transfer_record
                safe_str(row.get('coach_name')),         # coach_name
                safe_int(row.get('last_season'))         # last_season
            ))
        
        # Insert clubs
        execute_values(
            cur,
            """INSERT INTO clubs (
                club_id, club_code, name, domestic_competition_id, total_market_value, 
                squad_size, average_age, foreigners_number, foreigners_percentage, 
                national_team_players, stadium_name, stadium_seats, net_transfer_record, 
                coach_name, last_season
            ) VALUES %s""",
            clubs_data
        )
        
        conn.commit()
        cur.close()
        
        print(f"✅ Clubs loaded successfully ({len(clubs_data)} records)")
        return True
        
    except Exception as e:
        print(f"✗ Error loading clubs: {e}")
        return False

def load_players(conn):
    """Load players data from players.csv"""
    csv_file = 'attached_assets/players.csv'
    if not os.path.exists(csv_file):
        print("✗ players.csv not found!")
        return False
    
    try:
        df = pd.read_csv(csv_file)
        cur = conn.cursor()
        
        # Clear existing players
        cur.execute("DELETE FROM players")
        
        players_data = []
        processed = 0
        
        for _, row in df.iterrows():
            try:
                # Essential validation
                player_id = safe_int(row.get('player_id'))
                name = safe_str(row.get('name'))
                
                if not player_id or not name:
                    continue
                
                # Build complete player record matching schema exactly
                player_record = (
                    player_id,                                    # player_id
                    name,                                         # name
                    safe_str(row.get('country_of_citizenship')),  # country_of_citizenship
                    safe_str(row.get('date_of_birth')),          # date_of_birth
                    safe_str(row.get('sub_position')),           # sub_position
                    safe_str(row.get('position')),               # position
                    safe_str(row.get('foot')),                   # foot
                    safe_int(row.get('height_in_cm')),           # height_in_cm
                    safe_str(row.get('current_club_name')),      # current_club_name
                    safe_int(row.get('market_value_in_eur')),    # market_value_in_eur
                    safe_int(row.get('highest_market_value_in_eur')), # highest_market_value_in_eur
                    safe_int(row.get('club_id')),                # club_id
                    safe_int(row.get('ovr')),                    # ovr
                    safe_int(row.get('pac')),                    # pac
                    safe_int(row.get('sho')),                    # sho
                    safe_int(row.get('pas')),                    # pas
                    safe_int(row.get('dri')),                    # dri
                    safe_int(row.get('def')),                    # def
                    safe_int(row.get('phy')),                    # phy
                    safe_int(row.get('acceleration')),           # acceleration
                    safe_int(row.get('sprint_speed')),           # sprint_speed
                    safe_int(row.get('positioning')),            # positioning
                    safe_int(row.get('finishing')),              # finishing
                    safe_int(row.get('shot_power')),             # shot_power
                    safe_int(row.get('long_shots')),             # long_shots
                    safe_int(row.get('volleys')),                # volleys
                    safe_int(row.get('penalties')),              # penalties
                    safe_int(row.get('vision')),                 # vision
                    safe_int(row.get('crossing')),               # crossing
                    safe_int(row.get('free_kick_accuracy')),     # free_kick_accuracy
                    safe_int(row.get('short_passing')),          # short_passing
                    safe_int(row.get('long_passing')),           # long_passing
                    safe_int(row.get('curve')),                  # curve
                    safe_int(row.get('dribbling')),              # dribbling
                    safe_int(row.get('agility')),                # agility
                    safe_int(row.get('balance')),                # balance
                    safe_int(row.get('reactions')),              # reactions
                    safe_int(row.get('ball_control')),           # ball_control
                    safe_int(row.get('composure')),              # composure
                    safe_int(row.get('interceptions')),          # interceptions
                    safe_int(row.get('heading_accuracy')),       # heading_accuracy
                    safe_int(row.get('def_awareness')),          # def_awareness
                    safe_int(row.get('standing_tackle')),        # standing_tackle
                    safe_int(row.get('sliding_tackle')),         # sliding_tackle
                    safe_int(row.get('jumping')),                # jumping
                    safe_int(row.get('stamina')),                # stamina
                    safe_int(row.get('strength')),               # strength
                    safe_int(row.get('aggression')),             # aggression
                    safe_int(row.get('weak_foot')),              # weak_foot
                    safe_int(row.get('skill_moves')),            # skill_moves
                    safe_str(row.get('preferred_foot')),         # preferred_foot
                    safe_str(row.get('league')),                 # league
                    safe_str(row.get('team')),                   # team
                    safe_float(row.get('weight_in_kg')),         # weight_in_kg
                    safe_int(row.get('age')) or compute_age(row.get('date_of_birth')), # age
                    safe_str(row.get('image_url')),              # image_url
                    safe_str(row.get('created_at')) or datetime.now().isoformat() # created_at
                )
                
                players_data.append(player_record)
                processed += 1
                
                if processed % 500 == 0:
                    pass  # Silent progress tracking
                    
            except Exception as e:
                continue  # Silent error handling
        
        # Bulk insert in batches
        batch_size = 500
        inserted_total = 0
        
        for i in range(0, len(players_data), batch_size):
            batch = players_data[i:i + batch_size]
            
            execute_values(
                cur,
                """INSERT INTO players (
                    player_id, name, country_of_citizenship, date_of_birth, sub_position, position,
                    foot, height_in_cm, current_club_name, market_value_in_eur, highest_market_value_in_eur,
                    club_id, ovr, pac, sho, pas, dri, def, phy, acceleration, sprint_speed,
                    positioning, finishing, shot_power, long_shots, volleys, penalties, vision,
                    crossing, free_kick_accuracy, short_passing, long_passing, curve, dribbling,
                    agility, balance, reactions, ball_control, composure, interceptions,
                    heading_accuracy, def_awareness, standing_tackle, sliding_tackle, jumping,
                    stamina, strength, aggression, weak_foot, skill_moves, preferred_foot,
                    league, team, weight_in_kg, age, image_url, created_at
                ) VALUES %s""",
                batch
            )
            
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
        script_path = os.path.join(os.path.dirname(__file__), 'models', 'predict_player_positions.py')
        
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