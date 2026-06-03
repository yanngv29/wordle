import { serve } from "bun";
import { getRandomWord, getWords } from "./dictionaries";
import { initializeDatabase, getPlayerStats, createOrUpdatePlayerStats, saveGameRecord, getGameRecord } from "./db";
import { getDailyWord, getTodayDate } from "./dailyWord";
import { getS3Service } from "./services/s3-service";
import path from "path";
import { verifyDiscordSignature } from "./discord/verify";
import { registerSlashCommands } from "./discord/commands";

const port = parseInt(process.env.PORT || "3000", 10);
const distDir = path.join(import.meta.dir, "..", "dist");

console.log(`📖 Dictionaries loaded at startup`);
console.log(`💾 Initializing database...`);
await initializeDatabase();
console.log(`✓ Database initialized`);

// Initialize S3 service
let s3Service: any;
try {
  s3Service = getS3Service();
  await s3Service.verifyBucket();
  console.log(`✓ S3 service initialized`);
} catch (error) {
  console.warn(`⚠️  S3 service initialization failed: ${error}. Avatar upload will be disabled.`);
}

// Register Discord slash commands
await registerSlashCommands();

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

        // Basic UUID or Discord Snowflake format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const discordRegex = /^\d{17,21}$/;
        if (!uuidRegex.test(playerId) && !discordRegex.test(playerId)) {
          return Response.json({ error: "Invalid playerId format" }, { status: 400 });
        }

        await createOrUpdatePlayerStats(playerId, stats);
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

        await saveGameRecord({ playerId, date, solution, attempts, won });
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

      const stats = await getPlayerStats(playerId);

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
        const gameRecord = await getGameRecord(playerId, date);

        return Response.json({ gameRecord, date });
      } catch (error) {
        console.error("Error fetching game record:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Discord API config endpoint
    if (url.pathname === "/api/discord/config" && req.method === "GET") {
      return Response.json({
        clientId: process.env.DISCORD_CLIENT_ID || "",
      });
    }

    // Discord OAuth2 token exchange endpoint
    if (url.pathname === "/api/discord/auth" && req.method === "POST") {
      try {
        const body = await req.json() as any;
        const { code } = body;
        if (!code) {
          return Response.json({ error: "Missing code" }, { status: 400 });
        }

        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return Response.json({ error: "Discord credentials are not configured on the server" }, { status: 500 });
        }

        const response = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
          }),
        });

        const data = await response.json() as any;
        if (data.error) {
          console.error("Discord token exchange error:", data);
          return Response.json({ error: data.error_description || "Token exchange failed" }, { status: 400 });
        }

        return Response.json({
          access_token: data.access_token,
        });
      } catch (error) {
        console.error("Error in /api/discord/auth:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Discord Bot interactions webhook endpoint
    if (url.pathname === "/api/discord/interactions" && req.method === "POST") {
      try {
        console.log("\n🎮 Discord Interaction Received");
        
        const signature = req.headers.get("x-signature-ed25519") || "";
        const timestamp = req.headers.get("x-signature-timestamp") || "";
        const rawBody = await req.text();

        const publicKey = process.env.DISCORD_PUBLIC_KEY;
        if (!publicKey) {
          console.error("❌ Discord public key not configured");
          return Response.json({ error: "Discord public key not configured" }, { status: 500 });
        }

        console.log("🔍 Verifying signature...");
        const isVerified = verifyDiscordSignature(rawBody, signature, timestamp, publicKey);
        if (!isVerified) {
          console.error("❌ Signature verification failed");
          return new Response("Invalid signature", { status: 401 });
        }
        console.log("✅ Signature verified");

        const interaction = JSON.parse(rawBody);
        console.log(`📋 Interaction Type: ${interaction.type}`);

        // Type 1: Ping
        if (interaction.type === 1) {
          console.log("🔔 Ping interaction - responding with pong");
          return Response.json({ type: 1 });
        }

        // Type 2: ApplicationCommand (Slash command)
        if (interaction.type === 2) {
          const commandName = interaction.data.name;
          const userId = interaction.member?.user?.id || interaction.user?.id || "unknown";
          const username = interaction.member?.user?.username || interaction.user?.username || "unknown";
          
          console.log(`⚡ Slash Command: /${commandName}`);
          console.log(`   User: ${username} (${userId})`);

          if (commandName === "yaplay" || commandName === "yawordle") {
            const clientId = process.env.DISCORD_CLIENT_ID || "";
            const response = {
              type: 4, // ChannelMessageWithSource
              data: {
                content: "🎮 **Prêt à jouer au Wordle ?** Cliquez sur le bouton ci-dessous pour lancer le jeu directement sous forme d'Activité Discord !",
                components: [
                  {
                    type: 1, // ActionRow
                    components: [
                      {
                        type: 2, // Button
                        style: 5, // Link button
                        label: "Lancer Wordle",
                        emoji: { name: "🎮" },
                        url: `https://discord.com/activities/${clientId}`,
                      },
                    ],
                  },
                ],
              },
            };
            console.log(`✅ Sending response for /${commandName}`);
            console.log(`   Content: "${response.data.content}"`);
            console.log(`   Activity URL: https://discord.com/activities/${clientId}`);
            return Response.json(response);
          } else {
            console.warn(`⚠️  Unknown command: /${commandName}`);
            const errorResponse = {
              type: 4,
              data: {
                content: `❌ Commande inconnue: /${commandName}`,
                flags: 64, // Ephemeral message
              }
            };
            return Response.json(errorResponse);
          }
        }

        console.warn(`⚠️  Unhandled interaction type: ${interaction.type}`);
        return Response.json({ 
          type: 4,
          data: {
            content: "❌ Type d'interaction non supporté",
            flags: 64
          }
        });
      } catch (error) {
        console.error("❌ Error in /api/discord/interactions:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Avatar endpoints
    if (url.pathname === "/api/avatar/upload" && req.method === "POST") {
      if (!s3Service) {
        return Response.json({ error: "Avatar service not configured" }, { status: 503 });
      }

      try {
        const contentType = req.headers.get("content-type") || "";
        
        if (!contentType.startsWith("multipart/form-data")) {
          return Response.json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
        }

        // Parse multipart form
        const formData = await req.formData();
        const playerId = formData.get("playerId") as string;
        const imageFile = formData.get("image") as File;

        if (!playerId || !imageFile) {
          return Response.json({ error: "Missing playerId or image" }, { status: 400 });
        }

        // Validate player ID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const discordRegex = /^\d{17,21}$/;
        if (!uuidRegex.test(playerId) && !discordRegex.test(playerId)) {
          return Response.json({ error: "Invalid playerId format" }, { status: 400 });
        }

        // Validate MIME type
        if (!imageFile.type.startsWith("image/")) {
          return Response.json({ error: "File must be an image" }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const avatarKey = await s3Service.uploadAvatar(playerId, imageBuffer);

        // Update player stats with avatar key
        const now = new Date().toISOString();
        await createOrUpdatePlayerStats(playerId, {
          avatarKey,
          avatarUpdatedAt: now,
        });

        return Response.json({
          success: true,
          avatarKey,
          message: "Avatar uploaded successfully",
        });
      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        return Response.json({ error: error.message || "Failed to upload avatar" }, { status: 400 });
      }
    }

    // Get avatar endpoint
    if (url.pathname.startsWith("/api/avatar/") && req.method === "GET") {
      if (!s3Service) {
        return Response.json({ error: "Avatar service not configured" }, { status: 503 });
      }

      try {
        const playerId = url.pathname.replace("/api/avatar/", "");

        if (!playerId) {
          return Response.json({ error: "Invalid playerId" }, { status: 400 });
        }

        // Get player stats to check avatarUpdatedAt for ETag
        const playerStats = await getPlayerStats(playerId);
        
        if (!playerStats || !playerStats.avatarKey) {
          return Response.json({ error: "Avatar not found" }, { status: 404 });
        }

        // Get avatar buffer from S3
        const imageBuffer = await s3Service.getAvatarBuffer(playerId);

        if (!imageBuffer) {
          return Response.json({ error: "Avatar not found in S3" }, { status: 404 });
        }

        // Generate ETag from avatarUpdatedAt
        const etag = `"${playerStats.avatarUpdatedAt}"`;
        
        // Check If-None-Match header
        if (req.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304 }); // Not Modified
        }

        // Return image with cache headers
        const cacheMaxAge = process.env.AVATAR_CACHE_MAX_AGE || "31536000";
        return new Response(imageBuffer, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": `public, max-age=${cacheMaxAge}`,
            "ETag": etag,
            "Last-Modified": playerStats.avatarUpdatedAt || new Date().toUTCString(),
          },
        });
      } catch (error: any) {
        console.error("Error retrieving avatar:", error);
        return Response.json({ error: "Failed to retrieve avatar" }, { status: 500 });
      }
    }

    // Delete avatar endpoint
    if (url.pathname.startsWith("/api/avatar/") && req.method === "DELETE") {
      if (!s3Service) {
        return Response.json({ error: "Avatar service not configured" }, { status: 503 });
      }

      try {
        const playerId = url.pathname.replace("/api/avatar/", "");

        if (!playerId) {
          return Response.json({ error: "Invalid playerId" }, { status: 400 });
        }

        // Delete from S3
        await s3Service.deleteAvatar(playerId);

        // Update player stats to clear avatar
        await createOrUpdatePlayerStats(playerId, {
          avatarKey: null,
          avatarUpdatedAt: null,
        });

        return Response.json({ success: true, message: "Avatar deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting avatar:", error);
        return Response.json({ error: error.message || "Failed to delete avatar" }, { status: 400 });
      }
    }

    // Static files
    let pathname = url.pathname;

    // Route /en to dist/en.html
    // Route / and /fr to dist/index.html
    // Route /terms to dist/terms.html
    // Route /privacy to dist/privacy.html
    if (pathname === "/" || pathname === "/fr") {
      pathname = "/index.html";
    } else if (pathname === "/en" || pathname === "/en/") {
      pathname = "/en.html";
    } else if (pathname === "/terms") {
      pathname = "/terms.html";
    } else if (pathname === "/privacy") {
      pathname = "/privacy.html";
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
