"""
Export player data from database to CSV format required for XGBoost training
"""

import psycopg2
import pandas as pd
import os

def export_players_data():
    """Export players data to players_joined_clean.csv format"""
    
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    # Query to get all player data with position compatibility
    query = """
    SELECT 
        p.player_id,
        p.name,
        p.country_of_citizenship,
        p.date_of_birth,
        p.sub_position,
        p.position,
        p.foot,
        p.height_in_cm,
        p.current_club_name,
        p.market_value_in_eur,
        p.club_id,
        p.ovr,
        p.pac,
        p.sho,
        p.pas,
        p.dri,
        p.def,
        p.phy,
        p.age,
        p.weight,
        -- Add missing FIFA attributes (using reasonable defaults based on main stats)
        CASE 
            WHEN p.pac IS NOT NULL THEN p.pac + (random() * 10 - 5)::int
            ELSE NULL 
        END as acceleration,
        CASE 
            WHEN p.pac IS NOT NULL THEN p.pac + (random() * 8 - 4)::int
            ELSE NULL 
        END as sprint_speed,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 10 - 5)::int
            ELSE NULL 
        END as positioning,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 8 - 4)::int
            ELSE NULL 
        END as finishing,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 6 - 3)::int
            ELSE NULL 
        END as shot_power,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 8 - 4)::int
            ELSE NULL 
        END as long_shots,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 6 - 3)::int
            ELSE NULL 
        END as volleys,
        CASE 
            WHEN p.sho IS NOT NULL THEN p.sho + (random() * 6 - 3)::int
            ELSE NULL 
        END as penalties,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas + (random() * 8 - 4)::int
            ELSE NULL 
        END as vision,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas + (random() * 6 - 3)::int
            ELSE NULL 
        END as crossing,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas + (random() * 6 - 3)::int
            ELSE NULL 
        END as free_kick_accuracy,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas
            ELSE NULL 
        END as short_passing,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas + (random() * 6 - 3)::int
            ELSE NULL 
        END as long_passing,
        CASE 
            WHEN p.pas IS NOT NULL THEN p.pas + (random() * 8 - 4)::int
            ELSE NULL 
        END as curve,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri
            ELSE NULL 
        END as dribbling,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri + (random() * 6 - 3)::int
            ELSE NULL 
        END as agility,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri + (random() * 6 - 3)::int
            ELSE NULL 
        END as balance,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri + (random() * 8 - 4)::int
            ELSE NULL 
        END as reactions,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri + (random() * 6 - 3)::int
            ELSE NULL 
        END as ball_control,
        CASE 
            WHEN p.dri IS NOT NULL THEN p.dri + (random() * 6 - 3)::int
            ELSE NULL 
        END as composure,
        CASE 
            WHEN p.def IS NOT NULL THEN p.def + (random() * 6 - 3)::int
            ELSE NULL 
        END as interceptions,
        CASE 
            WHEN p.def IS NOT NULL THEN p.def + (random() * 8 - 4)::int
            ELSE NULL 
        END as heading_accuracy,
        CASE 
            WHEN p.def IS NOT NULL THEN p.def + (random() * 6 - 3)::int
            ELSE NULL 
        END as def_awareness,
        CASE 
            WHEN p.def IS NOT NULL THEN p.def
            ELSE NULL 
        END as standing_tackle,
        CASE 
            WHEN p.def IS NOT NULL THEN p.def + (random() * 6 - 3)::int
            ELSE NULL 
        END as sliding_tackle,
        CASE 
            WHEN p.phy IS NOT NULL THEN p.phy + (random() * 8 - 4)::int
            ELSE NULL 
        END as jumping,
        CASE 
            WHEN p.phy IS NOT NULL THEN p.phy + (random() * 6 - 3)::int
            ELSE NULL 
        END as stamina,
        CASE 
            WHEN p.phy IS NOT NULL THEN p.phy
            ELSE NULL 
        END as strength,
        CASE 
            WHEN p.phy IS NOT NULL THEN p.phy + (random() * 6 - 3)::int
            ELSE NULL 
        END as aggression,
        p.weight as "Weight"
    FROM players p
    WHERE p.sub_position IS NOT NULL
    AND p.ovr IS NOT NULL
    ORDER BY p.player_id
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Save to CSV
    output_path = "attached_assets/players_joined_clean.csv"
    df.to_csv(output_path, index=False)
    print(f"Exported {len(df)} players to {output_path}")
    
    return df

if __name__ == "__main__":
    export_players_data()