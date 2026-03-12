// src/content/config.ts
import { defineCollection } from 'astro:content'; // On garde defineCollection ici
import { z } from 'astro/zod';                   // On récupère "z" ici (le nouveau standard)
import { glob } from 'astro/loaders';             // L'outil pour charger les fichiers

const flore = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/flore" }),
  schema: ({ image }) => z.object({
    // --- OBLIGATOIRE (les bases pour identifier la plante) ---
    nom_fr: z.string(),
    nom_sci: z.string(),

    // --- OPTIONNEL (tout le reste peut être vide ou absent) ---
    famille: z.string().optional(),
    sbs_niveau: z.number().optional(),
    
    // Listes / Tableaux (ex: ["blanc", "rose"])
    couleur_fleur: z.array(z.string()).optional(),
    mois_floraison: z.array(z.number()).optional(),
    milieu: z.array(z.string()).optional(),

    // Caractéristiques botaniques
    feuilles_disposition: z.string().optional(),
    feuilles_type: z.string().optional(),
    fleur_type: z.string().optional(),

    // Indices écologiques
    indice_H: z.number().optional(),
    indice_L: z.number().optional(),

    // Image de référence
    image_ref: image().optional(),

    // Lié à l'observation
    date_observation: z.string().transform(str => new Date(str)).optional(),
  }),
});

export const collections = { flore };
