import { SQLiteProvider } from "./db/sqlite";
import { MongoDBProvider } from "./db/mongo";
import { DatabaseProvider, PlayerStats, GameRecord } from "./db/types";

export type { PlayerStats, GameRecord };

let provider: DatabaseProvider;

const mongoUri = process.env.MONGODB_URI;

if (mongoUri) {
  console.log("💾 Database: Selecting MongoDB provider");
  provider = new MongoDBProvider();
} else {
  console.log("💾 Database: Selecting SQLite provider");
  provider = new SQLiteProvider();
}

export async function initializeDatabase(): Promise<void> {
  await provider.initialize();
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  return await provider.getPlayerStats(playerId);
}

export async function createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>): Promise<void> {
  await provider.createOrUpdatePlayerStats(playerId, stats);
}

export async function saveGameRecord(record: GameRecord): Promise<void> {
  await provider.saveGameRecord(record);
}

export async function getGameRecord(playerId: string, date: string): Promise<GameRecord | null> {
  return await provider.getGameRecord(playerId, date);
}
