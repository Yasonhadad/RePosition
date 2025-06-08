#!/usr/bin/env python3
"""
Bulk load players using efficient batch processing
"""

import pandas as pd
import psycopg2
import os
from io import StringIO

def extract_weight(weight_str):
    """Extract weight in kg from string like '63kg / 139lb'"""
    if not weight_str or pd.isna(weight_str):
        return None
    try:
        import re
        match = re.search(r'(\d+(?:\.\d+)?)\s*kg', str(weight_str).lower())
        if match:
            return float(match.group(1))
    except:
        pass
    return None

def safe_int(val):
    """Safely convert to int"""
    if val is None or pd.isna(val):
        return None
    try:
        return int(float(val))
    except:
        return None

def safe_float(val):
    """Safely convert to float"""
    if val is None or pd.isna(val):
        return None
    try:
        return float(val)
    except:
        return None

def safe_str(val):
    """Safely convert to string"""
    if val is None or pd.isna(val):
        return None
    return str(val).strip() if str(val).strip() else None

def bulk_load_players():
    """Load players using bulk COPY operation"""
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return False
    
    try:
        # Load CSV
        csv_file = "attached_assets/players_joined_clean_1749399765857.csv"
        df = pd.read_csv(csv_file)
        print(f"טוען {len(df)} שחקנים...")
        
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Delete existing players to refresh data
        print("מוחק נתונים קיימים...")
        cursor.execute("DELETE FROM position_compatibility")
        cursor.execute("DELETE FROM players")
        
        # Prepare data for bulk insert
        print("מכין נתונים לטעינה...")
        processed_data = []
        
        for _, row in df.iterrows():
            player_id = safe_int(row['player_id'])
            if not player_id:
                continue
            
            # Process all fields
            processed_row = [
                player_id,
                safe_str(row['name']),
                safe_str(row['country_of_citizenship']),
                safe_str(row['date_of_birth']),
                safe_str(row['sub_position']),
                safe_str(row['position']),
                safe_str(row['foot']),
                safe_int(row['height_in_cm']),
                safe_str(row['current_club_name']),
                safe_int(row['current_club_id']),
                safe_int(row['market_value_in_eur']),
                safe_int(row['highest_market_value_in_eur']),
                safe_str(row['image_url']),
                safe_int(row['age']),
                extract_weight(row.get('Weight')),
                safe_int(row['OVR']),
                safe_int(row['PAC']),
                safe_int(row['SHO']),
                safe_int(row['PAS']),
                safe_int(row['DRI']),
                safe_int(row['DEF']),
                safe_int(row['PHY']),
                safe_int(row['Acceleration']),
                safe_int(row['Sprint Speed']),
                safe_int(row['Positioning']),
                safe_int(row['Finishing']),
                safe_int(row['Shot Power']),
                safe_int(row['Long Shots']),
                safe_int(row['Volleys']),
                safe_int(row['Penalties']),
                safe_int(row['Vision']),
                safe_int(row['Crossing']),
                safe_int(row['Free Kick Accuracy']),
                safe_int(row['Short Passing']),
                safe_int(row['Long Passing']),
                safe_int(row['Curve']),
                safe_int(row['Dribbling']),
                safe_int(row['Agility']),
                safe_int(row['Balance']),
                safe_int(row['Reactions']),
                safe_int(row['Ball Control']),
                safe_int(row['Composure']),
                safe_int(row['Interceptions']),
                safe_int(row['Heading Accuracy']),
                safe_int(row['Def Awareness']),
                safe_int(row['Standing Tackle']),
                safe_int(row['Sliding Tackle']),
                safe_int(row['Jumping']),
                safe_int(row['Stamina']),
                safe_int(row['Strength']),
                safe_int(row['Aggression']),
                safe_int(row['Weak foot']),
                safe_int(row['Skill moves'])
            ]
            
            processed_data.append(processed_row)
        
        print(f"מבצע טעינה bulk של {len(processed_data)} שחקנים...")
        
        # Use COPY for bulk insert
        copy_sql = """
        COPY players (
            player_id, name, country_of_citizenship, date_of_birth, sub_position,
            position, foot, height_in_cm, current_club_name, club_id,
            market_value_in_eur, highest_market_value_in_eur, image_url, age, weight_in_kg,
            ovr, pac, sho, pas, dri, def, phy,
            acceleration, sprint_speed, positioning, finishing, shot_power,
            long_shots, volleys, penalties, vision, crossing, free_kick_accuracy,
            short_passing, long_passing, curve, dribbling, agility, balance,
            reactions, ball_control, composure, interceptions, heading_accuracy,
            def_awareness, standing_tackle, sliding_tackle, jumping, stamina,
            strength, aggression, weak_foot, skill_moves
        ) FROM STDIN WITH CSV NULL ''
        """
        
        # Create CSV buffer
        buffer = StringIO()
        for row in processed_data:
            clean_row = []
            for val in row:
                if val is None:
                    clean_row.append('')
                else:
                    # Escape quotes and handle special characters
                    val_str = str(val).replace('"', '""')
                    if ',' in val_str or '"' in val_str or '\n' in val_str:
                        clean_row.append(f'"{val_str}"')
                    else:
                        clean_row.append(val_str)
            buffer.write(','.join(clean_row) + '\n')
        
        buffer.seek(0)
        cursor.copy_expert(copy_sql, buffer)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✓ הושלמה הטעינה בהצלחה!")
        print(f"נטענו {len(processed_data)} שחקנים")
        
        return True
        
    except Exception as e:
        print(f"שגיאה: {e}")
        return False

if __name__ == "__main__":
    bulk_load_players()