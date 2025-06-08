import { db } from "../server/db";
import { clubs } from "../shared/schema";
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
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function safeParseFloat(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

async function loadClubs() {
  try {
    console.log("Loading clubs from CSV...");
    
    const csvContent = fs.readFileSync("attached_assets/clubs.csv", "utf-8");
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log("No data found in clubs.csv");
      return;
    }

    const header = lines[0];
    console.log("CSV Header:", header);
    
    const clubsToInsert = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = parseCsvLine(line);
        
        const club = {
          club_id: safeParseInt(values[0]),
          club_code: values[1] || null,
          name: values[2] || null,
          domestic_competition_id: values[3] || null,
          total_market_value: values[4] || null,
          squad_size: safeParseInt(values[5]),
          average_age: safeParseFloat(values[6]),
          foreigners_number: safeParseInt(values[7]),
          foreigners_percentage: safeParseFloat(values[8]),
          national_team_players: safeParseInt(values[9]),
          stadium_name: values[10] || null,
          stadium_seats: safeParseInt(values[11]),
          net_transfer_record: values[12] || null,
          coach_name: values[13] || null,
          last_season: safeParseInt(values[14]),
        };

        if (club.club_id && club.name) {
          clubsToInsert.push(club);
        }
      } catch (error) {
        console.warn(`Error parsing line ${i}: ${error}`);
        continue;
      }
    }

    console.log(`Prepared ${clubsToInsert.length} clubs for insertion`);

    if (clubsToInsert.length > 0) {
      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < clubsToInsert.length; i += batchSize) {
        const batch = clubsToInsert.slice(i, i + batchSize);
        try {
          await db.insert(clubs).values(batch).onConflictDoNothing();
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
        } catch (error) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
      }
    }

    console.log("Clubs loading completed!");
    
  } catch (error) {
    console.error("Error loading clubs:", error);
  }
}

async function main() {
  await loadClubs();
  process.exit(0);
}

main().catch(console.error);