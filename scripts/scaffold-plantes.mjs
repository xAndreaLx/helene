// Crée des fiches "squelettes" fiables à partir de la liste InfoFlora (600) :
// identité (nom latin) + classification (famille) + niveau de certification
// + planche botanique du domaine public récupérée sur Wikimedia Commons.
//
// La morphologie reste vide : elle sera complétée à la main via /admin.
// Idempotent : une fiche existante (même id) est mise à jour, pas dupliquée.
//
//   node scripts/scaffold-plantes.mjs --random 10            # test sur 10 espèces (base locale)
//   node scripts/scaffold-plantes.mjs --dry                  # n'écrit rien, mesure la couverture
//   node scripts/scaffold-plantes.mjs --niveau 400,600       # seulement ces niveaux
//   node scripts/scaffold-plantes.mjs --niveau 400,600 --missing-only  # ne (re)tente que les fiches sans image
//   export $(grep -v '^#' .env | xargs) && node scripts/scaffold-plantes.mjs --niveau 400,600   # vers Turso

import { createClient } from '@libsql/client';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';

const UA = 'HeleneFloraBot/1.0 (contact: a.lucianoxvx@gmail.com)';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const PUBLIC_IMG_DIR = 'public/plantes';

// Séries d'illustrations botaniques du domaine public, par ordre de préférence.
// (mot-clé dans le nom de fichier → crédit affiché sur la fiche)
const SERIES = [
  { re: /thomé|thome|Illustration[ _]/i, src: 'O. W. Thomé, Flora von Deutschland, 1885 (domaine public)' },
  { re: /sturm/i, src: 'J. Sturm, Deutschlands Flora in Abbildungen (domaine public)' },
  { re: /köhler|koehler|koeh-/i, src: "Köhler's Medizinal-Pflanzen, 1887 (domaine public)" },
  { re: /lindman|nordens flora/i, src: 'C. A. M. Lindman, Bilder ur Nordens Flora (domaine public)' },
  { re: /reichenbach/i, src: 'L. Reichenbach, Icones Florae Germanicae (domaine public)' },
  { re: /flora danica/i, src: 'Flora Danica (domaine public)' },
  { re: /florabatava|flora batava/i, src: 'Flora Batava (domaine public)' },
];

// --- args ---
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const getNum = (flag) => {
  const a = args.find((x) => x.startsWith(`${flag}=`)) ?? (args[args.indexOf(flag) + 1] ?? '');
  const n = parseInt(String(a).replace(`${flag}=`, ''), 10);
  return Number.isFinite(n) ? n : null;
};
const randomN = args.includes('--random') ? getNum('--random') : null;
const limitN = args.includes('--limit') ? getNum('--limit') : null;
const missingOnly = args.includes('--missing-only');
// --niveau 400,600 : ne traite que ces niveaux de certification.
const niveauArg = args.find((x) => x.startsWith('--niveau=')) ?? (args[args.indexOf('--niveau') + 1] ?? '');
const niveaux = args.includes('--niveau')
  ? String(niveauArg).replace('--niveau=', '').split(',').map((n) => parseInt(n, 10)).filter(Boolean)
  : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch poli : User-Agent + retries avec backoff sur 429/5xx (rate limit Wikimedia).
async function politeFetch(url, { binary = false } = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * (attempt + 1);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
  }
  throw new Error('429 (rate limit persistant)');
}

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Binôme de base pour la recherche d'image : retire aggr./s.l./s.str. et le
// niveau sous-spécifique (subsp./var.) → on retombe sur l'espèce indexée par
// Commons (l'id de la fiche garde, lui, le nom complet d'origine).
const normLatin = (s) =>
  s
    .replace(/\s+(aggr\.|s\.\s*l\.|s\.\s*str\.)$/i, '')
    .replace(/\s+(subsp\.|var\.)\s+.*$/i, '')
    .trim();

// --- liste d'espèces ---
let especes = JSON.parse(readFileSync('src/data/infoflora-600.json', 'utf8'));
if (niveaux) especes = especes.filter((e) => niveaux.includes(e.niveau));
if (randomN) especes = [...especes].sort(() => Math.random() - 0.5).slice(0, randomN);
else if (limitN) especes = especes.slice(0, limitN);

// Nom de fichier local : on force .jpg pour les .tif (rendus en JPEG par Commons).
const savedName = (title) =>
  title.replace('File:', '').replace(/ /g, '_').replace(/\.tiff?$/i, '.jpg');

// Renvoie une URL d'image web-compatible : on demande une miniature rendue
// (iiurlwidth) → Commons convertit même les .tif en JPEG. Fallback sur l'original.
async function fileUrl(title) {
  const url = `${COMMONS}?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=1000`;
  const json = await politeFetch(url);
  const page = Object.values(json.query.pages)[0];
  if ('missing' in page) return null;
  const ii = page.imageinfo?.[0];
  return ii ? (ii.thumburl ?? ii.url) : null;
}

