import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import type { Player, InsertPositionCompatibility, InsertPlayer, InsertClub } from "@shared/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the Python ML script
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..", "xgboost_ml_processor.py");

export interface MLAnalysisResult {
  player_id: number;
  natural_pos: string | null;
  st_fit: number | null;
  lw_fit: number | null;
  rw_fit: number | null;
  cm_fit: number | null;
  cdm_fit: number | null;
  cam_fit: number | null;
  lb_fit: number | null;
  rb_fit: number | null;
  cb_fit: number | null;
  best_pos: string | null;
  best_fit_score: number | null;
  best_fit_pct: number | null;
  ovr: number | null;
}

export async function processMLAnalysis(players: Player[]): Promise<InsertPositionCompatibility[]> {
  if (players.length === 0) {
    return [];
  }

  // Create temporary CSV file with player data
  const tempInputFile = path.join(__dirname, `temp_players_${Date.now()}.csv`);
  const tempOutputFile = path.join(__dirname, `temp_results_${Date.now()}.csv`);

  try {
    // Convert players to CSV format
    const csvHeader = "player_id,name,country_of_citizenship,date_of_birth,sub_position,position,foot,height_in_cm,current_club_name,market_value_in_eur,highest_market_value_in_eur,club_id,OVR,PAC,SHO,PAS,DRI,DEF,PHY,age,Weight";
    
    const csvRows = players.map(player => {
      return [
        player.player_id,
        player.name?.replace(/,/g, ' ') || '',
        player.country_of_citizenship?.replace(/,/g, ' ') || '',
        player.date_of_birth || '',
        player.sub_position || '',
        player.position || '',
        player.foot || '',
        player.height_in_cm || '',
        player.current_club_name?.replace(/,/g, ' ') || '',
        player.market_value_in_eur || '',
        player.market_value_in_eur || '',
        player.club_id || '',
        player.ovr || '',
        player.pac || '',
        player.sho || '',
        player.pas || '',
        player.dri || '',
        player.def || '',
        player.phy || '',
        player.age || '',
        player.weight || ''
      ].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');
    writeFileSync(tempInputFile, csvContent);

    // Run Python ML script
    await runPythonScript(tempInputFile, tempOutputFile);

    // Parse results
    const results = parseMLResults(tempOutputFile);

    return results;
  } finally {
    // Clean up temporary files
    if (existsSync(tempInputFile)) {
      unlinkSync(tempInputFile);
    }
    if (existsSync(tempOutputFile)) {
      unlinkSync(tempOutputFile);
    }
  }
}

function runPythonScript(inputFile: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(PYTHON_SCRIPT_PATH)) {
      reject(new Error(`Python script not found at: ${PYTHON_SCRIPT_PATH}`));
      return;
    }

    const pythonProcess = spawn('python3', [
      PYTHON_SCRIPT_PATH,
      '--csv', inputFile,
      '--out', outputFile
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Python ML analysis completed successfully');
        resolve();
      } else {
        console.error('Python script error:', stderr);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

function parseMLResults(outputFile: string): InsertPositionCompatibility[] {
  if (!existsSync(outputFile)) {
    throw new Error(`Results file not found: ${outputFile}`);
  }

  const csvContent = readFileSync(outputFile, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Invalid results file format');
  }

  const header = lines[0].split(',');
  const results: InsertPositionCompatibility[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const result: Record<string, any> = {};

    header.forEach((col, index) => {
      const value = values[index]?.trim();
      result[col] = value === '' || value === 'nan' ? null : value;
    });

    const compatibility: InsertPositionCompatibility = {
      player_id: parseInt(result.player_id) || 0,
      natural_pos: result.natural_pos || null,
      st_fit: result.ST_fit ? parseFloat(result.ST_fit) : null,
      lw_fit: result.LW_fit ? parseFloat(result.LW_fit) : null,
      rw_fit: result.RW_fit ? parseFloat(result.RW_fit) : null,
      cm_fit: result.CM_fit ? parseFloat(result.CM_fit) : null,
      cdm_fit: result.CDM_fit ? parseFloat(result.CDM_fit) : null,
      cam_fit: result.CAM_fit ? parseFloat(result.CAM_fit) : null,
      lb_fit: result.LB_fit ? parseFloat(result.LB_fit) : null,
      rb_fit: result.RB_fit ? parseFloat(result.RB_fit) : null,
      cb_fit: result.CB_fit ? parseFloat(result.CB_fit) : null,
      best_pos: result.best_pos || null,
      best_fit_score: result.best_fit_score ? parseFloat(result.best_fit_score) : null,
      best_fit_pct: result.best_fit_pct ? parseFloat(result.best_fit_pct) : null,
      ovr: result.OVR ? parseInt(result.OVR) : null,
    };

    results.push(compatibility);
  }

  return results;
}

export async function processCsvData(filePath: string, fileType: 'players' | 'clubs' | 'competitions'): Promise<{
  recordsProcessed: number;
  errors: string[];
}> {
  const csvContent = readFileSync(filePath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and at least one data row');
  }

  const errors: string[] = [];
  let recordsProcessed = 0;

  if (fileType === 'players') {
    const players: InsertPlayer[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const player = parsePlayerCsvRow(lines[i], lines[0]);
        if (player) {
          players.push(player);
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`);
      }
    }

    if (players.length > 0) {
      await storage.bulkCreatePlayers(players);
      recordsProcessed = players.length;
    }
  } else if (fileType === 'clubs') {
    const clubs: InsertClub[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const club = parseClubCsvRow(lines[i], lines[0]);
        if (club) {
          clubs.push(club);
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`);
      }
    }

    if (clubs.length > 0) {
      await storage.bulkCreateClubs(clubs);
      recordsProcessed = clubs.length;
    }
  }

  return { recordsProcessed, errors };
}

function parsePlayerCsvRow(row: string, header: string): InsertPlayer | null {
  const values = row.split(',');
  const columns = header.split(',');
  const data: Record<string, string> = {};

  columns.forEach((col, index) => {
    data[col.trim()] = values[index]?.trim() || '';
  });

  // Helper function to safely parse numbers
  const safeParseInt = (value: string): number | null => {
    if (!value || value === '' || value.toLowerCase() === 'nan' || value === 'null') return null;
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  };

  const safeParseFloat = (value: string): number | null => {
    if (!value || value === '' || value.toLowerCase() === 'nan' || value === 'null') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  // Calculate age from date_of_birth if not provided
  let age = safeParseInt(data.age);
  if (!age && data.date_of_birth) {
    try {
      const birthYear = new Date(data.date_of_birth).getFullYear();
      age = 2025 - birthYear;
    } catch (error) {
      // Ignore age calculation errors
    }
  }

  // Extract weight from string format if needed
  let weight: number | null = null;
  if (data.Weight || data.weight) {
    const weightStr = data.Weight || data.weight;
    const weightMatch = weightStr.match(/(\d+(?:\.\d+)?)/);
    if (weightMatch) {
      weight = parseFloat(weightMatch[1]);
    }
  }

  const player: InsertPlayer = {
    player_id: safeParseInt(data.player_id) || safeParseInt(data['﻿player_id']) || 0,
    name: data.name || '',
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
    weight,
  };

  return player.player_id > 0 ? player : null;
}

function parseClubCsvRow(row: string, header: string): InsertClub | null {
  const values = row.split(',');
  const columns = header.split(',');
  const data: Record<string, string> = {};

  columns.forEach((col, index) => {
    data[col.trim()] = values[index]?.trim() || '';
  });

  // Helper function to safely parse numbers
  const safeParseInt = (value: string): number | null => {
    if (!value || value === '' || value.toLowerCase() === 'nan' || value === 'null') return null;
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  };

  const club: InsertClub = {
    club_id: safeParseInt(data.club_id) || safeParseInt(data['﻿club_id']) || 0,
    club_code: data.club_code || null,
    name: data.name || '',
    domestic_competition_id: data.domestic_competition_id || null,
    total_market_value: safeParseInt(data.total_market_value),
    squad_size: safeParseInt(data.squad_size),
    average_age: parseFloat(data.average_age) || null,
    foreigners_number: parseInt(data.foreigners_number) || null,
    foreigners_percentage: parseFloat(data.foreigners_percentage) || null,
    national_team_players: parseInt(data.national_team_players) || null,
    stadium_name: data.stadium_name || null,
    stadium_seats: parseInt(data.stadium_seats) || null,
    net_transfer_record: data.net_transfer_record || null,
    coach_name: data.coach_name || null,
    last_season: parseInt(data.last_season) || null,
  };

  return club.club_id > 0 ? club : null;
}
