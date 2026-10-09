import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { events } from './events/index.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(client, ...args));
  } else {
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
}

async function main(): Promise<void> {
  await client.login(config.discordToken);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
