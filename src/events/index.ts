import type { EventModule } from './types.js';
import { ready } from './ready.js';
import { error } from './error.js';
import { messageCreate } from './messageCreate.js';

/**
 * All event modules to register. To add a new event: create a module that
 * exports an `EventModule`, then add it to this list. The registration loop
 * in `index.ts` never needs to change.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const events: EventModule<any>[] = [ready, error, messageCreate];
