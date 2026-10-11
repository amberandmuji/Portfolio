#!/usr/bin/env node
// Downloads every framerusercontent.com image/video referenced in src/
// into public/assets/ and rewrites the references to local paths.
// Run once on your machine BEFORE cancelling the Framer plan:
//   npm run pull-assets
// Re-running is safe: files already downloaded are skipped.

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = 'src';
const OUT = 'public/assets';
const RE = /https:\/\/framerusercontent\.com\/(images|assets)\/([A-Za-z0-9]+\.(?:png|jpe?g|gif|webp|svg|mp4|webm))(?:\?[^"')\s]*)?/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (['.astro', '.md', '.mdx', '.ts', '.js', '.css'].includes(extname(p))) yield p;
  }
}
const exists = (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
const files = [];
const urls = new Map(); // full url -> local path
for await (const f of walk(SRC)) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(RE)) urls.set(m[0], `/assets/${m[2]}`);
  files.push([f, text]);
}

let ok = 0, failed = 0;
const done = new Set();
for (const [url, local] of urls) {
  const dest = join('public', local);
  if (done.has(dest) || (await exists(dest))) { done.add(dest); continue; }
  const clean = url.split('?')[0]; // full-resolution original
  try {
    const res = await fetch(clean);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    done.add(dest); ok++;
    console.log('✓', local);
  } catch (err) {
    failed++;
    console.warn('✗', clean, err.message);
    urls.delete(url); // keep the remote URL for anything that failed
  }
}

for (const [f, text] of files) {
  let next = text;
  for (const [url, local] of urls) next = next.split(url).join(local);
  if (next !== text) await writeFile(f, next);
}
console.log(`\nDownloaded ${ok}, failed ${failed}, ${urls.size} references now local.`);
console.log('Tip: large PNG screenshots can be converted to WebP/AVIF to cut page weight.');
