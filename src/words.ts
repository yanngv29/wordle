// Re-export from dictionaries for backwards compatibility
export { getWords, getRandomWord } from "./dictionaries";

// For backwards compatibility with existing code
import { FR_WORDS } from "./dictionaries";
export const WORDS = FR_WORDS; // Default to French words
