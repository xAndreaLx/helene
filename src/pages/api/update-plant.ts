export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
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
    if (!plantData.latin_name) {
      return new Response(JSON.stringify({ message: 'Le nom latin est requis.' }), { status: 400 });
    }

    // La fiche doit exister : on met à jour, on ne crée jamais ici.
    const existing = await db.select().from(plantes).where(eq(plantes.id, id)).get();
    if (!existing) {
      return new Response(JSON.stringify({ message: 'Fiche introuvable.' }), { status: 404 });
    }

    // Tout est éditable, y compris le nom latin (révisions taxonomiques :
    // Ranunculus ficaria → Ficaria verna).
    const { common_name, latin_name, description, ...formData } = plantData;
    const newId = slugify(latin_name);
    if (!newId) {
      return new Response(JSON.stringify({ message: 'Nom latin invalide.' }), { status: 400 });
    }

    // Le formulaire admin ne pilote que les sections (classification,
    // appareil_vegetatif, …) et les images. On FUSIONNE par-dessus le `data`
    // existant au lieu de le remplacer, pour préserver les champs gérés par les
    // scripts et absents du formulaire : `niveau` (certification InfoFlora),
    // `sources` (provenance infoflora/sauvages) et `palier` ("Sauvages de ma rue").
    // Sans cette fusion, toute édition d'une fiche effacerait silencieusement ces flags.
    const existingData = (existing.data ?? {}) as Record<string, unknown>;
    const data = { ...existingData, ...formData };

    const payload = { common_name, latin_name, description: description || '', data };

    if (newId === id) {
      // Pas de renommage : simple mise à jour en place.
      await db.update(plantes).set(payload).where(eq(plantes.id, id)).run();
    } else {
      // Le nom latin a changé → l'id/URL change aussi. On vérifie qu'aucune
      // autre fiche n'occupe déjà le nouvel id, puis on recrée + supprime
      // l'ancienne (l'id est clé primaire, donc non modifiable en place).
      const clash = await db.select({ id: plantes.id }).from(plantes).where(eq(plantes.id, newId)).get();
      if (clash) {
        return new Response(
          JSON.stringify({ message: `Une autre fiche utilise déjà « ${latin_name} ».` }),
          { status: 409 },
        );
      }
      await db.batch(
        [
          db.insert(plantes).values({ id: newId, ...payload }),
          db.delete(plantes).where(eq(plantes.id, id)),
        ],
        'write',
      );
    }

    // Le référentiel s'enrichit (upsert) comme à la création.
    if (referentiel) {
      await db
        .insert(referentiels)
        .values({ id: 'principal', data: referentiel })
        .onConflictDoUpdate({ target: referentiels.id, set: { data: referentiel } })
        .run();
    }

    console.log('✅ Fiche mise à jour :', id, newId !== id ? `(renommée → ${newId})` : '');

    return new Response(JSON.stringify({ message: 'Fiche mise à jour !', slug: newId }), {
      status: 200,
    });
  } catch (error: any) {
    console.error('❌ ERREUR SERVEUR :', error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
