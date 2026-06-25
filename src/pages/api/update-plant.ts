export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index';
import { plantes, referentiels } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  console.log('✏️ Requête reçue sur /api/update-plant');

  try {
    const body = await request.json();
    const { id, plantData, referentiel } = body;

    if (!id || !plantData) {
      return new Response(JSON.stringify({ message: 'Données manquantes.' }), { status: 400 });
    }
    if (!plantData.common_name) {
      return new Response(JSON.stringify({ message: 'Le nom commun est requis.' }), { status: 400 });
    }

    // La fiche doit exister : on met à jour, on ne crée jamais ici.
    const existing = await db.select().from(plantes).where(eq(plantes.id, id)).get();
    if (!existing) {
      return new Response(JSON.stringify({ message: 'Fiche introuvable.' }), { status: 404 });
    }

    // common_name, description et les sections sont éditables. Le nom latin
    // (= identité, dont dérive l'id/l'URL) reste figé sur la valeur existante,
    // quoi que renvoie le client.
    const { common_name, description, ...data } = plantData;
    delete (data as Record<string, unknown>).latin_name;

    await db
      .update(plantes)
      .set({ common_name, description: description || '', data })
      .where(eq(plantes.id, id))
      .run();

    // Le référentiel s'enrichit (upsert) comme à la création.
    if (referentiel) {
      await db
        .insert(referentiels)
        .values({ id: 'principal', data: referentiel })
        .onConflictDoUpdate({ target: referentiels.id, set: { data: referentiel } })
        .run();
    }

    console.log('✅ Fiche mise à jour :', id);

    return new Response(JSON.stringify({ message: 'Fiche mise à jour !', slug: id }), {
      status: 200,
    });
  } catch (error: any) {
    console.error('❌ ERREUR SERVEUR :', error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
