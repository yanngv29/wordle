import { readFileSync } from "fs";
import path from "path";

export type Language = "fr" | "en";

function loadDictionary(filename: string): string[] {
  const filepath = path.join(import.meta.dir, "..", "data", filename);
  const content = readFileSync(filepath, "utf-8");
  
  const words = content
    .split("\n")
    .map(word => word.trim().toUpperCase())
    .filter(word => word.length === 5 && /^[A-Z]+$/.test(word));
  
  return words;
}

export const FR_WORDS = loadDictionary("ods.txt");
export const EN_WORDS = loadDictionary("5letter.words.list.txt");

export function getWords(language: Language): string[] {
  return language === "fr" ? FR_WORDS : EN_WORDS;
}

export function getRandomWord(language: Language): string {
  const words = getWords(language);
  return words[Math.floor(Math.random() * words.length)];
}
