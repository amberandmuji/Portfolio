// After `astro build`, prefix the site's hard-coded root links ("/assets/…", "/about")
// with BASE_PATH so the site also works from a sub-folder such as /Portfolio/.
// Astro already prefixes its own files (/_astro/…); this covers the rest.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
if (!base) process.exit(0);

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const esc = base.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = new RegExp(`(\\s(?:href|src|poster|data-src)=)(["'])\\/(?!\\/)(?!${esc}(?:\\/|["']))`, 'g');
const srcset = new RegExp(`(\\ssrcset=)(["'])\\/(?!\\/)(?!${esc}(?:\\/|["']))`, 'g');

let changed = 0;
for (const file of walk('dist').filter((f) => f.endsWith('.html'))) {
  const before = readFileSync(file, 'utf8');
  const after = before
    // attributes that point at the site root, but not protocol-relative "//" or already-prefixed paths
    .replace(attr, (m, pre, q) => `${pre}${q}${base}/`)
    .replace(srcset, (m, pre, q) => `${pre}${q}${base}/`);
  if (after !== before) { writeFileSync(file, after); changed++; }
}
console.log(`apply-base: prefixed links with ${base} in ${changed} pages`);
