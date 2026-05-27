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

export interface DatabaseProvider {
  initialize(): Promise<void>;
  getPlayerStats(playerId: string): Promise<PlayerStats | null>;
  createOrUpdatePlayerStats(playerId: string, stats: Partial<PlayerStats>): Promise<void>;
  saveGameRecord(record: GameRecord): Promise<void>;
  getGameRecord(playerId: string, date: string): Promise<GameRecord | null>;
}
