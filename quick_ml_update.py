import pandas as pd
import psycopg2
import os
from updated_ml_processor import UpdatedMLProcessor
from psycopg2.extras import execute_values

def update_sample_players():
    """Update ML results for a sample of players to test the new system"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL environment variable not found")
        return
    
    try:
        conn = psycopg2.connect(database_url)
        
        # Get a sample of players with existing compatibility data
        query = """
        SELECT DISTINCT p.player_id, p.name, p.position, p.sub_position, p.ovr,
            p.pac, p.sho, p.pas, p.dri, p.def, p.phy,
            p.acceleration, p.sprint_speed, p.positioning, p.finishing, p.shot_power,
            p.long_shots, p.volleys, p.penalties, p.vision, p.crossing,
            p.free_kick_accuracy, p.short_passing, p.long_passing, p.curve,
            p.dribbling, p.agility, p.balance, p.reactions, p.ball_control, p.composure,
            p.interceptions, p.heading_accuracy, p.def_awareness, p.standing_tackle,
            p.sliding_tackle, p.jumping, p.stamina, p.strength, p.aggression,
            p.date_of_birth, p.height_in_cm, p.foot
        FROM players p
        INNER JOIN position_compatibility pc ON p.player_id = pc.player_id 
        WHERE p.sub_position IS NOT NULL AND p.ovr IS NOT NULL
        LIMIT 100
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        print(f"Processing {len(df)} sample players with updated ML methodology...")
        
        # Initialize ML processor
        processor = UpdatedMLProcessor()
        
        # Convert to list of dictionaries
        players_data = df.to_dict('records')
        
        # Process players
        results = processor.predict_bulk_compatibility(players_data)
        
        # Update database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Prepare data for update
        data_to_update = []
        for result in results:
            data_to_update.append((
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
        
        # Update existing records
        update_query = """
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
        
        execute_values(cursor, update_query, data_to_update)
        
        # Commit and close
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"Successfully updated {len(data_to_update)} players with new ML methodology")
        
        # Show some sample results
        print("\nSample updated results:")
        for i, result in enumerate(results[:5]):
            print(f"\n{result['player_id']}: {result['natural_pos']} -> Best: {result['best_pos']} ({result['best_fit_score']:.1f}%)")
            print(f"  ST: {result['st_fit']:.1f}% | LW: {result['lw_fit']:.1f}% | RW: {result['rw_fit']:.1f}%")
            print(f"  CAM: {result['cam_fit']:.1f}% | CM: {result['cm_fit']:.1f}% | CDM: {result['cdm_fit']:.1f}%")
            print(f"  LB: {result['lb_fit']:.1f}% | RB: {result['rb_fit']:.1f}% | CB: {result['cb_fit']:.1f}%")
        
    except Exception as e:
        print(f"Error updating sample players: {e}")

if __name__ == "__main__":
    update_sample_players()