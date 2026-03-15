<script>
  import MultiSelect from './MultiSelect.svelte';
  import { notify } from '../lib/toastStore'; // Importe le petit store de notif
  export let referentiel;

  let plant = {
    common_name: '',
    latin_name: '',
    description: '',
    caracteristiques: {}
  };

  // Initialisation : on crée les tableaux vides pour chaque champ du référentiel
  Object.keys(referentiel).forEach(section => {
    plant.caracteristiques[section] = {};
    Object.keys(referentiel[section]).forEach(champ => {
      plant.caracteristiques[section][champ] = []; 
    });
  });

  async function handleSubmit() {
    // --- ÉTAPE 1 : MISE À JOUR DU RÉFÉRENTIEL ---
    // On parcourt tout ce qui a été saisi pour voir s'il y a des nouveaux mots
    Object.keys(plant.caracteristiques).forEach(section => {
      Object.keys(plant.caracteristiques[section]).forEach(champ => {
        const saisieUtilisateur = plant.caracteristiques[section][champ];
        const optionsExistantes = referentiel[section][champ];

        saisieUtilisateur.forEach(valeur => {
          // Si la valeur n'est pas encore dans le référentiel, on l'ajoute
          if (!optionsExistantes.includes(valeur)) {
            optionsExistantes.push(valeur);
            optionsExistantes.sort(); // Optionnel : pour garder l'ordre alphabétique
          }
        });
      });
    });

    console.log("Envoi des données mis à jour :", { plantData: plant, referentiel });

    try {
      const response = await fetch('/api/save-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantData: plant, referentiel })
      });

      if (response.ok) {
        notify("Plante et dictionnaire enregistrés !");
        // Optionnel : réinitialiser le formulaire ici si tu veux
      } else {
        notify("Erreur lors de la sauvegarde", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Erreur serveur", "error");
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="admin-form">
  <section class="base-info">
    <h2>🌿 Nouvelle Fiche Plante</h2>
    <div class="grid-main">
      <div class="field-group">
        <label>Nom commun</label>
        <input type="text" bind:value={plant.common_name} placeholder="ex: Millepertuis perforé" required />
      </div>
      <div class="field-group">
        <label>Nom latin</label>
        <input type="text" bind:value={plant.latin_name} placeholder="ex: Hypericum perforatum" />
      </div>
    </div>
  </section>

  {#each Object.keys(referentiel) as section}
    <fieldset>
      <legend>{section}</legend>
      <div class="grid-botany">
        {#each Object.keys(referentiel[section]) as champ}
          <div class="field-group">
            <label>{champ.replace(/_/g, ' ')}</label>
            <MultiSelect 
              options={referentiel[section][champ]} 
              bind:selected={plant.caracteristiques[section][champ]} 
              placeholder="Ajouter..."
            />
          </div>
        {/each}
      </div>
    </fieldset>
  {/each}

  <section>
    <h2>Notes & Description</h2>
    <textarea bind:value={plant.description} rows="5" width="100%" placeholder="Propriétés, habitat, confusion possible..."></textarea>
  </section>
  
  <button type="submit" class="save-btn">🚀 Enregistrer dans la base</button>
</form>

<style>
  /* Conteneur principal */
  .admin-form {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* Grilles de mise en page */
  .grid-main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .grid-botany {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  /* Sections et Groupes */
  fieldset {
    border: 1px solid #ddd;
    padding: 1.5rem;
    border-radius: 12px;
    background: #fafafa;
  }

  legend {
    font-weight: bold;
    padding: 0 1rem;
    color: #2e7d32;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #555;
    text-transform: capitalize;
  }

  /* Champs de saisie (Correction ici) */
  input[type="text"], 
  textarea {
    width: 100%;
    box-sizing: border-box; /* Empêche le débordement dû au padding */
    padding: 0.8rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit; /* Pour que le textarea utilise la même police */
  }

  textarea {
    resize: vertical; /* Permet à l'utilisateur d'agrandir en hauteur seulement */
    min-height: 100px;
  }

  /* Bouton de sauvegarde */
  .save-btn {
    background: #2e7d32;
    color: white;
    padding: 1.5rem;
    font-size: 1.2rem;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
    margin-top: 1rem;
  }

  .save-btn:hover {
    background: #1b5e20;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
</style>

