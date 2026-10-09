import { Events } from 'discord.js';
import type { EventModule } from './types.js';

export const error: EventModule<Events.Error> = {
  name: Events.Error,
  execute: (_client, err) => {
    console.error('Client error:', err);
  },
};
