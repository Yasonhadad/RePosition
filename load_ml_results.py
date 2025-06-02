import json
import os
import psycopg2
from psycopg2.extras import execute_values

def load_ml_results_to_db():
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL environment variable not found")
        return
    
    # Load the ML results
    with open('position_compatibility_results.json', 'r') as f:
        results = json.load(f)
    
    # Connect to database
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    # Prepare data for insertion
    data_to_insert = []
    for result in results:
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
    
    # Insert data
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
    
    print(f"Successfully loaded {len(data_to_insert)} position compatibility records to database")

if __name__ == "__main__":
    load_ml_results_to_db()