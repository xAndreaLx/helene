export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  console.log("🚀 Requête reçue sur /api/save-plant"); // Ce log DOIT apparaître

  try {
    const body = await request.json();
    const { plantData, referentiel } = body;
    console.log("📦 Données reçues :", { plantData, referentiel }); // Vérifie que les données sont bien reçues

    if (!plantData || !plantData.common_name) {
      return new Response(JSON.stringify({ message: "Données manquantes" }), { status: 400 });
    }

    const projectRoot = process.cwd();
    
    // 1. Création du slug (nom de fichier propre)
    const slug = plantData.common_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-");

    // 2. Préparation du contenu Markdown
    const contentDir = path.join(projectRoot, 'src/content/flore/plantes');
    const filePath = path.join(contentDir, `${slug}.md`);

    const fileContent = `---
common_name: "${plantData.common_name}"
latin_name: "${plantData.latin_name}"
description: "${plantData.description || ''}"
caracteristiques: ${JSON.stringify(plantData.caracteristiques, null, 2)}
---

${plantData.description || ''}
`;

    // 3. Écriture des fichiers
    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(filePath, fileContent, 'utf-8');
    console.log("✅ Fiche Markdown créée :", slug);

    // 4. Mise à jour du référentiel JSON
    const referentialPath = path.join(projectRoot, 'src/data/referentiel-botanique.json');
    await fs.writeFile(referentialPath, JSON.stringify(referentiel, null, 2), 'utf-8');
    console.log("✅ Référentiel JSON mis à jour");

    return new Response(JSON.stringify({ 
      message: "Enregistrement réussi",
      slug: slug 
    }), { status: 200 });

  } catch (error) {
    console.error("❌ ERREUR SERVEUR :", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};
