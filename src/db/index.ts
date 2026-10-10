import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { config } from '../config.js';
import * as schema from './schema.js';

type Db = BetterSQLite3Database<typeof schema>;

let instance: Db | undefined;
let connection: Database.Database | undefined;

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function getDb(): Db {
  if (instance) return instance;

  mkdirSync(dirname(config.dbPath), { recursive: true });

  connection = new Database(config.dbPath);
  connection.pragma('journal_mode = WAL');

  const db = drizzle(connection, { schema });
  migrate(db, { migrationsFolder });

  instance = db;
  return db;
}

export function closeDb(): void {
  if (connection) {
    connection.close();
    connection = undefined;
    instance = undefined;
  }
}
