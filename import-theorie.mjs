import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const OUTPUT_DIR = './src/content/flore/theorie';

// Configuration des sources
const SOURCES = [
  {
    url: 'https://fr.wikipedia.org/wiki/Forme_foliaire',
    mapping: [
      { tableIndex: 0, category: 'forme_feuille' }, // Formes du limbe
      { tableIndex: 3, category: 'bord_feuille' },  // Bords du limbe
      { tableIndex: 4, category: 'nervure' }       // Nervations
    ]
  },
  {
    url: 'https://fr.wikipedia.org/wiki/Inflorescence',
    mapping: [
      { tableIndex: 0, category: 'inflorescence' }, // Inflorescences simples (souvent la 1ère table)
      { tableIndex: 1, category: 'inflorescence' } // Inflorescences simples (souvent la 1ère table)

    ]
  }
];

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const source of SOURCES) {
    console.log(`📥 Chargement de : ${source.url}...`);
    const response = await fetch(source.url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const tables = doc.querySelectorAll('.wikitable');

    source.mapping.forEach(({ tableIndex, category }) => {
      const table = tables[tableIndex];
      if (!table) return;

      const rows = table.querySelectorAll('tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return; // Saute les entêtes

        // Extraction des données (ajustement selon la structure Wikipedia)
        const imgTag = cells[0].querySelector('img');
        const termTag = cells[1];
        const descTag = cells[2] || cells[1]; // Parfois la description est dans la même cellule

        const title = termTag.textContent.trim().split('(')[0].trim(); // Nettoie le nom
        if (!title || title.length < 2) return;

        const imageUrl = imgTag ? `https:${imgTag.getAttribute('src').replace(/\/\d+px-.*/, '/400px-' + imgTag.getAttribute('src').split('/').pop())}` : '';
        const description = descTag.textContent.trim().replace(/\[\d+\]/g, ''); // Enlève les [1], [2] de Wikipedia

        const filename = title.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
          .replace(/[^a-z0-0]/g, '-') + '.md';

        const content = `---
title: "${title}"
categorie: "${category}"
image: "${imageUrl}"
description: "${description.split('.')[0]}."
---

${description}

Source : [Wikipedia](${source.url})`;

        fs.writeFileSync(path.join(OUTPUT_DIR, filename), content);
        console.log(`✅ Généré : ${filename}`);
      });
    });
  }
}

run().catch(console.error);

