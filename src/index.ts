import { serve } from "bun";
import { getRandomWord, getWords } from "./dictionaries";
import path from "path";

const port = parseInt(process.env.PORT || "3000", 10);
const distDir = path.join(import.meta.dir, "..", "dist");

console.log(`📖 Dictionaries loaded at startup`);

const server = serve({
  port,
  fetch(req) {
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
