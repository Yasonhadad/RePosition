"""
Simple bulk load using COPY command for efficiency
"""

import pandas as pd
import psycopg2
import os
import io

def simple_bulk_load():
    """Load data using PostgreSQL COPY command"""
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Clear existing data
    print("Clearing existing data...")
    cursor.execute("DELETE FROM position_compatibility")
    cursor.execute("DELETE FROM players")
    
    # Read and clean the CSV data
    df = pd.read_csv('attached_assets/players_joined_clean_1749304538906.csv')
    print(f"Processing {len(df)} players...")
    
    # Prepare data for bulk insert
    players_data = []
    
    for idx, row in df.iterrows():
        try:
            player_id = int(row['player_id']) if pd.notna(row['player_id']) else None
            name = str(row['name']).replace('\t', ' ').replace('\n', ' ').replace('\r', ' ') if pd.notna(row['name']) else ''
            
            if not player_id or not name:
                continue
            
            # Clean and prepare values
            def clean_val(val, is_int=False):
                if pd.isna(val) or str(val) == 'nan':
                    return '\\N'  # PostgreSQL NULL
                if is_int:
                    try:
                        return str(int(float(val)))
                    except:
                        return '\\N'
                else:
                    return str(val).replace('\t', ' ').replace('\n', ' ').replace('\r', ' ').replace('\\', '\\\\')
            
            # Build row data
            row_data = [
                str(player_id),
                name.replace('\t', ' '),
                clean_val(row.get('position')),
                clean_val(row.get('sub_position')),
                clean_val(row.get('current_club_name')),
                clean_val(row.get('OVR'), True),
                clean_val(row.get('PAC'), True),
                clean_val(row.get('SHO'), True),
                clean_val(row.get('PAS'), True),
                clean_val(row.get('DRI'), True),
                clean_val(row.get('DEF'), True),
                clean_val(row.get('PHY'), True),
                clean_val(row.get('League')),
                clean_val(row.get('Team'))
            ]
            
            players_data.append('\t'.join(row_data))
            
        except Exception as e:
            print(f"Error processing {row.get('name', 'Unknown')}: {e}")
    
    print(f"Prepared {len(players_data)} players for insertion")
    
    # Use COPY command for bulk insert
    copy_data = '\n'.join(players_data)
    copy_file = io.StringIO(copy_data)
    
    try:
        cursor.copy_from(
            copy_file,
            'players',
            columns=('player_id', 'name', 'position', 'sub_position', 'current_club_name',
                    'ovr', 'pac', 'sho', 'pas', 'dri', 'def', 'phy', 'league', 'team'),
            sep='\t',
            null='\\N'
        )
        conn.commit()
        print(f"✓ Successfully loaded {len(players_data)} players using COPY command")
        
    except Exception as e:
        print(f"COPY command failed: {e}")
        # Fallback to individual inserts
        conn.rollback()
        print("Falling back to individual inserts...")
        
        inserted = 0
        for idx, row in df.head(1000).iterrows():  # Load first 1000 for testing
            try:
                player_id = int(row['player_id']) if pd.notna(row['player_id']) else None
                name = str(row['name']) if pd.notna(row['name']) else ''
                
                if not player_id or not name:
                    continue
                
                cursor.execute("""
                    INSERT INTO players (player_id, name, position, sub_position, current_club_name, ovr, pac, sho, pas, dri, def, phy, league, team)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    player_id, name,
                    str(row.get('position', '')) if pd.notna(row.get('position')) else None,
                    str(row.get('sub_position', '')) if pd.notna(row.get('sub_position')) else None,
                    str(row.get('current_club_name', '')) if pd.notna(row.get('current_club_name')) else None,
                    int(row.get('OVR', 0)) if pd.notna(row.get('OVR')) else None,
                    int(row.get('PAC', 0)) if pd.notna(row.get('PAC')) else None,
                    int(row.get('SHO', 0)) if pd.notna(row.get('SHO')) else None,
                    int(row.get('PAS', 0)) if pd.notna(row.get('PAS')) else None,
                    int(row.get('DRI', 0)) if pd.notna(row.get('DRI')) else None,
                    int(row.get('DEF', 0)) if pd.notna(row.get('DEF')) else None,
                    int(row.get('PHY', 0)) if pd.notna(row.get('PHY')) else None,
                    str(row.get('League', '')) if pd.notna(row.get('League')) else None,
                    str(row.get('Team', '')) if pd.notna(row.get('Team')) else None
                ))
                inserted += 1
                
                if inserted % 100 == 0:
                    conn.commit()
                    print(f"✓ Inserted {inserted} players...")
                    
            except Exception as e:
                print(f"Failed to insert {row.get('name', 'Unknown')}: {e}")
        
        conn.commit()
        print(f"✓ Fallback method loaded {inserted} players")
    
    # Get final count
    cursor.execute("SELECT COUNT(*) FROM players")
    final_count = cursor.fetchone()[0]
    print(f"✓ Total players in database: {final_count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    simple_bulk_load()