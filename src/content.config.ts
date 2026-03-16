import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const theorie = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/flore/theorie" }),
  // On transforme le schema en FONCTION qui reçoit { image }
  schema: ({ image }) => z.object({
    title: z.string(),
    categorie: z.enum(['forme_feuille', 'bord_feuille', 'nervure', 'inflorescence']),
    // Maintenant 'image' est connu car Astro l'a passé en argument au-dessus
    image: image(), 
    image2: image().optional(), 
    description: z.string(),
  }),
});

const flore = defineCollection({
  // ATTENTION : vérifie que le dossier ici est le même que dans ton API save-plant.ts
  // Si ton API enregistre dans src/content/plantes, mets "plantes" ici.
  loader: glob({ pattern: "**/*.md", base: "./src/content/flore/plantes" }),
  
  schema: ({ image }) => z.object({
    // --- IDENTIFICATION ---
    common_name: z.string(),
    latin_name: z.string(),

    // --- CLASSIFICATION ---
    classification: z.object({
    famille: z.string().optional(),
      genre: z.string().optional(),
    }).optional(),

    // --- GENERALITES ---
    generalites: z.object({
      cycle_de_vie: z.array(z.string()).optional(),
      habitat: z.array(z.string()).optional()
    }).optional(),

    // --- APPAREIL VÉGÉTATIF ---
    // On utilise z.array(z.string()) car le MultiSelect envoie des tableaux
    appareil_vegetatif: z.object({
      tige_port: z.array(z.string()).optional(),
      tige_section: z.array(z.string()).optional(),
      tige_aspect: z.array(z.string()).optional(),
      tige_pilosite: z.array(z.string()).optional(),
      feuilles_insertion: z.array(z.string()).optional(),
      feuilles_composition: z.array(z.string()).optional(),
      pilosite_feuille_dessus: z.array(z.string()).optional(),
      pilosite_feuille_dessous: z.array(z.string()).optional(),
    }).optional(),

    // --- INFLORESCENCE ---
    inflorescence: z.object({
      type_structure: z.array(z.string()).optional(),
      bractees_involucre: z.array(z.string()).optional(),
      bractees_aspect: z.array(z.string()).optional(),
    }).optional(),

    // --- FLEUR ANATOMIE ---
    fleur_anatomie: z.object({
      symetrie: z.array(z.string()).optional(),
      perianthe: z.array(z.string()).optional(),
      nb_sepales: z.array(z.string()).optional(),
      fusion_sepales: z.array(z.string()).optional(),
      nb_petales: z.array(z.string()).optional(),
      fusion_petales: z.array(z.string()).optional(),
      nb_tepales: z.array(z.string()).optional(),
      nb_etamines: z.array(z.string()).optional(),
    }).optional(),

    // --- IMAGES ET AUTRES ---
    // Si tu rajoutes la gestion d'image plus tard dans le formulaire
    image_ref: image().optional(), 
    image_source: z.string().optional(),

  }),
});


export const collections = { flore, theorie };
