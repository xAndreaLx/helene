import { writable } from 'svelte/store';

export const toasts = writable([]);

export const notify = (message, type = 'success') => {
  const id = Math.random();
  // Ajoute la notif
  toasts.update((all) => [{ id, message, type }, ...all]);
  
  // La supprime après 3 secondes
  setTimeout(() => {
    toasts.update((all) => all.filter((t) => t.id !== id));
  }, 3000);
};
