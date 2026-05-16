import { getWords } from "./dictionaries";

/**
 * Génère le mot du jour basé sur la date.
 * Le même mot est utilisé pour tous les joueurs le même jour.
 * Cela évite les triche (modification du horloge système).
 */
export function getDailyWord(language: "fr" | "en", date: string): string {
  const words = getWords(language);
  
  // Convertir la date en nombre (nombre de jours depuis l'époque)
  const d = new Date(date);
  const epoch = new Date("2024-01-01");
  const daysSinceEpoch = Math.floor((d.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  
  // Utiliser ce nombre comme index pour sélectionner un mot
  // Utiliser modulo pour s'assurer qu'on ne dépasse pas la longueur du tableau
  const index = Math.abs(daysSinceEpoch) % words.length;
  
  return words[index];
}

/**
 * Obtient la date d'aujourd'hui au format YYYY-MM-DD
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}
