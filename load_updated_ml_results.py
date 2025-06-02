import pandas as pd
import psycopg2
import os
from updated_ml_processor import UpdatedMLProcessor
from psycopg2.extras import execute_values

def load_players_from_db():
    """Load player data from the database"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL environment variable not found")
        return None
    
    try:
        conn = psycopg2.connect(database_url)
        
        # Query to get all players with their technical attributes
        query = """
        SELECT 
            player_id, name, position, sub_position, ovr,
            pac, sho, pas, dri, def, phy,
            acceleration, sprint_speed, positioning, finishing, shot_power,
            long_shots, volleys, penalties, vision, crossing,
            free_kick_accuracy, short_passing, long_passing, curve,
            dribbling, agility, balance, reactions, ball_control, composure,
            interceptions, heading_accuracy, def_awareness, standing_tackle,
            sliding_tackle, jumping, stamina, strength, aggression,
            date_of_birth, height_in_cm, foot
        FROM players 
        WHERE sub_position IS NOT NULL 
        AND ovr IS NOT NULL
        ORDER BY player_id
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        print(f"Loaded {len(df)} players from database")
        return df
        
    except Exception as e:
        print(f"Error loading data from database: {e}")
        return None

def process_and_load_ml_results():
    """Process ML results and load them to the database"""
    # Load players from database
    players_df = load_players_from_db()
    if players_df is None:
        return
    
    # Initialize ML processor
    processor = UpdatedMLProcessor()
    
    # Convert DataFrame to list of dictionaries
    players_data = players_df.to_dict('records')
    
    print("Calculating position compatibility for all players...")
    
    # Process in batches to avoid memory issues
    batch_size = 100
    all_results = []
    
    for i in range(0, len(players_data), batch_size):
        batch = players_data[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(players_data) + batch_size - 1)//batch_size}")
        
        batch_results = processor.predict_bulk_compatibility(batch)
        all_results.extend(batch_results)
    
    # Save to database
    database_url = os.getenv('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    # Prepare data for insertion
    data_to_insert = []
    for result in all_results:
        data_to_insert.append((
            result['player_id'],
            result['natural_pos'],
            round(result['st_fit'], 2),
            round(result['lw_fit'], 2),
            round(result['rw_fit'], 2),
            round(result['cm_fit'], 2),
            round(result['cdm_fit'], 2),
            round(result['cam_fit'], 2),
            round(result['lb_fit'], 2),
            round(result['rb_fit'], 2),
            round(result['cb_fit'], 2),
            result['best_pos'],
            round(result['best_fit_score'], 2),
            round(result['best_fit_pct'], 2),
            result['ovr']
        ))
    
    # Insert data with conflict resolution
    insert_query = """
        INSERT INTO position_compatibility 
        (player_id, natural_pos, st_fit, lw_fit, rw_fit, cm_fit, cdm_fit, cam_fit, 
         lb_fit, rb_fit, cb_fit, best_pos, best_fit_score, best_fit_pct, ovr)
        VALUES %s
        ON CONFLICT (player_id) DO UPDATE SET
            natural_pos = EXCLUDED.natural_pos,
            st_fit = EXCLUDED.st_fit,
            lw_fit = EXCLUDED.lw_fit,
            rw_fit = EXCLUDED.rw_fit,
            cm_fit = EXCLUDED.cm_fit,
            cdm_fit = EXCLUDED.cdm_fit,
            cam_fit = EXCLUDED.cam_fit,
            lb_fit = EXCLUDED.lb_fit,
            rb_fit = EXCLUDED.rb_fit,
            cb_fit = EXCLUDED.cb_fit,
            best_pos = EXCLUDED.best_pos,
            best_fit_score = EXCLUDED.best_fit_score,
            best_fit_pct = EXCLUDED.best_fit_pct,
            ovr = EXCLUDED.ovr
    """
    
    execute_values(cursor, insert_query, data_to_insert)
    
    # Commit and close
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Successfully processed and loaded {len(data_to_insert)} position compatibility records to database")

if __name__ == "__main__":
    process_and_load_ml_results()