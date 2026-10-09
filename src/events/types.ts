import type { Client, ClientEvents } from 'discord.js';

export interface EventModule<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (client: Client, ...args: ClientEvents[K]) => void | Promise<void>;
}
