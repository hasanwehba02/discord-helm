import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  discordClientId: required('DISCORD_CLIENT_ID'),
  // Optional: when set, slash commands register to this guild only (fast dev).
  discordGuildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
} as const;
