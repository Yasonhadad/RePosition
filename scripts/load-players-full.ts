import { db } from "../server/db";
import { players } from "../shared/schema";
import * as fs from "fs";

function parseCsvLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function safeParseInt(value: string): number | null {
  if (!value || value === 'NaN' || value === '' || value === 'null') return null;
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function safeParseFloat(value: string): number | null {
  if (!value || value === 'NaN' || value === '' || value === 'null') return null;
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function extractWeight(s: string): number | null {
  if (!s) return null;
  const match = s.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function computeAge(dob: string): number | null {
  if (!dob) return null;
  try {
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      return age - 1;
    }
    return age;
  } catch {
    return null;
  }
}

async function loadPlayersWithFullAttributes() {
  try {
    console.log("Loading players with full attributes from CSV...");
    
    const csvContent = fs.readFileSync("attached_assets/players.csv", "utf-8");
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log("No data found in players.csv");
      return;
    }

    const header = lines[0];
    console.log("CSV Header:", header);
    const headerFields = parseCsvLine(header);
    
    const playersToInsert = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = parseCsvLine(line);
        
        const player = {
          player_id: safeParseInt(values[0]),
          name: values[1] || null,
          country_of_citizenship: values[2] || null,
          date_of_birth: values[3] || null,
          sub_position: values[4] || null,
          position: values[5] || null,
          foot: values[6] || null,
          height_in_cm: safeParseInt(values[7]),
          current_club_name: values[8] || null,
          market_value_in_eur: safeParseInt(values[9]),
          highest_market_value_in_eur: safeParseInt(values[10]),
          club_id: safeParseInt(values[11]),
          ovr: safeParseInt(values[12]),
          pac: safeParseInt(values[13]),
          sho: safeParseInt(values[14]),
          pas: safeParseInt(values[15]),
          dri: safeParseInt(values[16]),
          def: safeParseInt(values[17]),
          phy: safeParseInt(values[18]),
          acceleration: safeParseInt(values[19]),
          sprint_speed: safeParseInt(values[20]),
          positioning: safeParseInt(values[21]),
          finishing: safeParseInt(values[22]),
          shot_power: safeParseInt(values[23]),
          long_shots: safeParseInt(values[24]),
          volleys: safeParseInt(values[25]),
          penalties: safeParseInt(values[26]),
          vision: safeParseInt(values[27]),
          crossing: safeParseInt(values[28]),
          free_kick_accuracy: safeParseInt(values[29]),
          short_passing: safeParseInt(values[30]),
          long_passing: safeParseInt(values[31]),
          curve: safeParseInt(values[32]),
          dribbling: safeParseInt(values[33]),
          agility: safeParseInt(values[34]),
          balance: safeParseInt(values[35]),
          reactions: safeParseInt(values[36]),
          ball_control: safeParseInt(values[37]),
          composure: safeParseInt(values[38]),
          interceptions: safeParseInt(values[39]),
          heading_accuracy: safeParseInt(values[40]),
          def_awareness: safeParseInt(values[41]),
          standing_tackle: safeParseInt(values[42]),
          sliding_tackle: safeParseInt(values[43]),
          jumping: safeParseInt(values[44]),
          stamina: safeParseInt(values[45]),
          strength: safeParseInt(values[46]),
          aggression: safeParseInt(values[47]),
          weak_foot: safeParseInt(values[48]),
          skill_moves: safeParseInt(values[49]),
          preferred_foot: values[50] || null,
          alternative_positions: values[51] || null,
          play_style: values[52] || null,
          gk_diving: safeParseInt(values[53]),
          gk_handling: safeParseInt(values[54]),
          gk_kicking: safeParseInt(values[55]),
          gk_positioning: safeParseInt(values[56]),
          gk_reflexes: safeParseInt(values[57]),
          league: values[58] || null,
          team: values[59] || null,
          weight: extractWeight(values[60]),
          age: computeAge(values[3]) || safeParseInt(values[61]),
        };

        if (player.player_id && player.name) {
          playersToInsert.push(player);
        }
      } catch (error) {
        console.warn(`Error parsing line ${i}: ${error}`);
        continue;
      }
    }

    console.log(`Prepared ${playersToInsert.length} players for insertion`);

    if (playersToInsert.length > 0) {
      // Clear existing data first
      console.log("Clearing existing player data...");
      await db.delete(players);
      
      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < playersToInsert.length; i += batchSize) {
        const batch = playersToInsert.slice(i, i + batchSize);
        try {
          await db.insert(players).values(batch).onConflictDoNothing();
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(playersToInsert.length / batchSize)}`);
        } catch (error) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
      }
    }

    console.log("Players loading with full attributes completed!");
    
  } catch (error) {
    console.error("Error loading players:", error);
  }
}

async function main() {
  await loadPlayersWithFullAttributes();
  process.exit(0);
}

main().catch(console.error);