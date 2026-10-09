import { Events } from 'discord.js';
import type { EventModule } from './types.js';

export const ready: EventModule<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: (_client, c) => {
    console.log(`Logged in as ${c.user.tag}`);
  },
};
