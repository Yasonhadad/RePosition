import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { pool } from './server/db.js';

console.log('🚀 Loading data into local database...');

async function loadCompetitions() {
  console.log('Loading competitions...');
  try {
    const csvData = fs.readFileSync('attached_assets/competitions.csv', 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Found ${records.length} competitions`);
    
    // Clear existing data
    await pool.query('DELETE FROM competitions');
    
    // Insert data
    for (const record of records) {
      await pool.query(`
        INSERT INTO competitions (id, name, country, gender, youth, international, season) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        ON CONFLICT (id) DO NOTHING
      `, [
        parseInt(record.competition_id) || null,
        record.competition_name || null,
        record.country_name || null,
        record.competition_gender || null,
        record.competition_youth || null,
        record.competition_international || null,
        record.season_name || null
      ]);
    }
    
    console.log('✓ Competitions loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading competitions:', error.message);
    return false;
  }
}

async function loadClubs() {
  console.log('Loading clubs...');
  try {
    const csvData = fs.readFileSync('attached_assets/clubs.csv', 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Found ${records.length} clubs`);
    
    // Clear existing data
    await pool.query('DELETE FROM clubs');
    
    // Insert data
    for (const record of records) {
      await pool.query(`
        INSERT INTO clubs (id, name, competition_id) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (id) DO NOTHING
      `, [
        parseInt(record.club_id) || null,
        record.club_name || null,
        parseInt(record.competition_id) || null
      ]);
    }
    
    console.log('✓ Clubs loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading clubs:', error.message);
    return false;
  }
}

function extractWeight(weightStr) {
  if (!weightStr || typeof weightStr !== 'string') return null;
  try {
    if (weightStr.includes('kg')) {
      return parseFloat(weightStr.split('kg')[0].trim());
    }
    return null;
  } catch {
    return null;
  }
}

function computeAge(dobStr) {
  if (!dobStr) return null;
  try {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return (age >= 15 && age <= 50) ? age : null;
  } catch {
    return null;
  }
}

function safeInt(val) {
  if (!val) return null;
  try {
    return parseInt(parseFloat(val));
  } catch {
    return null;
  }
}

function safeFloat(val) {
  if (!val) return null;
  try {
    return parseFloat(val);
  } catch {
    return null;
  }
}

function safeStr(val) {
  if (!val) return null;
  return String(val).trim() || null;
}

async function loadPlayers() {
  console.log('Loading players...');
  try {
    // Try cleaned dataset first
    let csvPath = 'attached_assets/players_joined_clean.csv';
    if (!fs.existsSync(csvPath)) {
      csvPath = 'attached_assets/players.csv';
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Found ${records.length} players in ${csvPath}`);
    
    // Clear existing data
    await pool.query('DELETE FROM players');
    
    let processed = 0;
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          const playerId = safeInt(record.player_id);
          const name = safeStr(record.player_name || record.name);
          
          if (!playerId || !name) continue;
          
          await pool.query(`
            INSERT INTO players (
              id, name, age, height, weight, foot, club_id, position,
              overall_rating, potential, value_eur, wage_eur,
              pace, shooting, passing, dribbling, defending, physic
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO NOTHING
          `, [
            playerId,
            name,
            computeAge(record.date_of_birth) || safeInt(record.age),
            safeFloat(record.height_cm),
            extractWeight(record.weight) || safeFloat(record.weight_kg),
            safeStr(record.foot),
            safeInt(record.club_id),
            safeStr(record.position || record.primary_position),
            safeInt(record.overall_rating || record.overall),
            safeInt(record.potential),
            safeFloat(record.value_eur),
            safeFloat(record.wage_eur),
            safeInt(record.pace),
            safeInt(record.shooting),
            safeInt(record.passing),
            safeInt(record.dribbling),
            safeInt(record.defending),
            safeInt(record.physic)
          ]);
          
          processed++;
        } catch (error) {
          console.error(`Error processing player ${record.player_id}:`, error.message);
        }
      }
      
      console.log(`Processed ${Math.min(i + batchSize, records.length)} / ${records.length} players`);
    }
    
    console.log(`✓ Players loaded successfully (${processed} players)`);
    return true;
  } catch (error) {
    console.error('Error loading players:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Loading Data to Local Database ===');
  
  try {
    let success = true;
    
    if (!await loadCompetitions()) success = false;
    if (!await loadClubs()) success = false;
    if (!await loadPlayers()) success = false;
    
    if (success) {
      console.log('\n✓ All data loaded successfully!');
      
      // Show summary
      const competitionsResult = await pool.query('SELECT COUNT(*) FROM competitions');
      const clubsResult = await pool.query('SELECT COUNT(*) FROM clubs');
      const playersResult = await pool.query('SELECT COUNT(*) FROM players');
      
      console.log('\nSummary:');
      console.log(`- Competitions: ${competitionsResult.rows[0].count}`);
      console.log(`- Clubs: ${clubsResult.rows[0].count}`);
      console.log(`- Players: ${playersResult.rows[0].count}`);
    } else {
      console.log('\n✗ Some data failed to load');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

main();