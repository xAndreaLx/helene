// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [svelte()],
  output: 'server',           // 2. Ajoute cette ligne impérativement
  adapter: node({             // 3. Ajoute ce bloc
    mode: 'standalone',
  }),
});