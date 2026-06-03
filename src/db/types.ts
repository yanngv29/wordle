export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  avatarKey?: string | null;        // S3 object key (e.g., "avatars/{playerId}.webp")
  avatarUpdatedAt?: string | null;  // Timestamp for cache validation (ETag)
}

export interface GameRecord {
  playerId: string;
  date: string;
  solution: string;
  attempts: string[];
  won: boolean;
}

export interface DatabaseProvider {
  initialize(): Promise<void>;
  getPlayerStats(playerId: string): Promise<PlayerStats | null>;
  createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>): Promise<void>;
  saveGameRecord(record: GameRecord): Promise<void>;
  getGameRecord(playerId: string, date: string): Promise<GameRecord | null>;
}
