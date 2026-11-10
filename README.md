# amberliang.works

The portfolio of **Amber Liang**, a product designer. Live at **[amberliang.works](https://amberliang.works)**.

## What's inside

- **Selected work.** Case studies on B2B workflow automation, an e-commerce homepage and checkout redesign, and a web-to-mobile budgeting dashboard, each with the research, decisions and results behind it.
- **Vibe Coding Playground.** Small projects I build with AI tools to explore interaction ideas: a job-hunting agent, a hand-gesture page turner for eBooks, a campfire music mixer, a personal colour-season mirror, an interactive walk through my hometown, a bouldering log and a pixel-art desktop pet.
- **About.** A bit about me, plus a tiny 3D me you can drag into my photos and a little bubble tea bar where you can mix a drink and pin it to the wall.

## How it's built

The site was designed in Framer and rebuilt by hand as a static [Astro](https://astro.build) site, hosted on GitHub Pages.

- **No framework on the page.** Pages are plain HTML and CSS with a little TypeScript for motion. Case studies are Astro pages that share one layout.
- **Hero terminal.** The home page "prints" an ASCII portrait of me, generated from a photo with `tools/ascii-portrait.py`.
- **Micro-animations.** Scroll reveals, count-up numbers, card hovers and cross-page View Transitions. Everything respects `prefers-reduced-motion`.
- **Mini Amber.** A three.js character with hand-posed scenes for each photo on the About page. It only loads when the photos come into view, and falls back to a still image without WebGL.
- **Type.** Inter and Inter Display, self-hosted.
- **Analytics.** Google Analytics 4 page views and a few click events (for example, opening the résumé or a case study), so I can see which work people read.

## Run it locally

Requires Node 22.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
```

Pushing to `main` builds and deploys the site with GitHub Actions (`.github/workflows/deploy.yml`).

## Project structure

| What | Where |
|---|---|
| Site content: nav, home cards, playground projects, testimonials | `src/data/site.ts` |
| Pages, one per case study | `src/pages/` |
| Shared case-study layout | `src/layouts/Case.astro` |
| Components (header, terminal, playground, matcha game, photo game) | `src/components/` |
| Colours, type scale, spacing and motion tokens | `src/styles/global.css` |
| Scroll and hover motion, analytics | `src/scripts/` |
| Images and videos | `public/assets/` |

## Contact

Find me on [LinkedIn](https://www.linkedin.com/in/amberamberliang/) or email [amberliangdesign@gmail.com](mailto:amberliangdesign@gmail.com).

The code is here to look at and learn from. The case studies, images, videos and writing are my own work, so please ask before reusing them.
