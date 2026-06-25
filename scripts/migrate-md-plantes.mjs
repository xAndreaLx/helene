// Migration ponctuelle : importe les fiches Markdown de src/content/flore/plantes/
// dans la base (libsql/Turso), et copie leurs images vers public/plantes/.
//
// Cible : TURSO_DATABASE_URL si défini, sinon le fichier local sqlite.db.
// Idempotent : une fiche déjà présente (même id) est ignorée, jamais écrasée.
//
//   node scripts/migrate-md-plantes.mjs
//   export $(grep -v '^#' .env | xargs) && node scripts/migrate-md-plantes.mjs   # vers Turso

import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createClient } from '@libsql/client';

const PLANTES_DIR = 'src/content/flore/plantes';
const ASSETS_DIR = 'src/assets/flore';
const PUBLIC_IMG_DIR = 'public/plantes';

const SECTION_KEYS = [
  'classification',
  'generalites',
  'appareil_vegetatif',
  'inflorescence',
  'fleur_anatomie',
  'fruits_et_graines',
];

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function parseFile(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`Frontmatter introuvable dans ${file}`);
  const fm = yaml.load(m[1]) ?? {};
  const body = m[2].trim();
  return { fm, body };
}

function buildPlante(file) {
  const { fm, body } = parseFile(file);
  if (!fm.latin_name) throw new Error(`Nom latin manquant dans ${file}`);

  // Sections : soit à plat sur le frontmatter, soit dans le wrapper "caracteristiques".
  const source = fm.caracteristiques ?? fm;
  const data = {};
  for (const key of SECTION_KEYS) {
    if (source[key]) data[key] = source[key];
  }

  // Image : on copie l'asset vers public/ et on pointe vers l'URL publique.
  if (fm.image_ref) {
    const base = path.basename(fm.image_ref);
    const srcPath = path.join(ASSETS_DIR, base);
    if (existsSync(srcPath)) {
      mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
      copyFileSync(srcPath, path.join(PUBLIC_IMG_DIR, base));
      data.image_ref = `/plantes/${base}`;
    } else {
      console.warn(`  ⚠️  image absente, ignorée : ${srcPath}`);
    }
  }
  if (fm.image_source) data.image_source = fm.image_source;

  return {
    id: slugify(fm.latin_name),
    common_name: fm.common_name ?? fm.latin_name,
    latin_name: fm.latin_name,
    // Corps markdown en priorité, sinon description du frontmatter.
    description: body || fm.description || '',
    data,
  };
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  console.log(`Cible : ${url.startsWith('file:') ? url : 'Turso (' + url.split('.')[0] + '…)'}\n`);

  const client = createClient({ url, authToken });
  const files = readdirSync(PLANTES_DIR).filter((f) => f.endsWith('.md'));

  let created = 0;
  let skipped = 0;
  for (const f of files) {
    const p = buildPlante(path.join(PLANTES_DIR, f));
    const existing = await client.execute({
      sql: 'SELECT id FROM plantes WHERE id = ?',
      args: [p.id],
    });
    if (existing.rows.length > 0) {
      console.log(`= déjà présent, ignoré : ${p.id}`);
      skipped++;
      continue;
    }
    await client.execute({
      sql: 'INSERT INTO plantes (id, common_name, latin_name, description, data) VALUES (?, ?, ?, ?, ?)',
      args: [p.id, p.common_name, p.latin_name, p.description, JSON.stringify(p.data)],
    });
    console.log(`+ importé : ${p.id} (${p.common_name})`);
    created++;
  }

  console.log(`\nTerminé. ${created} créée(s), ${skipped} ignorée(s) sur ${files.length} fiche(s).`);
}

main();
