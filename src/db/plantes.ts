// Accès direct aux plantes en base (lecture).
//
// Les pages Flore interrogent SQLite ici plutôt que de passer par une Content
// Collection : le store des collections est figé au build, alors qu'on veut voir
// immédiatement une plante ajoutée via le formulaire d'admin (écriture runtime).
import { eq } from 'drizzle-orm';
import { db } from './index';
import { plantes } from './schema';

export type Section = Record<string, string[]>;

export type Plante = {
  id: string;
  common_name: string;
  latin_name: string;
  description: string;
  image_ref?: string;
  image_source?: string;
  // Sections botaniques (classification, appareil_vegetatif, ...).
  sections: Record<string, Section>;
};

type PlanteRow = typeof plantes.$inferSelect;

// Met une ligne SQLite brute à la forme attendue par les pages : on sort les
// champs image de la colonne JSON, le reste constitue les sections affichables.
function normalize(row: PlanteRow): Plante {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const { image_ref, image_source, ...sections } = data;

  return {
    id: row.id,
    common_name: row.common_name,
    latin_name: row.latin_name,
    description: row.description ?? '',
    image_ref: typeof image_ref === 'string' ? image_ref : undefined,
    image_source: typeof image_source === 'string' ? image_source : undefined,
    sections: sections as Record<string, Section>,
  };
}

export async function getPlantes(): Promise<Plante[]> {
  const rows = await db.select().from(plantes).all();
  return rows.map(normalize);
}

export async function getPlante(id: string): Promise<Plante | undefined> {
  const row = await db.select().from(plantes).where(eq(plantes.id, id)).get();
  return row ? normalize(row) : undefined;
}
