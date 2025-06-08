import { db } from '../server/db';
import { clubs, competitions, players } from '../shared/schema';
import { readFileSync } from 'fs';
import path from 'path';

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
  if (!value || value.trim() === '' || value.trim() === 'nan') return null;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

function safeParseFloat(value: string): number | null {
  if (!value || value.trim() === '' || value.trim() === 'nan') return null;
  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? null : parsed;
}

function extractWeight(s: string): number | null {
  if (!s) return null;
  const match = s.match(/(\d+(?:\.\d+)?)kg/);
  return match ? parseFloat(match[1]) : null;
}

function computeAge(dob: string): number | null {
  if (!dob) return null;
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return null;
    return 2025 - date.getFullYear();
  } catch {
    return null;
  }
}

async function loadNewPlayersData() {
  console.log('Loading new players data...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'players_joined_clean_1749304538906.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const header = lines[0];
  console.log('CSV Header:', header);
  
  const headerColumns = parseCsvLine(header);
  console.log(`Found ${headerColumns.length} columns`);
  console.log('Columns:', headerColumns.slice(0, 20).join(', ') + '...');

  // Track unique clubs and competitions
  const clubsSet = new Set<string>();
  const competitionsSet = new Set<string>();
  const playersToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCsvLine(line);
    
    if (values.length < headerColumns.length) {
      console.warn(`Line ${i + 1}: Expected ${headerColumns.length} columns, got ${values.length}`);
      continue;
    }

    // Extract player data based on column positions
    const player_id = safeParseInt(values[0]);
    const name = values[1]?.replace(/"/g, '') || '';
    const country_of_citizenship = values[2]?.replace(/"/g, '') || null;
    const date_of_birth = values[3]?.replace(/"/g, '') || null;
    const sub_position = values[4]?.replace(/"/g, '') || null;
    const position = values[5]?.replace(/"/g, '') || null;
    const foot = values[6]?.replace(/"/g, '') || null;
    const height_in_cm = safeParseFloat(values[7]);
    const current_club_name = values[8]?.replace(/"/g, '') || null;
    const market_value_in_eur = safeParseFloat(values[9]);
    const highest_market_value_in_eur = safeParseFloat(values[10]);
    const image_url = values[11]?.replace(/"/g, '') || null;
    const club_id = safeParseFloat(values[12]);
    
    // FIFA stats
    const ovr = safeParseInt(values[13]);
    const pac = safeParseInt(values[14]);
    const sho = safeParseInt(values[15]);
    const pas = safeParseInt(values[16]);
    const dri = safeParseInt(values[17]);
    const def = safeParseInt(values[18]);
    const phy = safeParseInt(values[19]);
    
    // Additional attributes
    const acceleration = safeParseInt(values[20]);
    const sprint_speed = safeParseInt(values[21]);
    const positioning = safeParseInt(values[22]);
    const finishing = safeParseInt(values[23]);
    const shot_power = safeParseInt(values[24]);
    const long_shots = safeParseInt(values[25]);
    const volleys = safeParseInt(values[26]);
    const penalties = safeParseInt(values[27]);
    const vision = safeParseInt(values[28]);
    const crossing = safeParseInt(values[29]);
    const free_kick_accuracy = safeParseInt(values[30]);
    const short_passing = safeParseInt(values[31]);
    const long_passing = safeParseInt(values[32]);
    const curve = safeParseInt(values[33]);
    const dribbling = safeParseInt(values[34]);
    const agility = safeParseInt(values[35]);
    const balance = safeParseInt(values[36]);
    const reactions = safeParseInt(values[37]);
    const ball_control = safeParseInt(values[38]);
    const composure = safeParseInt(values[39]);
    const interceptions = safeParseInt(values[40]);
    const heading_accuracy = safeParseInt(values[41]);
    const def_awareness = safeParseInt(values[42]);
    const standing_tackle = safeParseInt(values[43]);
    const sliding_tackle = safeParseInt(values[44]);
    const jumping = safeParseInt(values[45]);
    const stamina = safeParseInt(values[46]);
    const strength = safeParseInt(values[47]);
    const aggression = safeParseInt(values[48]);
    const weak_foot = safeParseInt(values[49]);
    const skill_moves = safeParseInt(values[50]);
    const preferred_foot = values[51]?.replace(/"/g, '') || null;
    const alternative_positions = values[52]?.replace(/"/g, '') || null;
    const play_style = values[53]?.replace(/"/g, '') || null;
    const league = values[54]?.replace(/"/g, '') || null;
    const team = values[55]?.replace(/"/g, '') || null;
    const weight_str = values[56]?.replace(/"/g, '') || null;
    
    const weight_in_kg = extractWeight(weight_str);
    const age = computeAge(date_of_birth);

    if (!player_id || !name) {
      console.warn(`Line ${i + 1}: Missing required fields (player_id or name)`);
      continue;
    }

    // Track clubs and competitions
    if (current_club_name) clubsSet.add(current_club_name);
    if (league) competitionsSet.add(league);

    const playerData = {
      player_id,
      name,
      country_of_citizenship,
      date_of_birth,
      sub_position,
      position,
      foot,
      height_in_cm,
      weight_in_kg,
      age,
      current_club_name,
      market_value_in_eur,
      highest_market_value_in_eur,
      image_url,
      club_id: club_id ? Math.round(club_id) : null,
      ovr,
      pac,
      sho,
      pas,
      dri,
      def,
      phy,
      acceleration,
      sprint_speed,
      positioning,
      finishing,
      shot_power,
      long_shots,
      volleys,
      penalties,
      vision,
      crossing,
      free_kick_accuracy,
      short_passing,
      long_passing,
      curve,
      dribbling,
      agility,
      balance,
      reactions,
      ball_control,
      composure,
      interceptions,
      heading_accuracy,
      def_awareness,
      standing_tackle,
      sliding_tackle,
      jumping,
      stamina,
      strength,
      aggression,
      weak_foot,
      skill_moves,
      preferred_foot,
      alternative_positions,
      play_style,
      league,
      team,
      league_level: null
    };

    playersToInsert.push(playerData);
  }

  console.log(`Prepared ${playersToInsert.length} players for insertion`);
  console.log(`Found ${clubsSet.size} unique clubs`);
  console.log(`Found ${competitionsSet.size} unique competitions`);

  // Insert competitions first
  console.log('Inserting competitions...');
  const competitionData = Array.from(competitionsSet).map((comp, index) => ({
    competition_id: comp,
    competition_name: comp,
    competition_code: comp.substring(0, 3).toUpperCase(),
    type: 'League',
    country_name: 'Various'
  }));

  if (competitionData.length > 0) {
    await db.insert(competitions).values(competitionData);
    console.log(`✓ Inserted ${competitionData.length} competitions`);
  }

  // Insert clubs
  console.log('Inserting clubs...');
  const clubData = Array.from(clubsSet).map((clubName, index) => ({
    club_id: index + 1,
    name: clubName,
    club_code: clubName.substring(0, 3).toLowerCase(),
    domestic_competition_id: playersToInsert.find(p => p.current_club_name === clubName)?.league || 'Unknown'
  }));

  if (clubData.length > 0) {
    await db.insert(clubs).values(clubData);
    console.log(`✓ Inserted ${clubData.length} clubs`);
  }

  // Insert players in batches
  console.log('Inserting players...');
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < playersToInsert.length; i += batchSize) {
    const batch = playersToInsert.slice(i, i + batchSize);
    try {
      await db.insert(players).values(batch);
      insertedCount += batch.length;
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertedCount}/${playersToInsert.length} players`);
    } catch (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      // Try inserting individually to see which record causes the issue
      for (const player of batch) {
        try {
          await db.insert(players).values([player]);
          insertedCount++;
        } catch (individualError) {
          console.error(`Failed to insert player ${player.name} (ID: ${player.player_id}):`, individualError);
        }
      }
    }
  }

  console.log(`✓ Successfully loaded ${insertedCount} players from new dataset`);
}

async function main() {
  try {
    await loadNewPlayersData();
    console.log('✓ Data loading completed successfully');
  } catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
  }
}

main();