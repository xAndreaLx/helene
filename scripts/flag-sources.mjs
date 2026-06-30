// Pose le flag de provenance `data.sources` (tableau) sur chaque fiche, par nom latin.
//
// Deux référentiels, deux flags :
//   - "infoflora" : espèce présente dans src/data/infoflora-600.json
//   - "sauvages"  : espèce observée dans l'export "Sauvages de ma rue"
//                   (src/data/sauvages-observees.json)
// Une fiche peut cumuler les deux (présente dans le 600 ET vue sur le terrain).
//
// Lecture-modification-écriture sur la colonne JSON `data` : seule la clé
// `sources` est touchée (dédupliquée), tout le reste est préservé. Idempotent.
//
//   node scripts/flag-sources.mjs --dry                                   # mesure (base locale)
//   export $(grep -v '^#' .env | xargs) && node scripts/flag-sources.mjs  # vers Turso

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const dry = process.argv.includes('--dry');

const infoflora = JSON.parse(readFileSync('src/data/infoflora-600.json', 'utf8'));
const observees = JSON.parse(readFileSync('src/data/sauvages-observees.json', 'utf8'));
const sauvages = JSON.parse(readFileSync('src/data/sauvages.json', 'utf8'));

const flagInfoflora = new Set(infoflora.map((e) => e.latin_name));
const flagSauvages = new Set(observees.map((e) => e.latin_name)); // noms déjà rabattus sur InfoFlora
// Palier d'ajout, par nom latin (réécrit s'il a été effacé par une édition admin).
const palierPar = new Map(sauvages.map((e) => [e.latin_name, e.palier]));

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
console.log(`Cible : ${dry ? '(dry-run)' : dbUrl.startsWith('file:') ? dbUrl : 'Turso'}`);

const { rows } = await db.execute('SELECT id, latin_name, data FROM plantes');

let updated = 0;
let both = 0;
const stats = { infoflora: 0, sauvages: 0 };
for (const row of rows) {
  const wanted = new Set();
  if (flagInfoflora.has(row.latin_name)) wanted.add('infoflora');
  if (flagSauvages.has(row.latin_name)) wanted.add('sauvages');
  if (!wanted.size) continue;

  const data = JSON.parse(row.data || '{}');
  const current = new Set(data.sources || []);
  const merged = new Set([...current, ...wanted]);
  if (merged.has('infoflora')) stats.infoflora++;
  if (merged.has('sauvages')) stats.sauvages++;
  if (merged.has('infoflora') && merged.has('sauvages')) both++;

  // palier à (re)poser ? (les espèces sauvages le portent, effaçable par une édition admin)
  const palierVoulu = palierPar.get(row.latin_name) ?? null;
  const palierAReposer = palierVoulu !== null && data.palier !== palierVoulu;

  // déjà à jour (sources ET palier) ?
  const sourcesAJour = current.size === merged.size && [...merged].every((s) => current.has(s));
  if (sourcesAJour && !palierAReposer) continue;

  data.sources = [...merged].sort();
  if (palierVoulu !== null) data.palier = palierVoulu;
  if (!dry) {
    await db.execute({ sql: 'UPDATE plantes SET data = ? WHERE id = ?', args: [JSON.stringify(data), row.id] });
  }
  updated++;
}

console.log(`\n— Bilan — ${updated} fiche(s) (re)flaguée(s) sur ${rows.length}.`);
console.log(`Flag "infoflora" : ${stats.infoflora}   Flag "sauvages" : ${stats.sauvages}   Les deux : ${both}`);
