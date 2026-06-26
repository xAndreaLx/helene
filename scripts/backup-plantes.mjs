// Sauvegarde toutes les fiches plantes de la base dans un fichier JSON horodaté.
// À lancer AVANT toute opération destructive (reset, scaffold massif).
//
//   export $(grep -v '^#' .env | xargs) && node scripts/backup-plantes.mjs   # depuis Turso
//   node scripts/backup-plantes.mjs                                          # depuis le fichier local

import { createClient } from '@libsql/client';
import { mkdirSync, writeFileSync } from 'fs';

const url = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });
const { rows } = await client.execute('SELECT id, common_name, latin_name, description, data FROM plantes ORDER BY id');

mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = `backups/plantes-${stamp}.json`;

// On désérialise la colonne data (JSON) pour une sauvegarde lisible et ré-importable.
const dump = rows.map((r) => ({ ...r, data: r.data ? JSON.parse(r.data) : null }));
writeFileSync(file, JSON.stringify(dump, null, 2) + '\n');

console.log(`✅ ${rows.length} fiche(s) sauvegardée(s) dans ${file}`);
console.log('Cible :', url.startsWith('file:') ? url : 'Turso');
