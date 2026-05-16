import { Database } from "bun:sqlite";
import path from "path";

const dbPath = path.join(import.meta.dir, "..", "wordle.db");

export const db = new Database(dbPath);

// Initialize database schema
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      playerId TEXT PRIMARY KEY,
      gamesPlayed INTEGER DEFAULT 0,
      gamesWon INTEGER DEFAULT 0,
      currentStreak INTEGER DEFAULT 0,
      maxStreak INTEGER DEFAULT 0,
      lastPlayedDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      date TEXT NOT NULL,
      solution TEXT NOT NULL,
      attempts TEXT NOT NULL,
      won INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playerId) REFERENCES players(playerId),
      UNIQUE(playerId, date)
    );

    CREATE INDEX IF NOT EXISTS idx_games_playerId ON games(playerId);
    CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
  `);
}

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
}

export interface GameRecord {
  playerId: string;
  date: string;
  solution: string;
  attempts: string[];
  won: boolean;
}

export function getPlayerStats(playerId: string): PlayerStats | null {
  const stmt = db.prepare("SELECT * FROM players WHERE playerId = ?");
  return stmt.get(playerId) as PlayerStats | null;
}

export function createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>) {
  const existing = getPlayerStats(playerId);

  if (!existing) {
    const stmt = db.prepare(`
      INSERT INTO players (playerId, gamesPlayed, gamesWon, currentStreak, maxStreak, lastPlayedDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      playerId,
      stats.gamesPlayed || 0,
      stats.gamesWon || 0,
      stats.currentStreak || 0,
      stats.maxStreak || 0,
      stats.lastPlayedDate || null
    );
  } else {
    const stmt = db.prepare(`
      UPDATE players
      SET gamesPlayed = ?, gamesWon = ?, currentStreak = ?, maxStreak = ?, lastPlayedDate = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE playerId = ?
    `);
    stmt.run(
      stats.gamesPlayed !== undefined ? stats.gamesPlayed : existing.gamesPlayed,
      stats.gamesWon !== undefined ? stats.gamesWon : existing.gamesWon,
      stats.currentStreak !== undefined ? stats.currentStreak : existing.currentStreak,
      stats.maxStreak !== undefined ? stats.maxStreak : existing.maxStreak,
      stats.lastPlayedDate !== undefined ? stats.lastPlayedDate : existing.lastPlayedDate,
      playerId
    );
  }
}

export function saveGameRecord(record: GameRecord) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (playerId, date, solution, attempts, won)
    VALUES (?, ?, ?, ?, ?)
  `);

  const attemptsJson = JSON.stringify(record.attempts);
  stmt.run(record.playerId, record.date, record.solution, attemptsJson, record.won ? 1 : 0);
}

export function getGameRecord(playerId: string, date: string): GameRecord | null {
  const stmt = db.prepare("SELECT * FROM games WHERE playerId = ? AND date = ?");
  const result = stmt.get(playerId, date) as any;

  if (!result) return null;

  return {
    playerId: result.playerId,
    date: result.date,
    solution: result.solution,
    attempts: JSON.parse(result.attempts),
    won: result.won === 1,
  };
}
