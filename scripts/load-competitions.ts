import { createReadStream } from 'fs';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db } from '../server/db';
import { competitions, type InsertCompetition } from '../shared/schema';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function safeParseInt(value: string): number | null {
  if (!value || value.trim() === '' || value === 'NULL') return null;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

async function loadCompetitions() {
  try {
    console.log('Loading competitions data...');
    
    const csvContent = readFileSync('./attached_assets/competitions.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('No data found in competitions.csv');
      return;
    }

    const header = lines[0];
    console.log('Header:', header);
    
    const competitionsToInsert: InsertCompetition[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      try {
        const values = parseCsvLine(line);
        
        if (values.length < 11) {
          console.log(`Skipping line ${i + 1}: insufficient columns`);
          continue;
        }

        const competition: InsertCompetition = {
          competition_id: values[0] || null,
          competition_code: values[1] || null,
          name: values[2] || null,
          sub_type: values[3] || null,
          type: values[4] || null,
          country_id: safeParseInt(values[5]),
          country_name: values[6] || null,
          domestic_league_code: values[7] || null,
          confederation: values[8] || null,
          url: values[9] || null,
          is_major_national_league: values[10] || null,
        };

        if (competition.competition_id && competition.name) {
          competitionsToInsert.push(competition);
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
        continue;
      }
    }

    console.log(`Parsed ${competitionsToInsert.length} competitions`);

    if (competitionsToInsert.length > 0) {
      // Insert competitions in batches
      const batchSize = 100;
      for (let i = 0; i < competitionsToInsert.length; i += batchSize) {
        const batch = competitionsToInsert.slice(i, i + batchSize);
        await db.insert(competitions).values(batch).onConflictDoNothing();
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(competitionsToInsert.length / batchSize)}`);
      }
      
      console.log('✓ Competitions data loaded successfully');
    }

  } catch (error) {
    console.error('Error loading competitions:', error);
    throw error;
  }
}

async function main() {
  try {
    await loadCompetitions();
    console.log('All data loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to load data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}