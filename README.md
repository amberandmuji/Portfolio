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
| Hero terminal that prints your ASCII portrait | `src/components/Terminal.astro` (characters in `src/data/amber-ascii.json`; regenerate with `python3 tools/ascii-portrait.py cut.png 72`, where `cut.png` is your photo with the background removed) |
| Colors, text styles, spacing, motion timing | `src/styles/global.css` (`:root` tokens, named after the Framer tokens) |
| Home cards, testimonials, nav, links | `src/data/site.ts` |
| Case studies (one page each) | `src/pages/<case-study>.astro` |
| Case-study layout, left section menu, hero, next project | `src/layouts/Case.astro` |
| Case-study building blocks (columns, cards, metrics, personas) | `src/styles/case.css` |
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
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**. `.github/workflows/deploy.yml` builds and publishes on every push. (If Source is left on "Deploy from a branch", GitHub tries to build it as a Jekyll site and fails.)
   The site works at `https://<user>.github.io/<repo>/` as well as on a custom domain: the workflow reads the Pages address and sets `BASE_PATH` for you.
3. Under **Settings → Pages → Custom domain**, enter `amberliang.works`. `public/CNAME` already contains it.
4. At your DNS provider, add these records:
   - Four `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`.
   - A `CNAME` record for `www` pointing to `<github-username>.github.io`.
5. Once the certificate is issued, turn on **Enforce HTTPS**.
6. Check the live site, then cancel the Framer plan.

## Drink wall (matcha game)

The game saves each served drink to a "drink wall". Without setup, the wall is local to each visitor: it shows their own drinks plus three house recipes. To share drinks between all visitors, use a free [Supabase](https://supabase.com) project:

1. Create a project. In **SQL Editor**, run:

   ```sql
   create table drinks (
     id bigint generated always as identity primary key,
     created_at timestamptz not null default now(),
     name text not null check (char_length(name) <= 60),
     layers jsonb not null,
     boba int not null default 0 check (boba between 0 and 18),
     ice int not null default 0 check (ice between 0 and 6),
     foam boolean not null default false
   );
   alter table drinks enable row level security;
   create policy "anyone can read" on drinks for select using (true);
   create policy "anyone can add" on drinks for insert with check (true);
   ```

2. Under **Project Settings → API**, copy the Project URL and the `anon` public key.
3. Paste both into `drinkWall` in `src/data/site.ts`, then rebuild and deploy.

The wall then shows the 18 newest drinks from everyone. The anon key is safe to publish: the policies above only allow reading and adding drinks.

## Analytics (Google Analytics 4)

Set `ga4` in `src/data/site.ts` to your Measurement ID (`G-…`, from GA4 → Admin → Data streams → your web stream). The site then loads gtag.js and sends page views plus these events (code: `src/scripts/analytics.ts`). No Google Tag Manager needed.

| Event | Parameters | Meaning |
|---|---|---|
| `resume_click` | `location` | opened the resume |
| `contact_click` | `method` (email / linkedin), `location` | reached out |
| `case_study_click` | `case_study`, `location` | opened a case study from a card or "Next project" |
| `case_study_progress` | `case_study`, `percent` (25/50/75/100) | how far someone read |
| `toc_click` | `case_study`, `section` | used the case-study side menu |
| `playground_click` | `project` | clicked "Try it out" |
| `drink_served`, `drink_shared` | | played the matcha game |
| `old_new_toggle` | `case_study`, `view` | flipped the PCC comparison |

In GA4: mark `resume_click` and `contact_click` as **Key events** (Admin → Events), and register `case_study`, `location`, `method`, `percent`, `project` as **Custom dimensions** (Admin → Custom definitions) so they show up in reports.

### Daily summary email (free)

`tools/ga4-daily-email.gs` is a Google Apps Script that reads GA4 every morning and emails a short job-hunt summary (highlights incl. visits from job platforms like Greenhouse, Lever, Workday and LinkedIn, visitors, sources, cities, pages, resume/contact clicks, reading depth). Setup steps are at the top of the file: paste it into script.google.com, add the "Google Analytics Data API" service, set your property ID, run `sendDailyReport` once, then `createDailyTrigger`.
