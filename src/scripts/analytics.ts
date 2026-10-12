/* Job-hunt analytics: sends named events to the Google Tag Manager dataLayer.
   GTM forwards them to Google Analytics 4 (see README → "Analytics").
   If GTM/GA isn't set up, these pushes are harmless no-ops.

   Events
   - resume_click        { location }                       opened the resume
   - contact_click       { method: email|linkedin, location }
   - case_study_click    { case_study, location }           opened a case study from a card / "Next project"
   - case_study_progress { case_study, percent: 25|50|75|100 } how far someone read
   - playground_click    { project }                        "Try it out" on a vibe-coding project
   - toc_click           { case_study, section }            jumped to a section from the side menu
   - drink_served / drink_shared                            played the matcha game
   - old_new_toggle      { case_study, view }               flipped the PCC old/new comparison
*/
type Params = Record<string, string | number>;
declare global { interface Window { dataLayer?: unknown[] } }

const track = (event: string, params: Params = {}) => {
  (window.dataLayer = window.dataLayer || []).push({ event, ...params });
};

const RESUME = document.documentElement.dataset.resume || '';
const base = (document.documentElement.dataset.base || '').replace(/\/$/, '');
const pagePath = () => location.pathname.slice(base.length).replace(/\/$/, '') || '/';
const caseStudy = document.querySelector('.cs') ? pagePath().replace(/^\//, '') : '';

// where on the page a click happened
const where = (el: Element) =>
  el.closest('header') ? 'header'
  : el.closest('footer') ? 'footer'
  : el.closest('.hero') ? 'hero'
  : el.closest('.cs-next') ? 'next_project'
  : el.closest('#projects') ? 'selected_works'
  : el.closest('.past') ? 'past_projects'
  : el.closest('.cs-toc') ? 'case_menu'
  : pagePath() === '/' ? 'home' : pagePath().replace(/^\//, '');

document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute('href') || '';
  const loc = where(a);

  if (RESUME && href === RESUME) return track('resume_click', { location: loc });
  if (href.startsWith('mailto:')) return track('contact_click', { method: 'email', location: loc });
  if (/linkedin\.com/i.test(href)) return track('contact_click', { method: 'linkedin', location: loc });
  if (a.closest('.cs-toc')) return track('toc_click', { case_study: caseStudy, section: href.replace('#', '') });
  if (a.closest('.pl')) {
    const title = a.closest('.row')?.querySelector('.title')?.textContent?.trim() || href;
    return track('playground_click', { project: title });
  }
  // internal link to a case study page
  const url = new URL(a.href, location.href);
  if (url.origin === location.origin && a.closest('.card')) {
    const slug = url.pathname.slice(base.length).replace(/^\/|\/$/g, '');
    if (slug && !['about', 'playground'].includes(slug)) track('case_study_click', { case_study: slug, location: loc });
  }
}, { capture: true });

// Reading depth on case studies (fires once per threshold)
if (caseStudy) {
  const marks = [25, 50, 75, 100];
  const sent = new Set<number>();
  const body = document.querySelector('.cs-body') as HTMLElement | null;
  const check = () => {
    if (!body) return;
    const r = body.getBoundingClientRect();
    const read = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
    for (const m of marks) if (read * 100 >= m && !sent.has(m)) { sent.add(m); track('case_study_progress', { case_study: caseStudy, percent: m }); }
  };
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); }, { passive: true });
  check();
}

// Matcha game + PCC old/new toggle
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-serve]')) track('drink_served');
  else if (t.closest('[data-share]')) track('drink_shared');
  else if (t.closest('[data-oldnew] [data-toggle], [data-oldnew] [data-set]')) {
    setTimeout(() => {
      const on = document.querySelector('[data-oldnew] [data-toggle]')?.getAttribute('aria-checked') === 'true';
      track('old_new_toggle', { case_study: caseStudy, view: on ? 'new' : 'old' });
    }, 0);
  }
}, { capture: true });

export {};
