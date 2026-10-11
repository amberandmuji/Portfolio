# amberliang.works

Amber's portfolio, rebuilt from Framer as a static [Astro](https://astro.build) site and deployed with GitHub Pages.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
```

## Fonts

Only Inter and Inter Display are used, and both are self-hosted through `@fontsource-variable/inter`. Inter Display is Inter's optical-size axis at 32 (`font-variation-settings: 'opsz' 32`). It's applied by `.t-name` and `.t-bio`, which correspond to Framer's "Heading for name" and "Bio Summary" styles.

## Before cancelling Framer: pull the assets

The Selected Works media on the home page already lives in `public/assets/home/`. Everything else still loads from Framer's CDN (`framerusercontent.com`). Run this once on your machine:

```bash
npm run pull-assets
```

It downloads every image and video into `public/assets/` and rewrites the links to local paths. Commit the result.

## Where things live

| What | File |
|---|---|
| Colors, text styles, spacing, motion timing | `src/styles/global.css` (`:root` tokens, named after the Framer tokens) |
| Home cards, testimonials, nav, links | `src/data/site.ts` |
| Case studies (one Markdown file each) | `src/content/work/*.md` |
| Case-study template, TOC, metrics, cards | `src/pages/[slug].astro` |
| About page | `src/pages/about.astro` |
| Matcha drink game | `src/components/MatchaGame.astro` |
| Scroll reveals, header, video autoplay, count-ups | `src/scripts/motion.ts` |

Breakpoints match Framer's defaults: phone below 810px, tablet from 810 to 1199px, desktop from 1200px.

## Micro-animations

- **Appear on scroll.** Add `data-reveal` to any element. A parent with `data-stagger` delays its children one after another.
- **Count-up numbers.** Use `<b data-count="52" data-suffix="%">52%</b>`.
- **Card hover.** Cards lift, the media zooms and an arrow pops in.
- **Page transitions.** Cross-document View Transitions, with no JavaScript.
- **Header.** Hides on scroll down and returns on scroll up. Phones get an animated menu.
- **Reduced motion.** All of the above respects `prefers-reduced-motion`.

## Deploy (GitHub Pages)

1. Push this folder to a new GitHub repo on `main`.
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**. `.github/workflows/deploy.yml` builds and publishes on every push.
3. Under **Settings → Pages → Custom domain**, enter `amberliang.works`. `public/CNAME` already contains it.
4. At your DNS provider, add these records:
   - Four `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`.
   - A `CNAME` record for `www` pointing to `<github-username>.github.io`.
5. Once the certificate is issued, turn on **Enforce HTTPS**.
6. Check the live site, then cancel the Framer plan.
