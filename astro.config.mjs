import { defineConfig } from 'astro/config';

// Custom domain (amberliang.works) is served from the root, so no `base` is needed.
// If you deploy to https://<user>.github.io/<repo>/ instead, set base: '/<repo>'.
export default defineConfig({
  site: 'https://amberliang.works',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
