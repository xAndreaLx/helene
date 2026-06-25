import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts', // Où on décrit nos tables
  out: './drizzle',             // Historique des migrations généré par Drizzle
  dialect: 'turso',             // libsql / Turso (gère aussi les URL "file:" en local)
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:sqlite.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
