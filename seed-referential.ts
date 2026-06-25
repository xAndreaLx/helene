import { db } from './src/db/index.ts';
import { referentiels } from './src/db/schema';
import referentielJson from './src/data/referentiel-botanique.json';

async function seed() {
  // On insère le JSON existant avec un ID fixe "principal"
  await db.insert(referentiels).values({
    id: "principal",
    data: referentielJson
  }).onConflictDoNothing(); // Évite les doublons si déjà inséré

  console.log("Référentiel injecté en BDD !");
}
seed();

