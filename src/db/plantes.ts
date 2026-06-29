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
  // Niveau de certification SBS/InfoFlora (200 | 400 | 600), si renseigné.
  niveau?: number;
  // Sections botaniques (classification, appareil_vegetatif, ...).
  sections: Record<string, Section>;
};

type PlanteRow = typeof plantes.$inferSelect;

// Met une ligne SQLite brute à la forme attendue par les pages : on sort les
// champs image de la colonne JSON, le reste constitue les sections affichables.
function normalize(row: PlanteRow): Plante {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const { image_ref, image_source, niveau, ...sections } = data;

  return {
    id: row.id,
    common_name: row.common_name,
    latin_name: row.latin_name,
    description: row.description ?? '',
    image_ref: typeof image_ref === 'string' ? image_ref : undefined,
    image_source: typeof image_source === 'string' ? image_source : undefined,
    niveau: typeof niveau === 'number' ? niveau : undefined,
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

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export type Famille = { famille: string; slug: string; species: Plante[] };

// Familles dérivées des plantes (via classification.famille), triées, avec leurs espèces.
export async function getFamilles(): Promise<Famille[]> {
  const plantes = await getPlantes();
  const map = new Map<string, Plante[]>();
  for (const p of plantes) {
    const fam = p.sections?.classification?.famille?.[0];
    if (!fam) continue;
    if (!map.has(fam)) map.set(fam, []);
    map.get(fam)!.push(p);
  }
  return [...map.entries()]
    .map(([famille, species]) => ({
      famille,
      slug: slugify(famille),
      species: species.sort((a, b) => a.latin_name.localeCompare(b.latin_name)),
    }))
    .sort((a, b) => a.famille.localeCompare(b.famille));
}

export async function getFamille(slug: string): Promise<Famille | undefined> {
  return (await getFamilles()).find((f) => f.slug === slug);
}
