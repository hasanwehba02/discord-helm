import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${raw}`);
  }
  return parsed;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  discordClientId: required('DISCORD_CLIENT_ID'),
  // Optional: when set, slash commands register to this guild only (fast dev).
  discordGuildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
  dbPath: process.env.DB_PATH?.trim() || './data/discord-llm.sqlite',
  llmBaseUrl: process.env.LLM_BASE_URL?.trim() || 'http://localhost:11434/v1',
  llmModel: required('LLM_MODEL'),
  llmApiKey: process.env.LLM_API_KEY?.trim() || undefined,
  llmTemperature: optionalNumber('LLM_TEMPERATURE'),
  llmTimeoutMs: optionalNumber('LLM_TIMEOUT_MS') ?? 120_000,
} as const;
