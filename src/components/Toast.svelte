<script>
  import { toasts } from '../lib/toastStore';
  import { flip } from 'svelte/animate';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div animate:flip class="toast {toast.type}">
      {toast.type === 'success' ? '🌱' : '⚠️'} {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .toast {
    background: white;
    color: #333;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid #2e7d32;
    font-family: sans-serif;
    min-width: 200px;
    /* Animation d'apparition simple */
    animation: slideIn 0.3s ease-out;
  }

  .toast.error {
    border-left-color: #d32f2f;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
