<script>
  export let options = [];
  export let selected = [];
  export let placeholder = "Ajouter...";

  let inputValue = "";
  let showDropdown = false;
  let inputElement;

  // 1. SÉCURITÉ : On vérifie que options est bien un tableau
  // 2. FILTRAGE : On ignore la casse pour la recherche
  $: filteredOptions = Array.isArray(options) 
    ? options.filter(opt => 
        opt.toLowerCase().includes(inputValue.toLowerCase()) && 
        !selected.some(s => s.toLowerCase() === opt.toLowerCase())
      )
    : [];

  // Fonction pour mettre une majuscule au début (ex: "blanc" -> "Blanc")
  function formatValue(str) {
    if (!str) return "";
    const s = str.trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function addTag(tag) {
    const formatted = formatValue(tag);
    if (!formatted) return;

    // Vérification si le tag existe déjà (insensible à la casse)
    const exists = selected.some(t => t.toLowerCase() === formatted.toLowerCase());

    if (!exists) {
      selected = [...selected, formatted];
      inputValue = "";
      inputElement.focus();
    }
  }

  function removeTag(tag) {
    selected = selected.filter(t => t !== tag);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      showDropdown = false;
    }
  }

  function clickOutside(node) {
    const handleClick = (event) => {
      if (!node.contains(event.target)) showDropdown = false;
    };
    document.addEventListener('click', handleClick, true);
    return {
      destroy() { document.removeEventListener('click', handleClick, true); }
    };
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="multi-select-container" use:clickOutside>
  <div class="tags-input-area" on:click={() => inputElement.focus()}>
    {#each selected as tag}
      <span class="tag">
        {tag}
        <button type="button" on:click|stopPropagation={() => removeTag(tag)}>&times;</button>
      </span>
    {/each}
    
    <input
      bind:this={inputElement}
      type="text"
      bind:value={inputValue}
      on:focus={() => showDropdown = true}
      on:keydown={handleKeyDown}
      {placeholder}
    />
  </div>

  {#if showDropdown && (filteredOptions.length > 0 || inputValue)}
    <ul class="dropdown">
      {#each filteredOptions as opt}
        <!-- On utilise mousedown au lieu de click car il se produit AVANT le blur -->
        <li on:mousedown|preventDefault={() => addTag(opt)}>
          {opt}
        </li>
      {/each}
      
{#if inputValue && !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase())}
        <li class="new-value" on:mousedown|preventDefault={() => addTag(inputValue)}>
          ✨ Ajouter "<strong>{formatValue(inputValue)}</strong>"
        </li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  .multi-select-container {
    position: relative;
    width: 100%;
  }

  .tags-input-area {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: white;
    min-height: 42px;
    align-items: center;
    cursor: text;
  }

  .tags-input-area:focus-within {
    border-color: #2e7d32;
    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
  }

  input {
    border: none;
    outline: none;
    flex: 1;
    width: auto !important; /* Empêche le 100% du formulaire parent */
    min-width: 60px;
    font-size: 0.95rem;
    padding: 4px;
  }

  .tag {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 2px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid #c8e6c9;
  }

  .tag button {
    background: none;
    border: none;
    color: #2e7d32;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
    line-height: 1;
  }

  .dropdown {
    position: absolute;
    top: 105%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .dropdown li {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .dropdown li:hover {
    background: #f0f0f0;
  }

  .new-value {
    border-top: 1px solid #eee;
    color: #2e7d32;
    background: #f9fff9;
  }
</style>
