import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const plantes = sqliteTable('plantes', {
  id: text('id').primaryKey(), // ex: "grande-cigue" (ton slug)
  common_name: text('common_name').notNull(),
  latin_name: text('latin_name').notNull(),
  description: text('description'),
  
  // On stocke toutes tes catégories complexes dans un seul champ JSON flexible !
  // Drizzle va automatiquement sérialiser/désérialiser ce champ pour toi.
  data: text('data', { mode: 'json' }).$type<{
    classification?: { famille?: string; genre?: string };
    generalites?: { cycle_de_vie?: string[]; habitat?: string[] };
    appareil_vegetatif?: Record<string, string[]>;
    inflorescence?: Record<string, string[]>;
    fleur_anatomie?: Record<string, string[]>;
    image_source?: string;
  }>(),
});

export const referentiels = sqliteTable('referentiels', {
  id: text('id').primaryKey(), // On aura un seul enregistrement, par exemple id: "unique"
  data: text('data', { mode: 'json' }).notNull() // Contient l'arborescence complète du dictionnaire
});