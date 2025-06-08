#!/usr/bin/env python3
"""
Update players table with new CSV data
"""

import pandas as pd
import psycopg2
import os
from datetime import datetime

def extract_weight(weight_str):
    """Extract weight in kg from string like '63kg / 139lb'"""
    if not weight_str or pd.isna(weight_str):
        return None
    try:
        # Extract number before 'kg'
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

def update_players_from_csv():
    """Update players table with new CSV data"""
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return False
    
    try:
        # Load CSV
        csv_file = "attached_assets/players_joined_clean_1749399765857.csv"
        df = pd.read_csv(csv_file)
        print(f"טוען {len(df)} שחקנים מהקובץ החדש...")
        
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get existing player IDs
        cursor.execute("SELECT player_id FROM players")
        existing_ids = set(row[0] for row in cursor.fetchall())
        
        updated_count = 0
        new_count = 0
        
        for _, row in df.iterrows():
            player_id = safe_int(row['player_id'])
            if not player_id:
                continue
            
            # Extract data
            name = safe_str(row['name'])
            country = safe_str(row['country_of_citizenship'])
            date_of_birth = safe_str(row['date_of_birth'])
            sub_position = safe_str(row['sub_position'])
            position = safe_str(row['position'])
            preferred_foot = safe_str(row['foot'])
            height_in_cm = safe_float(row['height_in_cm'])
            current_club_name = safe_str(row['current_club_name'])
            club_id = safe_int(row['current_club_id'])
            market_value_in_eur = safe_float(row['market_value_in_eur'])
            highest_market_value_in_eur = safe_float(row['highest_market_value_in_eur'])
            image_url = safe_str(row['image_url'])
            age = safe_int(row['age'])
            weight_in_kg = extract_weight(row.get('Weight'))
            
            # Main attributes
            ovr = safe_int(row['OVR'])
            pac = safe_int(row['PAC'])
            sho = safe_int(row['SHO'])
            pas = safe_int(row['PAS'])
            dri = safe_int(row['DRI'])
            def_attr = safe_int(row['DEF'])
            phy = safe_int(row['PHY'])
            
            # Detailed attributes
            acceleration = safe_int(row['Acceleration'])
            sprint_speed = safe_int(row['Sprint Speed'])
            positioning = safe_int(row['Positioning'])
            finishing = safe_int(row['Finishing'])
            shot_power = safe_int(row['Shot Power'])
            long_shots = safe_int(row['Long Shots'])
            volleys = safe_int(row['Volleys'])
            penalties = safe_int(row['Penalties'])
            vision = safe_int(row['Vision'])
            crossing = safe_int(row['Crossing'])
            free_kick_accuracy = safe_int(row['Free Kick Accuracy'])
            short_passing = safe_int(row['Short Passing'])
            long_passing = safe_int(row['Long Passing'])
            curve = safe_int(row['Curve'])
            dribbling = safe_int(row['Dribbling'])
            agility = safe_int(row['Agility'])
            balance = safe_int(row['Balance'])
            reactions = safe_int(row['Reactions'])
            ball_control = safe_int(row['Ball Control'])
            composure = safe_int(row['Composure'])
            interceptions = safe_int(row['Interceptions'])
            heading_accuracy = safe_int(row['Heading Accuracy'])
            def_awareness = safe_int(row['Def Awareness'])
            standing_tackle = safe_int(row['Standing Tackle'])
            sliding_tackle = safe_int(row['Sliding Tackle'])
            jumping = safe_int(row['Jumping'])
            stamina = safe_int(row['Stamina'])
            strength = safe_int(row['Strength'])
            aggression = safe_int(row['Aggression'])
            
            # Skills
            weak_foot = safe_int(row['Weak foot'])
            skill_moves = safe_int(row['Skill moves'])
            
            if player_id in existing_ids:
                # Update existing player
                cursor.execute("""
                    UPDATE players SET
                        name = %s,
                        country_of_citizenship = %s,
                        date_of_birth = %s,
                        sub_position = %s,
                        position = %s,
                        preferred_foot = %s,
                        height_in_cm = %s,
                        current_club_name = %s,
                        club_id = %s,
                        market_value_in_eur = %s,
                        highest_market_value_in_eur = %s,
                        image_url = %s,
                        age = %s,
                        weight_in_kg = %s,
                        ovr = %s,
                        pac = %s,
                        sho = %s,
                        pas = %s,
                        dri = %s,
                        def = %s,
                        phy = %s,
                        acceleration = %s,
                        sprint_speed = %s,
                        positioning = %s,
                        finishing = %s,
                        shot_power = %s,
                        long_shots = %s,
                        volleys = %s,
                        penalties = %s,
                        vision = %s,
                        crossing = %s,
                        free_kick_accuracy = %s,
                        short_passing = %s,
                        long_passing = %s,
                        curve = %s,
                        dribbling = %s,
                        agility = %s,
                        balance = %s,
                        reactions = %s,
                        ball_control = %s,
                        composure = %s,
                        interceptions = %s,
                        heading_accuracy = %s,
                        def_awareness = %s,
                        standing_tackle = %s,
                        sliding_tackle = %s,
                        jumping = %s,
                        stamina = %s,
                        strength = %s,
                        aggression = %s,
                        weak_foot = %s,
                        skill_moves = %s
                    WHERE player_id = %s
                """, (
                    name, country, date_of_birth, sub_position, position, preferred_foot,
                    height_in_cm, current_club_name, club_id, market_value_in_eur,
                    highest_market_value_in_eur, image_url, age, weight_in_kg,
                    ovr, pac, sho, pas, dri, def_attr, phy,
                    acceleration, sprint_speed, positioning, finishing, shot_power,
                    long_shots, volleys, penalties, vision, crossing, free_kick_accuracy,
                    short_passing, long_passing, curve, dribbling, agility, balance,
                    reactions, ball_control, composure, interceptions, heading_accuracy,
                    def_awareness, standing_tackle, sliding_tackle, jumping, stamina,
                    strength, aggression, weak_foot, skill_moves, player_id
                ))
                updated_count += 1
            else:
                # Insert new player
                cursor.execute("""
                    INSERT INTO players (
                        player_id, name, country_of_citizenship, date_of_birth, sub_position,
                        position, preferred_foot, height_in_cm, current_club_name, club_id,
                        market_value_in_eur, highest_market_value_in_eur, image_url, age, weight_in_kg,
                        ovr, pac, sho, pas, dri, def, phy,
                        acceleration, sprint_speed, positioning, finishing, shot_power,
                        long_shots, volleys, penalties, vision, crossing, free_kick_accuracy,
                        short_passing, long_passing, curve, dribbling, agility, balance,
                        reactions, ball_control, composure, interceptions, heading_accuracy,
                        def_awareness, standing_tackle, sliding_tackle, jumping, stamina,
                        strength, aggression, weak_foot, skill_moves
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    player_id, name, country, date_of_birth, sub_position, position,
                    preferred_foot, height_in_cm, current_club_name, club_id,
                    market_value_in_eur, highest_market_value_in_eur, image_url, age, weight_in_kg,
                    ovr, pac, sho, pas, dri, def_attr, phy,
                    acceleration, sprint_speed, positioning, finishing, shot_power,
                    long_shots, volleys, penalties, vision, crossing, free_kick_accuracy,
                    short_passing, long_passing, curve, dribbling, agility, balance,
                    reactions, ball_control, composure, interceptions, heading_accuracy,
                    def_awareness, standing_tackle, sliding_tackle, jumping, stamina,
                    strength, aggression, weak_foot, skill_moves
                ))
                new_count += 1
            
            if (updated_count + new_count) % 100 == 0:
                print(f"עובד... {updated_count + new_count} שחקנים")
                conn.commit()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✓ הושלם העידכון בהצלחה!")
        print(f"עודכנו: {updated_count} שחקנים")
        print(f"נוספו: {new_count} שחקנים חדשים")
        print(f"סה\"כ: {updated_count + new_count} שחקנים")
        
        return True
        
    except Exception as e:
        print(f"שגיאה: {e}")
        return False

if __name__ == "__main__":
    update_players_from_csv()