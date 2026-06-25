export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { plantes, referentiels } from '../../db/schema';

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const POST: APIRoute = async ({ request }) => {
  console.log('🚀 Requête reçue sur /api/save-plant');

  try {
    const body = await request.json();
    const { plantData, referentiel } = body; // Plante complète + dictionnaire mis à jour

    if (!plantData || !plantData.common_name) {
      return new Response(JSON.stringify({ message: 'Données manquantes' }), { status: 400 });
    }

    const slug = slugify(plantData.common_name);

    // On sépare les colonnes principales du reste : tout le reste (classification,
    // appareil_vegetatif, inflorescence, ...) est déjà au premier niveau et part
    // tel quel dans la colonne JSON `data`.
    const { common_name, latin_name, description, ...data } = plantData;

    const payload = {
      id: slug,
      common_name,
      latin_name: latin_name || '',
      description: description || '',
      data,
    };

    await db
      .insert(plantes)
      .values(payload)
      .onConflictDoUpdate({ target: plantes.id, set: payload })
      .run();

    // On persiste le référentiel enrichi pour que les nouveaux mots survivent au rechargement.
    if (referentiel) {
      await db
        .insert(referentiels)
        .values({ id: 'principal', data: referentiel })
        .onConflictDoUpdate({ target: referentiels.id, set: { data: referentiel } })
        .run();
    }

    console.log('✅ Plante enregistrée :', slug);

    return new Response(JSON.stringify({ message: 'Enregistrement réussi !', slug }), {
      status: 200,
    });
  } catch (error: any) {
    console.error('❌ ERREUR SERVEUR :', error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
