// Extrait la liste complète (600) de la certification SBS/InfoFlora depuis le PDF.
//
// Le tableau (pages 12-22) est tabulé : "Nom \t Famille \t * \t * \t * \t Indigénat".
// Les niveaux sont cumulatifs (200 ⊂ 400 ⊂ 600) et les cellules vides sont
// supprimées à l'extraction, donc le NOMBRE d'étoiles = le niveau :
//   3 étoiles = liste 200   |   2 = 400   |   1 = 600.
//
//   node scripts/parse-certification.mjs
// → écrit src/data/infoflora-600.json : [{ latin_name, family, niveau }]

import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync } from 'fs';

const PDF = 'docs/certification-infoflora.pdf';
const OUT = 'src/data/infoflora-600.json';

const STARS_TO_NIVEAU = { 3: 200, 2: 400, 1: 600 };

const data = new Uint8Array(readFileSync(PDF));
const { text } = await new PDFParse({ data }).getText();

// Correction de ligature : l'extraction PDF rend "ti" par un "U" capital.
// On remplace les "U" internes (jamais l'initiale : Urtica, Ulmus, Ulmaceae).
const fixTi = (s) => s.replace(/(?<![\s])(?<=.)U/g, 'ti');

// Manglings résiduels (ligatures tt/tti) que la règle ci-dessus ne couvre pas.
const LATIN_FIX = {
  'Achillea erba-roGa subsp. moschata': 'Achillea erba-rotta subsp. moschata',
  'Melils melissophyllum': 'Melittis melissophyllum',
  'Neola nidus-avis': 'Neottia nidus-avis',
};

const seen = new Set();
const especes = [];

for (const rawLine of text.split('\n')) {
  // Colonnes séparées par tabulations, on nettoie et on retire les vides.
  const cols = rawLine.split('\t').map((c) => c.trim()).filter(Boolean);
  if (cols.length < 3) continue;

  let [latin_name, family, ...rest] = cols;
  // La 2ᵉ colonne doit être une famille botanique (suffixe -aceae).
  if (!/aceae$/.test(family)) continue;

  latin_name = fixTi(latin_name);
  latin_name = LATIN_FIX[latin_name] ?? latin_name;
  family = fixTi(family); // ex. GenUanaceae → Gentianaceae

  // Le nombre d'étoiles donne le niveau de certification.
  const stars = rest.filter((c) => c === '*').length;
  const niveau = STARS_TO_NIVEAU[stars];
  if (!niveau) continue;

  if (seen.has(latin_name)) continue;
  seen.add(latin_name);
  especes.push({ latin_name, family, niveau });
}

especes.sort((a, b) => a.latin_name.localeCompare(b.latin_name));

writeFileSync(OUT, JSON.stringify(especes, null, 2) + '\n');

const par = especes.reduce((acc, e) => ((acc[e.niveau] = (acc[e.niveau] || 0) + 1), acc), {});
console.log(`✅ ${especes.length} espèces écrites dans ${OUT}`);
console.log(`   niveau 200 : ${par[200] ?? 0}  |  400 : ${par[400] ?? 0}  |  600 : ${par[600] ?? 0}`);
