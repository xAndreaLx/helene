<script>
  import MultiSelect from './MultiSelect.svelte';
  import { notify } from '../lib/toastStore'; // Importe le petit store de notif
  export let referentiel;
  // Fiche existante à éditer (forme renvoyée par getPlante). Absente = mode création.
  export let plante = null;

  const isEdit = !!plante;

  let plant = {
    common_name: plante?.common_name ?? '',
    latin_name: plante?.latin_name ?? '',
    description: plante?.description ?? '',
    image_ref: plante?.image_ref ?? '',
  };

  // --- Upload d'image vers Cloudinary (preset non signé) ---
  // Cloudinary accepte un fichier OU une URL distante (qu'il rapatrie et stocke).
  // Dans les deux cas, on récupère une URL Cloudinary qu'on possède (pas de hotlink).
  const CLOUD = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const PRESET = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  let uploading = false;
  let imageUrl = ''; // saisie de l'URL à importer

  // Envoie un fichier/blob à Cloudinary et renvoie l'URL hébergée.
  async function uploadToCloudinary(blob) {
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (!json.secure_url) throw new Error(json.error?.message || 'Échec du téléversement');
    return json.secure_url;
  }

  // Wrapper commun : gère l'état, les erreurs et l'écriture dans image_ref.
  async function run(task) {
    if (!CLOUD || !PRESET) {
      notify('Cloudinary non configuré (variables PUBLIC_CLOUDINARY_*)', 'error');
      return;
    }
    uploading = true;
    try {
      plant.image_ref = await task();
      imageUrl = '';
      notify('Image importée dans Cloudinary !');
    } catch (err) {
      console.error(err);
      notify(err.message || 'Erreur lors de l\'import', 'error');
    } finally {
      uploading = false;
    }
  }

  function onFileSelected(event) {
    const file = event.target.files?.[0];
    if (file) run(() => uploadToCloudinary(file));
  }

  // Le navigateur récupère l'image (Wikimedia accepte les requêtes navigateur),
  // puis on envoie le blob à Cloudinary — évite le fetch serveur de Cloudinary (429).
  function importFromUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    run(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Téléchargement impossible (HTTP ${res.status})`);
      return uploadToCloudinary(await res.blob());
    });
  }

  // Initialisation des sections : on crée un tableau pour chaque champ du
  // référentiel, pré-rempli avec les valeurs de la fiche en mode édition.
  // Les sections (classification, appareil_vegetatif, ...) sont stockées au
  // premier niveau de `plant` pour correspondre au schéma de la BDD.
  Object.keys(referentiel).forEach(section => {
    plant[section] = {};
    Object.keys(referentiel[section]).forEach(champ => {
      plant[section][champ] = plante?.sections?.[section]?.[champ] ?? [];
    });
  });

  async function handleSubmit() {
    // --- ÉTAPE 1 : MISE À JOUR DU RÉFÉRENTIEL ---
    // On parcourt tout ce qui a été saisi pour voir s'il y a des nouveaux mots
    Object.keys(referentiel).forEach(section => {
      Object.keys(referentiel[section]).forEach(champ => {
        const saisieUtilisateur = plant[section][champ];
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

    // Création : endpoint strict (refuse si le nom latin existe déjà).
    // Édition : endpoint dédié qui met à jour la fiche identifiée par son id.
    const endpoint = isEdit ? '/api/update-plant' : '/api/save-plant';
    const body = isEdit
      ? { id: plante.id, plantData: plant, referentiel }
      : { plantData: plant, referentiel };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        notify(isEdit ? "Fiche mise à jour !" : "Plante et dictionnaire enregistrés !");
        if (isEdit && result.slug) {
          // On revient à la fiche pour voir le résultat.
          window.location.href = `/flore/${result.slug}`;
        }
      } else {
        notify(result.message || "Erreur lors de la sauvegarde", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Erreur serveur", "error");
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement la fiche « ${plant.common_name} » ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plante.id })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        notify("Fiche supprimée.");
        window.location.href = '/flore';
      } else {
        notify(result.message || "Erreur lors de la suppression", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Erreur serveur", "error");
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="admin-form">
  <section class="base-info">
    <h2>{isEdit ? '✏️ Modifier la fiche' : '🌿 Nouvelle Fiche Plante'}</h2>
    <div class="grid-main">
      <div class="field-group">
        <label>Nom commun</label>
        <input type="text" bind:value={plant.common_name} placeholder="ex: Millepertuis perforé" required />
      </div>
      <div class="field-group">
        <label>Nom latin <span class="hint">{isEdit ? "(modifiable ; renomme aussi l'URL)" : '(identifiant unique)'}</span></label>
        <input type="text" bind:value={plant.latin_name} placeholder="ex: Hypericum perforatum" required />
      </div>
    </div>

    <div class="field-group image-field">
      <label>Image</label>
      {#if plant.image_ref}
        <div class="image-preview">
          <img src={plant.image_ref} alt="Aperçu" />
          <button type="button" class="remove-img" on:click={() => (plant.image_ref = '')}>Retirer</button>
        </div>
      {/if}
      <input type="file" accept="image/*" on:change={onFileSelected} disabled={uploading} />
      <div class="url-import">
        <input type="text" bind:value={imageUrl} placeholder="…ou importe depuis une URL (Wikimedia Commons, etc.)" disabled={uploading} />
        <button type="button" on:click={importFromUrl} disabled={uploading || !imageUrl.trim()}>Importer</button>
      </div>
      {#if uploading}<span class="hint">Import dans Cloudinary…</span>{/if}
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
              bind:selected={plant[section][champ]}
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
  
  <button type="submit" class="save-btn">{isEdit ? '💾 Enregistrer les modifications' : '🚀 Enregistrer dans la base'}</button>

  {#if isEdit}
    <button type="button" class="delete-btn" on:click={handleDelete}>🗑️ Supprimer cette fiche</button>
  {/if}
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

  .image-field { margin-top: 1.5rem; }

  .url-import {
    display: flex;
    gap: 0.5rem;
  }

  .url-import input { flex: 1; }

  .url-import button {
    background: #2e7d32;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0 1rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .url-import button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .image-preview {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .image-preview img {
    max-height: 160px;
    border-radius: 8px;
    border: 1px solid #ddd;
  }

  .remove-img {
    background: none;
    border: 1px solid #ef9a9a;
    color: #c62828;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    font-size: 0.85rem;
    align-self: center;
  }

  /* Bouton de suppression (action destructive, discret) */
  .delete-btn {
    align-self: center;
    background: none;
    color: #c62828;
    border: 1px solid #ef9a9a;
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: #ffebee;
    border-color: #c62828;
  }
</style>

