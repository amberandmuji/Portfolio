// Site-wide micro-interactions (replaces the Framer runtime's effects).

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 1. Appear on scroll — [data-reveal] fades/rises in once.
      Children of [data-stagger] get an incremental delay. */
document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
  group.querySelectorAll<HTMLElement>(':scope > [data-reveal]').forEach((el, i) => el.style.setProperty('--stagger', String(i)));
});
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
);
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

/* 2. Header: border once scrolled, hide on scroll down, show on scroll up */
const header = document.querySelector<HTMLElement>('[data-header]');
let lastY = window.scrollY;
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    const menuOpen = header?.querySelector('[data-menu-toggle]')?.getAttribute('aria-expanded') === 'true';
    header?.classList.toggle('scrolled', y > 8);
    header?.classList.toggle('hide', !menuOpen && y > 240 && y > lastY);
    lastY = y;
    ticking = false;
  });
}, { passive: true });

/* 3. Mobile menu */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  if (menu) menu.hidden = open;
});
menu?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a')) { toggle?.setAttribute('aria-expanded', 'false'); menu.hidden = true; }
});

/* 4. Videos in cards: autoplay muted loop only while on screen
      (saves bandwidth/battery vs. Framer's always-on autoplay). */
const vio = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting && !reduce) v.play().catch(() => {});
    else v.pause();
  }
}, { threshold: 0.25 });
document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]').forEach((v) => vio.observe(v));

/* 5. Count-up numbers ([data-count="52"]) for case-study metrics */
const cio = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target as HTMLElement;
    cio.unobserve(el);
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? '';
    if (reduce || !Number.isFinite(target)) { el.textContent = `${target}${suffix}`; continue; }
    const t0 = performance.now();
    const dur = 1100;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach((el) => cio.observe(el));

/* 6. Case-study table of contents: highlight the section in view */
const tocLinks = document.querySelectorAll<HTMLAnchorElement>('[data-toc] a');
if (tocLinks.length) {
  const map = new Map<Element, HTMLAnchorElement>();
  tocLinks.forEach((a) => {
    const t = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (t) map.set(t, a);
  });
  const tio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        tocLinks.forEach((a) => a.classList.remove('on'));
        map.get(e.target)?.classList.add('on');
      }
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  map.forEach((_, el) => tio.observe(el));
}
