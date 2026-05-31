/**
 * Discord Slash Commands Registration
 * Registers the bot's slash commands with Discord API
 */

interface SlashCommand {
  name: string;
  description: string;
  description_localizations?: Record<string, string>;
  name_localizations?: Record<string, string>;
}

export async function registerSlashCommands(): Promise<void> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!clientId || !botToken) {
    console.warn("⚠️  Discord credentials incomplete - skipping command registration");
    console.warn("   Required: DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN");
    return;
  }

  const commands: SlashCommand[] = [
    {
      name: "yaplay",
      description: "Launch the Wordle game",
      name_localizations: {
        fr: "yajouer",
      },
      description_localizations: {
        fr: "Lancer le jeu Wordle",
      },
    },
    {
      name: "yawordle",
      description: "Start a new Wordle game",
      name_localizations: {
        fr: "yawordle",
      },
      description_localizations: {
        fr: "Démarrer une partie de Wordle",
      },
    },
  ];

  try {
    console.log("🔧 Registering Discord slash commands...");

    const response = await fetch(
      `https://discord.com/api/v10/applications/${clientId}/commands`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Failed to register Discord commands:", error);
      return;
    }

    const registeredCommands = await response.json();
    console.log(`✅ Successfully registered ${registeredCommands.length} Discord slash commands:`);
    registeredCommands.forEach((cmd: any) => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });
  } catch (error) {
    console.error("❌ Error registering Discord commands:", error);
  }
}
