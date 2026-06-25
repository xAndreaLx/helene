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
  console.log('🚀 Requête reçue sur /api/save-plant');

  try {
    const body = await request.json();
    const { plantData, referentiel } = body; // Plante complète + dictionnaire mis à jour

    if (!plantData || !plantData.common_name) {
      return new Response(JSON.stringify({ message: 'Le nom commun est requis.' }), { status: 400 });
    }

    // L'identifiant (slug + clé primaire + URL) dérive du NOM LATIN, qui est
    // l'identifiant unique d'une espèce. Deux fiches au même binôme = même espèce,
    // donc l'upsert met à jour la fiche existante au lieu d'écraser une homonyme.
    if (!plantData.latin_name) {
      return new Response(JSON.stringify({ message: 'Le nom latin est requis (il sert d\'identifiant unique).' }), { status: 400 });
    }

    const slug = slugify(plantData.latin_name);
    if (!slug) {
      return new Response(JSON.stringify({ message: 'Nom latin invalide.' }), { status: 400 });
    }

    // On sépare les colonnes principales du reste : tout le reste (classification,
    // appareil_vegetatif, inflorescence, ...) est déjà au premier niveau et part
    // tel quel dans la colonne JSON `data`.
    const { common_name, latin_name, description, ...data } = plantData;

    const payload = {
      id: slug,
      common_name,
      latin_name,
      description: description || '',
      data,
    };

    // Création stricte : on ne touche jamais à une fiche existante. Si le nom latin
    // est déjà pris, on refuse plutôt que d'écraser (l'édition viendra plus tard,
    // via un écran dédié qui chargera la fiche avant de la modifier).
    const existing = await db
      .select({ id: plantes.id })
      .from(plantes)
      .where(eq(plantes.id, slug))
      .get();

    if (existing) {
      return new Response(
        JSON.stringify({
          message: `Une fiche existe déjà pour « ${latin_name} ». Pour la modifier, l'édition n'est pas encore disponible.`,
        }),
        { status: 409 },
      );
    }

    await db.insert(plantes).values(payload).run();

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
