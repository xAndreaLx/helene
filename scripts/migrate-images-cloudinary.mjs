// Migre les images locales (public/plantes/*) vers Cloudinary, puis met à jour
// image_ref de chaque fiche avec l'URL Cloudinary hébergée.
// Objectif : modèle de stockage uniforme + images servies par Cloudinary
// (plus besoin de committer/déployer public/plantes pour la prod).
//
// Idempotent : une fiche dont image_ref est déjà une URL http(s) est ignorée.
//
//   export $(grep -v '^#' .env | xargs) && node scripts/migrate-images-cloudinary.mjs            # vers Turso
//   export $(grep -v '^#' .env | xargs) && node scripts/migrate-images-cloudinary.mjs --limit 3  # test

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';

const CLOUD = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;
if (!CLOUD || !PRESET) {
  console.error('❌ PUBLIC_CLOUDINARY_CLOUD_NAME / PUBLIC_CLOUDINARY_UPLOAD_PRESET manquants (charge ton .env).');
  process.exit(1);
}

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadToCloudinary(path) {
  const blob = new Blob([readFileSync(path)]);
  const form = new FormData();
  form.append('file', blob, path.split('/').pop());
  form.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.secure_url) throw new Error(json.error?.message || 'échec');
  return json.secure_url;
}

const url = process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
console.log('Cible :', url.startsWith('file:') ? url : 'Turso', '\n');

const { rows } = await db.execute('SELECT id, data FROM plantes ORDER BY id');
let migrated = 0;
let skipped = 0;
let done = 0;

for (const row of rows) {
  if (limit && done >= limit) break;
  const data = row.data ? JSON.parse(row.data) : {};
  const ref = data.image_ref;

  if (!ref || /^https?:\/\//.test(ref)) {
    skipped++;
    continue; // pas d'image, ou déjà une URL distante (Cloudinary/Commons)
  }

  const localPath = 'public' + ref; // ex. /plantes/x.jpg -> public/plantes/x.jpg
  if (!existsSync(localPath)) {
    console.log(`  ⚠️  fichier introuvable, ignoré : ${localPath}`);
    skipped++;
    continue;
  }

  done++;
  try {
    await sleep(150); // courtoisie envers l'API Cloudinary
    const cloudUrl = await uploadToCloudinary(localPath);
    data.image_ref = cloudUrl;
    await db.execute({ sql: 'UPDATE plantes SET data = ? WHERE id = ?', args: [JSON.stringify(data), row.id] });
    migrated++;
    console.log(`  ✅ ${row.id} → ${cloudUrl}`);
  } catch (err) {
    console.log(`  ❌ ${row.id} → ${err.message}`);
  }
}

console.log(`\nTerminé. ${migrated} migrée(s), ${skipped} ignorée(s).`);
