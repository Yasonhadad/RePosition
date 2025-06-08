import { storage } from "../server/storage";
import { readFileSync } from "fs";
import { join } from "path";
import type { InsertPlayer, InsertClub } from "../shared/schema";

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
  if (!value || value === '' || value.toLowerCase() === 'nan' || value === 'null' || value === 'undefined') return null;
  const parsed = parseInt(value.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

function safeParseFloat(value: string): number | null {
  if (!value || value === '' || value.toLowerCase() === 'nan' || value === 'null' || value === 'undefined') return null;
  const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

async function loadPlayers() {
  console.log("Loading players from CSV...");
  
  const csvContent = readFileSync(join(process.cwd(), "attached_assets", "players.csv"), 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and at least one data row');
  }

  const headers = parseCsvLine(lines[0]);
  console.log("Headers found:", headers.slice(0, 10)); // Show first 10 headers
  
  const players: InsertPlayer[] = [];
  let errors = 0;
  
  for (let i = 1; i < Math.min(101, lines.length); i++) { // Load first 100 players as test
    try {
      const values = parseCsvLine(lines[i]);
      const data: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        data[header.trim()] = values[index]?.trim() || '';
      });

      // Calculate age from date_of_birth
      let age: number | null = null;
      if (data.date_of_birth) {
        try {
          const birthYear = new Date(data.date_of_birth).getFullYear();
          if (birthYear > 1900 && birthYear < 2025) {
            age = 2025 - birthYear;
          }
        } catch (error) {
          // Ignore age calculation errors
        }
      }

      const player: InsertPlayer = {
        player_id: safeParseInt(data.player_id) || safeParseInt(data['﻿player_id']) || 0,
        name: data.name || 'Unknown Player',
        country_of_citizenship: data.country_of_citizenship || null,
        date_of_birth: data.date_of_birth || null,
        sub_position: data.sub_position || null,
        position: data.position || null,
        foot: data.foot || null,
        height_in_cm: safeParseInt(data.height_in_cm),
        current_club_name: data.current_club_name || null,
        market_value_in_eur: safeParseInt(data.market_value_in_eur),
        club_id: safeParseInt(data.club_id),
        ovr: safeParseInt(data.OVR),
        pac: safeParseInt(data.PAC),
        sho: safeParseInt(data.SHO),
        pas: safeParseInt(data.PAS),
        dri: safeParseInt(data.DRI),
        def: safeParseInt(data.DEF),
        phy: safeParseInt(data.PHY),
        age,
        weight: null,
      };

      if (player.player_id && player.player_id > 0 && player.name) {
        players.push(player);
      }
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
      errors++;
    }
  }

  console.log(`Parsed ${players.length} valid players, ${errors} errors`);
  
  if (players.length > 0) {
    console.log("Sample player:", players[0]);
    await storage.bulkCreatePlayers(players);
    console.log(`Successfully loaded ${players.length} players to database`);
  }
}

async function loadClubs() {
  console.log("Loading clubs from CSV...");
  
  try {
    const csvContent = readFileSync(join(process.cwd(), "attached_assets", "clubs.csv"), 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      console.log('Clubs CSV file is empty or invalid, skipping...');
      return;
    }

    const headers = parseCsvLine(lines[0]);
    console.log("Club headers found:", headers.slice(0, 10));
    
    const clubs: InsertClub[] = [];
    let errors = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCsvLine(lines[i]);
        const data: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          data[header.trim()] = values[index]?.trim() || '';
        });

        const club: InsertClub = {
          club_id: safeParseInt(data.club_id) || safeParseInt(data['﻿club_id']) || 0,
          club_code: data.club_code || null,
          name: data.name || 'Unknown Club',
          domestic_competition_id: data.domestic_competition_id || null,
          total_market_value: safeParseInt(data.total_market_value),
          squad_size: safeParseInt(data.squad_size),
          average_age: safeParseFloat(data.average_age),
          foreigners_number: safeParseInt(data.foreigners_number),
          foreigners_percentage: safeParseFloat(data.foreigners_percentage),
          national_team_players: safeParseInt(data.national_team_players),
          stadium_name: data.stadium_name || null,
          stadium_seats: safeParseInt(data.stadium_seats),
          net_transfer_record: data.net_transfer_record || null,
          last_season: safeParseInt(data.last_season),
        };

        if (club.club_id && club.club_id > 0 && club.name) {
          clubs.push(club);
        }
      } catch (error) {
        console.error(`Error parsing club row ${i}:`, error);
        errors++;
      }
    }

    console.log(`Parsed ${clubs.length} valid clubs, ${errors} errors`);
    
    if (clubs.length > 0) {
      console.log("Sample club:", clubs[0]);
      await storage.bulkCreateClubs(clubs);
      console.log(`Successfully loaded ${clubs.length} clubs to database`);
    }
  } catch (error) {
    console.log('Could not load clubs CSV, skipping...');
  }
}

async function main() {
  try {
    await loadPlayers();
    await loadClubs();
    console.log("Data loading completed successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

main();