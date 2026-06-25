// src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// libsql gère le même driver en local et en prod :
//  - dev   : TURSO_DATABASE_URL absent → fichier local "file:sqlite.db"
//  - prod  : TURSO_DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN (Turso)
// (import.meta.env côté Astro/Vite, process.env côté scripts Node.)
const env = (key: string): string | undefined =>
  // @ts-ignore - import.meta.env n'existe que sous Vite/Astro
  (typeof import.meta !== 'undefined' && import.meta.env?.[key]) ?? process.env[key];

const url = env('TURSO_DATABASE_URL') ?? 'file:sqlite.db';
const authToken = env('TURSO_AUTH_TOKEN');

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
