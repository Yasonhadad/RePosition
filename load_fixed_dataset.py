"""
Fixed data loading script
"""

import pandas as pd
import psycopg2
import os

def load_fixed_dataset():
    """Load dataset with proper SQL formatting"""
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Clear existing data
    print("Clearing existing data...")
    cursor.execute("DELETE FROM position_compatibility")
    cursor.execute("DELETE FROM players")
    
    df = pd.read_csv('attached_assets/players_joined_clean_1749304538906.csv')
    print(f"Loading {len(df)} players...")
    
    # Insert in smaller batches
    batch_size = 100
    total_inserted = 0
    
    for start_idx in range(0, len(df), batch_size):
        end_idx = min(start_idx + batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]
        
        batch_inserted = 0
        for idx, row in batch_df.iterrows():
            try:
                # Core required fields
                player_id = int(row['player_id']) if pd.notna(row['player_id']) else None
                name = str(row['name']).replace("'", "''") if pd.notna(row['name']) else ''
                
                if not player_id or not name:
                    continue
                
                # Safe conversions
                def safe_int(val, default=None):
                    try:
                        if pd.isna(val) or str(val) == 'nan':
                            return default
                        return int(float(val))
                    except:
                        return default
                
                def safe_str(val, default=None):
                    try:
                        if pd.isna(val) or str(val) == 'nan':
                            return default
                        return str(val).replace("'", "''")
                    except:
                        return default
                
                # Basic player data
                values = [
                    player_id,
                    name,
                    safe_str(row.get('position')),
                    safe_str(row.get('sub_position')),
                    safe_str(row.get('current_club_name')),
                    safe_int(row.get('OVR')),
                    safe_int(row.get('PAC')),
                    safe_int(row.get('SHO')),
                    safe_int(row.get('PAS')),
                    safe_int(row.get('DRI')),
                    safe_int(row.get('DEF')),
                    safe_int(row.get('PHY')),
                    safe_str(row.get('League')),
                    safe_str(row.get('Team'))
                ]
                
                cursor.execute("""
                    INSERT INTO players (
                        player_id, name, position, sub_position, current_club_name,
                        ovr, pac, sho, pas, dri, def, phy, league, team
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, values)
                
                batch_inserted += 1
                total_inserted += 1
                
            except Exception as e:
                print(f"Failed to insert {row.get('name', 'Unknown')}: {e}")
        
        conn.commit()
        print(f"✓ Batch {start_idx//batch_size + 1}: Inserted {batch_inserted} players (Total: {total_inserted})")
        
        if total_inserted >= 500:  # Load first 500 players for testing
            break
    
    print(f"✓ Dataset loaded: {total_inserted} players")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    load_fixed_dataset()