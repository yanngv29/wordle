import { MongoClient, Db, Collection } from "mongodb";
import { DatabaseProvider, PlayerStats, GameRecord } from "./types";

export class MongoDBProvider implements DatabaseProvider {
  private client!: MongoClient;
  private db!: Db;
  private playersCollection!: Collection<any>;
  private gamesCollection!: Collection<any>;

  async initialize(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }

    const dbName = process.env.MONGODB_DB_NAME || "wordle";
    
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(dbName);
    this.playersCollection = this.db.collection("players");
    this.gamesCollection = this.db.collection("games");

    // Create unique index on games(playerId, date)
    await this.gamesCollection.createIndex(
      { playerId: 1, date: 1 },
      { unique: true }
    );
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    const result = await this.playersCollection.findOne({ _id: playerId as any });
    if (!result) return null;

    return {
      playerId: result._id.toString(),
      gamesPlayed: result.gamesPlayed,
      gamesWon: result.gamesWon,
      currentStreak: result.currentStreak,
      maxStreak: result.maxStreak,
      lastPlayedDate: result.lastPlayedDate,
    };
  }

  async createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>): Promise<void> {
    const now = new Date().toISOString();

    const updateDoc: any = {
      $set: {
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      }
    };

    if (stats.gamesPlayed !== undefined) updateDoc.$set.gamesPlayed = stats.gamesPlayed;
    if (stats.gamesWon !== undefined) updateDoc.$set.gamesWon = stats.gamesWon;
    if (stats.currentStreak !== undefined) updateDoc.$set.currentStreak = stats.currentStreak;
    if (stats.maxStreak !== undefined) updateDoc.$set.maxStreak = stats.maxStreak;
    if (stats.lastPlayedDate !== undefined) updateDoc.$set.lastPlayedDate = stats.lastPlayedDate;

    // Check if we need to default properties on insert
    const defaults = {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastPlayedDate: null,
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in (updateDoc.$set))) {
        updateDoc.$setOnInsert[key] = value;
      }
    }

    await this.playersCollection.updateOne(
      { _id: playerId as any },
      updateDoc,
      { upsert: true }
    );
  }

  async saveGameRecord(record: GameRecord): Promise<void> {
    const now = new Date().toISOString();

    await this.gamesCollection.updateOne(
      { playerId: record.playerId, date: record.date },
      {
        $set: {
          solution: record.solution,
          attempts: record.attempts,
          won: record.won,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        }
      },
      { upsert: true }
    );
  }

  async getGameRecord(playerId: string, date: string): Promise<GameRecord | null> {
    const result = await this.gamesCollection.findOne({ playerId, date });
    if (!result) return null;

    return {
      playerId: result.playerId,
      date: result.date,
      solution: result.solution,
      attempts: result.attempts,
      won: result.won,
    };
  }
}
