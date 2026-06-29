// Stampe le niveau de certification (200/400/600) sur chaque fiche, par nom latin.
//
// Lit src/data/infoflora-600.json et fusionne `niveau` dans la colonne JSON `data`
// (lecture-modification-écriture) : aucune autre clé n'est touchée, donc les
// sections et images saisies à la main sont préservées. Idempotent.
//
//   node scripts/set-niveaux.mjs --dry                                  # mesure
//   export $(grep -v '^#' .env | xargs) && node scripts/set-niveaux.mjs # vers Turso

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const dry = process.argv.includes('--dry');

const especes = JSON.parse(readFileSync('src/data/infoflora-600.json', 'utf8'));
const niveauPar = new Map(especes.map((e) => [e.latin_name, e.niveau]));

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
console.log(`Cible : ${dry ? '(dry-run)' : dbUrl.startsWith('file:') ? dbUrl : 'Turso'}`);

const { rows } = await db.execute('SELECT id, latin_name, data FROM plantes');

let updated = 0;
const inconnues = [];
for (const row of rows) {
  const niveau = niveauPar.get(row.latin_name);
  if (!niveau) {
    inconnues.push(row.latin_name);
    continue;
  }
  const data = JSON.parse(row.data || '{}');
  if (data.niveau === niveau) continue; // déjà à jour
  data.niveau = niveau;
  if (!dry) {
    await db.execute({ sql: 'UPDATE plantes SET data = ? WHERE id = ?', args: [JSON.stringify(data), row.id] });
  }
  updated++;
}

console.log(`\n— Bilan — ${updated} fiche(s) (re)stampée(s) sur ${rows.length}.`);
if (inconnues.length) console.log(`Hors liste InfoFlora (${inconnues.length}) : ${inconnues.join(', ')}`);
