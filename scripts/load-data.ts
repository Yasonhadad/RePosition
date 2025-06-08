import { storage } from "../server/storage";
import { processCsvData } from "../server/ml-processor";
import { join } from "path";

async function loadData() {
  console.log("Starting data loading...");
  
  try {
    // Load players data
    console.log("Loading players...");
    const playersPath = join(process.cwd(), "attached_assets", "players.csv");
    const playersResult = await processCsvData(playersPath, "players");
    console.log(`Players loaded: ${playersResult.recordsProcessed} records`);

    // Load clubs data
    console.log("Loading clubs...");
    const clubsPath = join(process.cwd(), "attached_assets", "clubs.csv");
    const clubsResult = await processCsvData(clubsPath, "clubs");
    console.log(`Clubs loaded: ${clubsResult.recordsProcessed} records`);

    console.log("Data loading completed successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

loadData();