import { Database } from "bun:sqlite";
import path from "path";
import { DatabaseProvider, PlayerStats, GameRecord } from "./types";

const dbPath = path.join(import.meta.dir, "..", "..", "wordle.db");

export class SQLiteProvider implements DatabaseProvider {
  private db!: Database;

  async initialize(): Promise<void> {
    this.db = new Database(dbPath);
    this.db.exec(`
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

  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    const stmt = this.db.prepare("SELECT * FROM players WHERE playerId = ?");
    return stmt.get(playerId) as PlayerStats | null;
  }

  async createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>): Promise<void> {
    const existing = await this.getPlayerStats(playerId);

    if (!existing) {
      const stmt = this.db.prepare(`
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
      const stmt = this.db.prepare(`
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

  async saveGameRecord(record: GameRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO games (playerId, date, solution, attempts, won)
      VALUES (?, ?, ?, ?, ?)
    `);

    const attemptsJson = JSON.stringify(record.attempts);
    stmt.run(record.playerId, record.date, record.solution, attemptsJson, record.won ? 1 : 0);
  }

  async getGameRecord(playerId: string, date: string): Promise<GameRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM games WHERE playerId = ? AND date = ?");
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
}
