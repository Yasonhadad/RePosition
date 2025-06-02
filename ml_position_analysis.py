import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import json
import os

def calculate_position_compatibility():
    """
    Calculate position compatibility for all players based on their technical attributes
    """
    
    # Load player data from the database export
    players_data = """player_id,name,position,sub_position,ovr,pac,sho,pas,dri,def,phy,acceleration,sprint_speed,positioning,finishing,shot_power,long_shots,volleys,penalties,vision,crossing,free_kick_accuracy,short_passing,long_passing,curve,dribbling,agility,balance,reactions,ball_control,composure,interceptions,heading_accuracy,def_awareness,standing_tackle,sliding_tackle,jumping,stamina,strength,aggression
85295,Ivֳ¡n Balliu,Defender,RB,77,81,51,70,74,72,71,78,83,67,50,45,59,24,69,64,77,58,72,68,63,72,78,76,71,77,74,72,65,73,75,70,75,84,63,73
159288,Arlind Ajeti,Defender,CB,69,61,35,52,54,67,78,60,62,36,28,52,32,40,45,45,50,41,60,54,43,48,51,75,66,59,55,67,68,64,69,67,78,64,84,78
165513,Berat Djimsiti,Defender,CB,78,65,39,59,48,80,79,63,66,55,36,52,30,32,38,56,53,30,67,68,42,34,40,45,74,64,74,79,83,80,80,77,86,73,80,81
222209,Thomas Strakosha,Goalkeeper,GK,74,74,73,72,75,43,71,41,46,18,15,54,20,11,21,49,18,12,26,22,14,14,45,47,76,15,61,24,11,20,18,12,62,23,66,20
304144,Alen Sherri,Goalkeeper,GK,65,66,61,61,68,34,63,33,35,10,10,46,11,9,15,29,16,12,29,30,15,12,42,31,59,18,49,8,13,8,14,14,59,28,68,34
308278,Rey Manaj,Attack,ST,76,68,78,63,73,31,70,67,69,78,81,84,72,66,71,60,56,76,69,56,70,74,60,75,76,77,67,12,71,42,21,29,79,63,75,65
371371,Marash Kumbulla,Defender,CB,74,39,32,53,56,77,73,37,40,22,26,50,31,28,30,54,45,26,61,58,30,52,43,58,78,60,63,75,79,79,77,73,74,65,76,75
390177,Nedim Bajrami,Midfield,CAM,74,75,68,73,77,58,65,77,74,74,65,74,65,68,69,74,70,64,75,70,75,77,78,75,70,78,68,56,54,58,60,62,68,74,60,67
435228,Ardian Ismajli,Defender,CB,71,67,30,49,61,75,63,66,68,24,22,60,23,23,31,38,34,26,64,61,41,58,66,71,71,59,67,76,72,75,75,73,74,58,62,71
442703,Ylber Ramadani,Midfield,CDM,70,54,58,60,64,68,77,62,47,58,51,71,70,39,37,59,49,45,70,64,40,65,57,69,65,65,64,70,58,68,70,65,69,95,71,72
448920,Enea Mihaj,Defender,CB,70,61,42,50,49,72,71,59,63,42,33,67,37,44,40,29,48,25,65,61,34,47,51,59,60,47,63,69,72,71,74,73,77,67,74,69
457237,Sergio Kalaj,Defender,CB,60,49,27,42,42,61,64,43,54,23,21,43,23,31,36,32,31,27,54,55,21,38,33,38,56,50,44,58,58,59,64,64,62,59,71,55
543771,Kristjan Asllani,Midfield,CDM,75,66,61,74,74,70,69,65,66,59,57,72,66,48,54,77,63,65,80,77,65,75,64,74,70,78,71,71,64,68,74,68,69,76,65,68
571743,Armando Broja,Attack,ST,73,74,73,53,72,30,75,61,84,75,75,80,63,65,73,57,43,40,62,43,52,75,64,63,70,73,70,20,70,20,35,20,78,69,82,65
583046,Medon Berisha,Midfield,CM,60,47,47,59,58,59,60,60,36,42,44,59,46,38,49,56,41,60,66,66,63,57,55,39,64,63,50,62,54,53,63,60,60,52,60,70
726120,Simon Simoni,Goalkeeper,GK,59,64,57,54,61,29,58,27,31,6,8,41,6,8,11,35,18,9,22,23,13,12,29,24,42,22,26,8,12,7,12,9,54,18,63,21
931567,Stiven Shpendi,Attack,ST,62,61,64,46,64,22,54,67,56,65,66,61,63,55,65,50,43,38,50,36,52,67,57,59,60,66,55,13,59,19,19,21,66,48,60,45
56809,Alexandre Oukidja,Goalkeeper,GK,73,72,70,70,73,47,74,48,45,11,14,53,19,15,24,31,13,18,25,26,11,15,54,59,68,14,57,18,16,12,19,13,67,31,70,32
80293,Aֳ¯ssa Mandi,Defender,CB,76,59,46,71,67,77,72,64,55,65,41,52,49,49,35,68,69,49,76,75,67,64,67,64,75,71,74,75,78,75,79,78,83,60,76,76
126656,Faouzi Ghoulam,Defender,LB,73,62,65,72,70,72,68,56,67,67,54,81,72,52,76,69,75,68,72,73,77,70,70,63,69,72,73,73,69,72,72,71,68,69,66,74
245537,Nabil Bentaleb,Midfield,CDM,78,52,72,77,79,71,75,55,50,65,65,83,78,68,83,81,65,71,83,79,70,80,70,69,76,82,80,73,57,72,74,67,69,74,76,77
284732,Ramy Bensebaini,Defender,LB,78,75,70,70,75,78,77,71,79,66,72,70,65,57,85,63,73,62,75,68,67,78,67,67,76,75,75,75,77,72,85,80,86,71,78,80
290532,Saֳ¯d Benrahma,Attack,LW,78,73,75,75,82,40,57,78,69,76,72,85,76,64,75,78,74,69,77,68,73,83,85,83,75,82,76,40,47,45,35,36,61,70,53,52
325924,Ahmed Touba,Defender,CB,70,72,53,61,62,68,80,65,77,49,48,56,59,54,55,58,58,47,64,65,56,59,62,64,64,66,59,64,63,70,69,72,78,74,84,80
327863,Akim Zedadka,Defender,RB,73,79,55,65,68,67,65,78,80,62,56,59,47,51,57,58,71,47,69,61,63,67,76,75,67,66,66,68,47,66,72,71,64,83,58,60
351816,Ismaֳ«l Bennacer,Midfield,CDM,83,77,73,82,85,78,75,81,74,75,67,85,74,64,72,80,78,75,85,83,79,84,86,89,83,85,87,81,62,79,82,77,77,78,69,86
394328,Rafik Guitane,Attack,RW,74,76,66,68,80,31,53,75,77,73,71,67,62,48,53,75,68,52,69,65,67,82,87,90,65,78,68,26,39,28,34,33,54,62,51,47
395693,Houssem Aouar,Midfield,CM,75,64,68,75,79,64,63,65,64,72,66,69,71,68,74,78,65,70,79,76,80,80,78,81,75,80,75,68,59,66,64,58,65,66,60,68
416660,Ramiz Zerrouki,Midfield,CDM,75,61,65,72,73,68,80,69,54,65,58,76,74,58,57,71,59,67,78,78,64,73,73,72,68,73,73,71,52,70,69,68,71,83,79,82
545400,Billal Messaoudi,Attack,ST,68,80,68,58,72,28,61,84,76,68,68,74,65,68,65,64,56,70,61,38,72,73,74,67,68,73,66,27,42,21,34,21,67,63,69,37
554251,Yasser Larouci,Defender,LB,68,71,47,59,69,65,64,71,71,56,45,52,48,42,46,54,66,38,64,52,50,72,64,69,67,69,59,64,60,66,65,65,71,69,62,61
666539,Beni,Midfield,CM,68,67,58,63,67,65,64,67,67,70,55,61,58,59,55,70,51,48,69,65,55,68,66,61,64,70,55,67,44,63,72,70,56,70,62,65
560593,Hicham Boudaoui,Midfield,CM,76,75,65,73,77,74,74,74,75,73,68,65,64,51,54,73,68,58,77,74,77,77,79,77,77,78,73,72,73,72,76,75,79,86,67,75
578391,Rayan Aֳ¯t-Nouri,Defender,LB,79,84,52,73,82,73,70,85,84,72,50,61,48,48,42,70,75,58,76,72,72,84,81,77,78,82,74,74,63,73,76,75,77,79,65,69
592400,Abdelkahar Kadri,Midfield,CAM,72,72,67,68,78,61,62,74,70,70,67,70,65,62,71,66,62,68,74,62,74,80,79,82,70,75,72,63,48,58,66,63,63,57,60,71
592403,Adem Zorgane,Midfield,CM,76,55,71,77,74,69,83,59,52,66,69,79,74,58,66,75,76,63,81,77,68,75,64,61,74,77,72,70,62,67,73,68,75,91,82,75
592979,Himad Abdelli,Midfield,CAM,73,65,68,70,73,60,73,69,62,72,66,73,67,68,75,75,62,58,75,73,45,77,59,53,73,76,74,63,63,54,64,53,74,78,73,68
625142,Zineddine Belaid,Defender,CB,67,63,28,56,54,68,67,62,64,30,25,36,24,24,42,45,55,28,66,65,38,50,50,56,64,58,64,66,72,66,70,66,75,62,68,67
707242,Badredine Bouanani,Attack,RW,69,71,64,68,71,31,51,72,71,68,66,65,59,58,59,68,69,55,72,65,65,72,72,77,58,71,67,26,45,28,34,30,56,60,52,38
746910,Mohamed Amoura,Attack,ST,75,93,77,62,77,46,55,94,92,77,80,79,74,73,66,60,61,50,65,64,68,74,92,93,76,74,75,34,63,45,48,53,75,71,41,66
748445,Yassine Titraoui,Midfield,CM,65,67,53,63,69,54,53,70,65,70,55,50,50,41,50,68,55,40,69,65,40,70,65,85,60,71,50,55,40,60,50,60,49,60,50,55
750903,Jaouen Hadjam,Defender,LB,68,75,52,59,68,65,71,72,77,58,47,61,52,48,52,60,63,45,63,52,51,69,71,65,61,67,62,64,52,66,68,66,71,71,74,65
789419,Teddy Boulhendi,Goalkeeper,GK,63,63,62,62,63,49,61,49,48,7,9,47,7,8,13,28,13,12,23,21,15,13,51,48,58,18,27,9,14,6,13,11,63,34,64,23
840254,Nadhir Benbouali,Attack,ST,64,63,64,54,57,23,70,55,70,68,65,65,57,61,70,65,42,47,64,41,42,54,56,41,58,63,64,18,68,15,23,15,76,57,81,59
855015,Farֳ¨s Chaֳ¯bi,Midfield,CAM,77,75,70,77,77,68,73,74,75,75,76,70,64,52,61,78,77,68,79,76,77,79,72,71,76,78,73,69,65,67,69,68,76,80,71,68
864306,Rafik Belghali,Defender,RB,65,82,60,61,66,60,59,80,83,62,60,64,59,55,55,61,63,56,63,58,60,67,71,61,58,64,64,59,51,58,64,61,66,57,58,61
917911,Anis Hadj Moussa,Attack,RW,67,75,50,61,77,29,54,76,74,57,51,58,41,44,48,60,59,62,63,55,66,80,86,80,67,74,58,21,35,29,29,36,56,66,55,35
547248,Iker ֳlvarez,Goalkeeper,GK,67,67,66,67,68,38,68,41,33,6,7,50,20,10,13,57,20,12,28,26,12,8,48,45,59,20,55,18,10,6,14,10,58,35,60,18
187718,Clinton Mata,Defender,RB,76,78,61,68,73,74,77,75,80,67,53,78,67,46,49,61,62,70,72,71,71,72,78,71,74,72,73,74,71,76,74,74,82,86,73,76
354814,M'Bala Nzola,Attack,ST,78,88,74,60,75,29,82,86,90,78,79,78,62,60,74,53,52,44,69,62,64,75,65,63,78,78,76,29,72,20,24,28,93,75,90,68"""
    
    # Create DataFrame from the data
    from io import StringIO
    df = pd.read_csv(StringIO(players_data))
    
    # Define position-specific scoring weights
    position_weights = {
        'ST': {  # Striker
            'pac': 0.25, 'sho': 0.30, 'pas': 0.05, 'dri': 0.20, 'def': 0.0, 'phy': 0.20,
            'acceleration': 0.15, 'positioning': 0.25, 'finishing': 0.30, 'shot_power': 0.15,
            'long_shots': 0.10, 'volleys': 0.15, 'penalties': 0.10, 'ball_control': 0.15,
            'composure': 0.10, 'jumping': 0.10, 'strength': 0.15, 'aggression': 0.05
        },
        'LW': {  # Left Winger
            'pac': 0.30, 'sho': 0.15, 'pas': 0.15, 'dri': 0.25, 'def': 0.05, 'phy': 0.10,
            'acceleration': 0.25, 'sprint_speed': 0.20, 'crossing': 0.20, 'dribbling': 0.25,
            'agility': 0.20, 'ball_control': 0.15, 'vision': 0.10, 'curve': 0.10,
            'finishing': 0.10, 'composure': 0.10
        },
        'RW': {  # Right Winger  
            'pac': 0.30, 'sho': 0.15, 'pas': 0.15, 'dri': 0.25, 'def': 0.05, 'phy': 0.10,
            'acceleration': 0.25, 'sprint_speed': 0.20, 'crossing': 0.20, 'dribbling': 0.25,
            'agility': 0.20, 'ball_control': 0.15, 'vision': 0.10, 'curve': 0.10,
            'finishing': 0.10, 'composure': 0.10
        },
        'CAM': {  # Central Attacking Midfielder
            'pac': 0.10, 'sho': 0.20, 'pas': 0.25, 'dri': 0.25, 'def': 0.05, 'phy': 0.15,
            'vision': 0.25, 'short_passing': 0.20, 'long_passing': 0.15, 'ball_control': 0.20,
            'dribbling': 0.20, 'agility': 0.15, 'composure': 0.15, 'finishing': 0.15,
            'long_shots': 0.15, 'free_kick_accuracy': 0.10
        },
        'CM': {  # Central Midfielder
            'pac': 0.10, 'sho': 0.10, 'pas': 0.30, 'dri': 0.20, 'def': 0.15, 'phy': 0.15,
            'vision': 0.20, 'short_passing': 0.25, 'long_passing': 0.20, 'ball_control': 0.15,
            'interceptions': 0.15, 'stamina': 0.15, 'composure': 0.10, 'reactions': 0.10
        },
        'CDM': {  # Defensive Midfielder
            'pac': 0.05, 'sho': 0.05, 'pas': 0.25, 'dri': 0.15, 'def': 0.25, 'phy': 0.25,
            'interceptions': 0.25, 'standing_tackle': 0.20, 'def_awareness': 0.20,
            'short_passing': 0.20, 'long_passing': 0.15, 'stamina': 0.15, 'strength': 0.15,
            'aggression': 0.10, 'composure': 0.10
        },
        'LB': {  # Left Back
            'pac': 0.20, 'sho': 0.05, 'pas': 0.20, 'dri': 0.15, 'def': 0.25, 'phy': 0.15,
            'acceleration': 0.15, 'sprint_speed': 0.15, 'crossing': 0.20, 'standing_tackle': 0.20,
            'def_awareness': 0.15, 'interceptions': 0.15, 'stamina': 0.20, 'strength': 0.10
        },
        'RB': {  # Right Back
            'pac': 0.20, 'sho': 0.05, 'pas': 0.20, 'dri': 0.15, 'def': 0.25, 'phy': 0.15,
            'acceleration': 0.15, 'sprint_speed': 0.15, 'crossing': 0.20, 'standing_tackle': 0.20,
            'def_awareness': 0.15, 'interceptions': 0.15, 'stamina': 0.20, 'strength': 0.10
        },
        'CB': {  # Center Back
            'pac': 0.05, 'sho': 0.05, 'pas': 0.15, 'dri': 0.05, 'def': 0.35, 'phy': 0.35,
            'heading_accuracy': 0.25, 'standing_tackle': 0.25, 'sliding_tackle': 0.20,
            'def_awareness': 0.25, 'interceptions': 0.20, 'strength': 0.25, 'jumping': 0.20,
            'aggression': 0.15, 'composure': 0.10
        }
    }
    
    results = []
    
    for _, player in df.iterrows():
        player_result = {
            'player_id': player['player_id'],
            'natural_pos': player.get('sub_position') or player.get('position'),
            'ovr': player['ovr']
        }
        
        position_scores = {}
        
        # Calculate fitness score for each position
        for pos, weights in position_weights.items():
            score = 0
            total_weight = 0
            
            for attr, weight in weights.items():
                if attr in player and pd.notna(player[attr]):
                    score += player[attr] * weight
                    total_weight += weight
            
            if total_weight > 0:
                # Normalize the score to 0-100 scale
                normalized_score = min(100, max(0, (score / total_weight)))
                position_scores[pos] = normalized_score
            else:
                position_scores[pos] = 0
        
        # Add position scores to result
        player_result['st_fit'] = position_scores.get('ST', 0)
        player_result['lw_fit'] = position_scores.get('LW', 0)
        player_result['rw_fit'] = position_scores.get('RW', 0)
        player_result['cam_fit'] = position_scores.get('CAM', 0)
        player_result['cm_fit'] = position_scores.get('CM', 0)
        player_result['cdm_fit'] = position_scores.get('CDM', 0)
        player_result['lb_fit'] = position_scores.get('LB', 0)
        player_result['rb_fit'] = position_scores.get('RB', 0)
        player_result['cb_fit'] = position_scores.get('CB', 0)
        
        # Find best position
        best_pos = max(position_scores.items(), key=lambda x: x[1])
        player_result['best_pos'] = best_pos[0]
        player_result['best_fit_score'] = best_pos[1]
        player_result['best_fit_pct'] = best_pos[1]
        
        results.append(player_result)
    
    return results

if __name__ == "__main__":
    print("Calculating position compatibility for all players...")
    results = calculate_position_compatibility()
    
    # Save results to JSON file
    with open('position_compatibility_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Processed {len(results)} players")
    print("Results saved to position_compatibility_results.json")
    
    # Print sample results
    print("\nSample results:")
    for i, result in enumerate(results[:5]):
        print(f"\nPlayer {result['player_id']}: {result['natural_pos']} -> Best: {result['best_pos']} ({result['best_fit_score']:.1f}%)")
        print(f"  ST: {result['st_fit']:.1f}% | LW: {result['lw_fit']:.1f}% | RW: {result['rw_fit']:.1f}%")
        print(f"  CAM: {result['cam_fit']:.1f}% | CM: {result['cm_fit']:.1f}% | CDM: {result['cdm_fit']:.1f}%")
        print(f"  LB: {result['lb_fit']:.1f}% | RB: {result['rb_fit']:.1f}% | CB: {result['cb_fit']:.1f}%")