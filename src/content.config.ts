import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Les plantes ne sont plus une Content Collection : elles sont lues directement
// en base via src/db/plantes.ts (le store des collections est figé au build, ce
// qui empêchait de voir une plante ajoutée à l'exécution). Seule la théorie,
// statique et résolue au build, reste une collection.
const theorie = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/flore/theorie" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    categorie: z.enum(['forme_feuille', 'bord_feuille', 'nervure', 'inflorescence']),
    image: image(),
    image2: image().optional(),
    description: z.string(),
  }),
});

export const collections = { theorie };
