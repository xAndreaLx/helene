// Enrichit le nom vernaculaire français (common_name) des fiches dont le
// common_name est encore le nom latin (placeholder du scaffold).
//
// Source : Wikidata, clé sur le nom latin (P225) — donc aucun désalignement.
//   - priorité au titre d'article fr.wikipedia (nom français canonique),
//     sauf s'il est identique au nom latin,
//   - sinon au nom vernaculaire P1843 (fr),
//   - sinon on ne touche pas (reste en latin, à compléter à la main).
//
//   node scripts/enrich-noms-fr.mjs --dry                       # mesure, n'écrit rien
//   node scripts/enrich-noms-fr.mjs --limit 20                  # test base locale
//   export $(grep -v '^#' .env | xargs) && node scripts/enrich-noms-fr.mjs   # vers Turso

import { createClient } from '@libsql/client';

const UA = 'HeleneFloraBot/1.0 (contact: a.lucianoxvx@gmail.com)';
const SPARQL = 'https://query.wikidata.org/sparql';

const dry = process.argv.includes('--dry');
const limArg = process.argv.indexOf('--limit');
const limit = limArg !== -1 ? parseInt(process.argv[limArg + 1], 10) : null;

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Normalise un nom latin pour l'interrogation : retire aggr./s.l./s.str. et le
// niveau sous-spécifique (subsp./var.) pour retomber sur le binôme indexé par Wikidata.
const normLatin = (s) =>
  s
    .replace(/\s+(aggr\.|s\.\s*l\.|s\.\s*str\.)$/i, '')
    .replace(/\s+(subsp\.|var\.)\s+.*$/i, '')
    .trim();

// Interroge Wikidata pour un lot de noms latins → { name: {wp, label, p1843[]} }
async function queryBatch(names) {
  const values = names.map((n) => JSON.stringify(n)).join(' ');
  const q = `SELECT ?name ?common ?wp ?label WHERE {
    VALUES ?name { ${values} }
    ?t wdt:P225 ?name .
    OPTIONAL { ?t wdt:P1843 ?common . FILTER(LANG(?common)='fr') }
    OPTIONAL { ?art schema:about ?t ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?wp . }
    OPTIONAL { ?t rdfs:label ?label . FILTER(LANG(?label)='fr') }
  }`;
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const json = await res.json();
  const map = {};
  for (const b of json.results.bindings) {
    const n = b.name.value;
    map[n] ??= { wp: null, label: null, p1843: [] };
    if (b.wp) map[n].wp = b.wp.value;
    if (b.label) map[n].label = b.label.value;
    if (b.common) map[n].p1843.push(b.common.value);
  }
  return map;
}

// Choisit le meilleur nom FR pour un taxon (ou null). `key` = nom latin interrogé,
// pour rejeter un titre/label identique au nom scientifique.
function frName(key, entry) {
  if (!entry) return null;
  const isLatin = (v) => v.toLowerCase() === key.toLowerCase();
  if (entry.wp && !isLatin(entry.wp)) return entry.wp;
  if (entry.p1843.length) return cap(entry.p1843[0].split(',')[0].trim());
  if (entry.label && !isLatin(entry.label)) return cap(entry.label);
  return null;
}

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
console.log(`Cible : ${dry ? '(dry-run)' : dbUrl.startsWith('file:') ? dbUrl : 'Turso'}`);

// Fiches encore en placeholder (common_name === latin_name) : on ne touche pas aux noms déjà saisis.
let { rows } = await db.execute('SELECT id, common_name, latin_name FROM plantes WHERE common_name = latin_name');
if (limit) rows = rows.slice(0, limit);
console.log(`${rows.length} fiche(s) à enrichir (placeholder).\n`);

// On interroge sur le binôme normalisé (gère aggr./subsp.).
const queryNames = [...new Set(rows.map((r) => normLatin(r.latin_name)))];
let map = {};
for (const batch of chunk(queryNames, 80)) {
  Object.assign(map, await queryBatch(batch));
}

let updated = 0;
const misses = [];
for (const row of rows) {
  const key = normLatin(row.latin_name);
  const fr = frName(key, map[key]);
  if (!fr) {
    misses.push(row.latin_name);
    continue;
  }
  if (!dry) {
    await db.execute({ sql: 'UPDATE plantes SET common_name = ? WHERE id = ?', args: [fr, row.id] });
  }
  updated++;
  console.log(`  ✅ ${row.latin_name} → ${fr}`);
}

console.log(`\n— Bilan — ${updated}/${rows.length} nommées (${Math.round((updated / rows.length) * 100)} %)`);
console.log(`À compléter à la main (${misses.length}) : ${misses.join(', ')}`);
