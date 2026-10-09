import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.Error, (err) => {
  console.error('Client error:', err);
});

async function main(): Promise<void> {
  await client.login(config.discordToken);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
