import { serve } from "bun";
import { getRandomWord, getWords } from "./dictionaries";
import { initializeDatabase, getPlayerStats, createOrUpdatePlayerStats, saveGameRecord, getGameRecord } from "./db";
import { getDailyWord, getTodayDate } from "./dailyWord";
import path from "path";

const port = parseInt(process.env.PORT || "3000", 10);
const distDir = path.join(import.meta.dir, "..", "dist");

console.log(`📖 Dictionaries loaded at startup`);
console.log(`💾 Initializing database...`);
initializeDatabase();
console.log(`✓ Database initialized`);

const server = serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    
    // API endpoints
    if (url.pathname === "/api/random-word") {
      const language = (url.searchParams.get("lang") || "fr") as "fr" | "en";
      const word = getRandomWord(language);
      return Response.json({ word });
    }

    if (url.pathname === "/api/validate-word") {
      const language = (url.searchParams.get("lang") || "fr") as "fr" | "en";
      const word = (url.searchParams.get("word") || "").toUpperCase();
      const words = getWords(language);
      const isValid = words.includes(word);
      return Response.json({ isValid });
    }

    // Daily word endpoint - returns the word of the day
    if (url.pathname === "/api/daily-word") {
      const language = (url.searchParams.get("lang") || "fr") as "fr" | "en";
      const date = url.searchParams.get("date") || getTodayDate();
      const word = getDailyWord(language, date);
      return Response.json({ word, date });
    }

    // Save player stats
    if (url.pathname === "/api/player/save" && req.method === "POST") {
      try {
        const body = await req.json() as any;
        const { playerId, stats } = body;

        if (!playerId || typeof playerId !== "string") {
          return Response.json({ error: "Invalid playerId" }, { status: 400 });
        }

        // Basic UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(playerId)) {
          return Response.json({ error: "Invalid UUID format" }, { status: 400 });
        }

        createOrUpdatePlayerStats(playerId, stats);
        return Response.json({ success: true });
      } catch (error) {
        console.error("Error saving player stats:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Save game record
    if (url.pathname === "/api/game/save" && req.method === "POST") {
      try {
        const body = await req.json() as any;
        const { playerId, date, solution, attempts, won } = body;

        if (!playerId || !date || !solution || !Array.isArray(attempts) || typeof won !== "boolean") {
          return Response.json({ error: "Invalid game data" }, { status: 400 });
        }

        saveGameRecord({ playerId, date, solution, attempts, won });
        return Response.json({ success: true });
      } catch (error) {
        console.error("Error saving game record:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Get player stats
    if (url.pathname.startsWith("/api/player/") && req.method === "GET") {
      const playerId = url.pathname.replace("/api/player/", "");

      if (!playerId) {
        return Response.json({ error: "Invalid playerId" }, { status: 400 });
      }

      const stats = getPlayerStats(playerId);

      if (!stats) {
        // Return default stats for new players
        return Response.json({
          playerId,
          gamesPlayed: 0,
          gamesWon: 0,
          currentStreak: 0,
          maxStreak: 0,
          lastPlayedDate: null,
        });
      }

      return Response.json(stats);
    }

    // Get today's game record
    if (url.pathname === "/api/game/today" && req.method === "GET") {
      try {
        const playerId = url.searchParams.get("playerId");
        const language = (url.searchParams.get("lang") || "fr") as "fr" | "en";

        if (!playerId) {
          return Response.json({ error: "Missing playerId" }, { status: 400 });
        }

        const date = getTodayDate();
        const gameRecord = getGameRecord(playerId, date);

        return Response.json({ gameRecord, date });
      } catch (error) {
        console.error("Error fetching game record:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Static files
    let pathname = url.pathname;

    // Route /en to dist/en.html
    // Route / and /fr to dist/index.html
    if (pathname === "/" || pathname === "/fr") {
      pathname = "/index.html";
    } else if (pathname === "/en" || pathname === "/en/") {
      pathname = "/en.html";
    }

    // Remove leading slash for file path
    const filePath = path.join(distDir, pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(distDir)) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(Bun.file(filePath));
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at http://localhost:${port}`);
