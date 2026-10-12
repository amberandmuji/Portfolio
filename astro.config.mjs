import { defineConfig } from 'astro/config';

// BASE_PATH lets the same code run at the domain root (amberliang.works) or in a
// sub-folder (https://amberandmuji.github.io/Portfolio/). The deploy workflow fills
// it in automatically from GitHub Pages; locally it defaults to the root.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: 'https://amberliang.works',
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
