export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index';
import { plantes } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  console.log('🗑️ Requête reçue sur /api/delete-plant');

  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ message: 'Identifiant manquant.' }), { status: 400 });
    }

    const existing = await db.select({ id: plantes.id }).from(plantes).where(eq(plantes.id, id)).get();
    if (!existing) {
      return new Response(JSON.stringify({ message: 'Fiche introuvable.' }), { status: 404 });
    }

    await db.delete(plantes).where(eq(plantes.id, id)).run();

    console.log('✅ Fiche supprimée :', id);

    return new Response(JSON.stringify({ message: 'Fiche supprimée.' }), { status: 200 });
  } catch (error: any) {
    console.error('❌ ERREUR SERVEUR :', error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