// Cherche une illustration PD : d'abord la planche Thomé par nom direct,
// sinon on scanne la catégorie Commons de l'espèce et on retient la meilleure
// planche d'une série connue (Thomé > Sturm > Lindman > …), rasters préférés.
async function findIllustration(latin) {
  // On cherche sur le binôme de base (sans aggr./subsp.) — les planches Commons
  // sont classées à l'espèce, pas au rang infraspécifique.
  const espece = normLatin(latin);

  // 1) Thomé par nom de fichier direct (deux variantes de suffixe).
  const base = `Illustration_${espece.replace(/ /g, '_')}`;
  for (const title of [`File:${base}0.jpg`, `File:${base}.jpg`]) {
    const url = await fileUrl(title);
    if (url) return { url, file: savedName(title), source: SERIES[0].src };
  }

  // 2) Scan de la catégorie de l'espèce.
  const cat = `Category:${espece}`;
  const url = `${COMMONS}?action=query&format=json&list=categorymembers&cmtitle=${encodeURIComponent(cat)}&cmtype=file&cmlimit=500`;
  const json = await politeFetch(url);
  const files = (json.query?.categorymembers ?? [])
    .map((m) => m.title)
    // Exclut les pages de texte/description (ex. Sturm "... DESC.jpg"), pas des planches.
    .filter((f) => !/[ _]DESC\b|description|caption|text/i.test(f));

  for (const serie of SERIES) {
    const matches = files.filter((f) => serie.re.test(f));
    if (!matches.length) continue;
    // raster d'abord (.jpg/.png), sinon le premier disponible.
    const chosen = matches.find((f) => /\.(jpe?g|png|tiff?)$/i.test(f)) ?? matches[0];
    const fileUrlStr = await fileUrl(chosen);
    if (fileUrlStr) return { url: fileUrlStr, file: savedName(chosen), source: serie.src };
  }
  return null;
}

async function download(url, dest) {
  const buf = await politeFetch(url, { binary: true });
  writeFileSync(dest, buf);
}

// --- DB ---
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const client = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
if (!dry) mkdirSync(PUBLIC_IMG_DIR, { recursive: true });

// --missing-only : on saute les fiches qui ont déjà une image (reprise après un
// run partiel) → on ne re-tente que les espèces encore sans planche.
if (missingOnly) {
  const { rows } = await client.execute("SELECT id FROM plantes WHERE json_extract(data, '$.image_ref') IS NOT NULL");
  const dejaImagees = new Set(rows.map((r) => r.id));
  const avant = especes.length;
  especes = especes.filter((e) => !dejaImagees.has(slugify(e.latin_name)));
  console.log(`--missing-only : ${avant - especes.length} fiche(s) déjà imagée(s) ignorée(s).`);
}

console.log(`Cible : ${dry ? '(dry-run, aucune écriture)' : dbUrl.startsWith('file:') ? dbUrl : 'Turso'}`);
console.log(`Espèces à traiter : ${especes.length}\n`);

const aFaire = [];
let avecImage = 0;

for (const { latin_name, family, niveau } of especes) {
  await sleep(300); // courtoisie envers l'API Wikimedia (évite le rate limit 429)
  const id = slugify(latin_name);
  let image_ref;
  let image_source;

  try {
    const plate = await findIllustration(latin_name);
    if (plate) {
      image_ref = `/plantes/${plate.file}`;
      image_source = plate.source;
      const dest = `${PUBLIC_IMG_DIR}/${plate.file}`;
      if (!dry && !existsSync(dest)) await download(plate.url, dest);
      avecImage++;
      console.log(`  ✅ ${latin_name} → ${plate.source.split(',')[0]}`);
    } else {
      aFaire.push(latin_name);
      console.log(`  ❌ ${latin_name} → image à faire`);
    }
  } catch (err) {
    aFaire.push(latin_name);
    console.log(`  ⚠️  ${latin_name} → erreur (${err.message})`);
  }

  if (!dry) {
    const data = { classification: { famille: [family] }, niveau };
    if (image_ref) {
      data.image_ref = image_ref;
      data.image_source = image_source;
    }
    await client
      .execute({
        sql: `INSERT INTO plantes (id, common_name, latin_name, description, data)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET common_name=excluded.common_name,
                latin_name=excluded.latin_name, data=excluded.data`,
        // common_name = nom latin par défaut (placeholder), à enrichir via /admin.
        args: [id, latin_name, latin_name, '', JSON.stringify(data)],
      });
  }
}

console.log(`\n— Bilan —`);
console.log(`Planches trouvées : ${avecImage}/${especes.length} (${Math.round((avecImage / especes.length) * 100)} %)`);
console.log(`À faire à la main : ${aFaire.length}`);
if (aFaire.length) console.log('  ' + aFaire.join(', '));
