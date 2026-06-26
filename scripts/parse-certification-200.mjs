// Extrait la liste 200 de la certification SBS/InfoFlora depuis le PDF officiel.
//
// Le tableau (pages 12-22) est tabulé : "Nom \t Famille \t * \t * \t * \t Indigénat".
// Les niveaux sont cumulatifs (200 ⊂ 400 ⊂ 600) et les cellules vides sont
// supprimées à l'extraction, donc le NOMBRE d'étoiles = le niveau :
//   3 étoiles = liste 200   |   2 = 400   |   1 = 600.
//
//   node scripts/parse-certification-200.mjs
// → écrit src/data/infoflora-200.json : [{ latin_name, family }]

import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync } from 'fs';

const PDF = 'docs/certification-infoflora.pdf';
const OUT = 'src/data/infoflora-200.json';

const data = new Uint8Array(readFileSync(PDF));
const { text } = await new PDFParse({ data }).getText();

const seen = new Set();
const espece200 = [];

for (const rawLine of text.split('\n')) {
  // Colonnes séparées par tabulations, on nettoie et on retire les vides.
  const cols = rawLine.split('\t').map((c) => c.trim()).filter(Boolean);
  if (cols.length < 3) continue;

  let [latin_name, family, ...rest] = cols;
  // La 2ᵉ colonne doit être une famille botanique (suffixe -aceae).
  if (!/aceae$/.test(family)) continue;

  // Correction de ligature : l'extraction PDF rend "ti" par un "U" capital.
  // On remplace les "U" internes (jamais l'initiale de genre : Urtica, Ulmus).
  latin_name = latin_name.replace(/(?<![\s])(?<=.)U/g, 'ti');

  // Compte les étoiles ; 3 = présent dans la liste 200.
  const stars = rest.filter((c) => c === '*').length;
  if (stars !== 3) continue;

  if (seen.has(latin_name)) continue;
  seen.add(latin_name);
  espece200.push({ latin_name, family });
}

espece200.sort((a, b) => a.latin_name.localeCompare(b.latin_name));

writeFileSync(OUT, JSON.stringify(espece200, null, 2) + '\n');
console.log(`✅ ${espece200.length} espèces (liste 200) écrites dans ${OUT}`);
console.log('Aperçu :');
for (const e of espece200.slice(0, 8)) console.log(`  - ${e.latin_name} (${e.family})`);
