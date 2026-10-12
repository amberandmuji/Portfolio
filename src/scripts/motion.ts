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
document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
  if (el.getBoundingClientRect().top >= window.innerHeight) { el.classList.add('pending'); io.observe(el); }
});

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

/* 7. Cursor label: a pill that follows the pointer over [data-cursor] (mouse/trackpad only).
   Position is eased toward the pointer once per animation frame (no CSS transition on
   position, so it never restarts or overshoots); fade/scale use their own CSS transitions. */
const label = document.querySelector<HTMLElement>('[data-cursor-label]');
if (label && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.documentElement.classList.add('has-cursor-label');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current: Element | null = null;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, last = 0, hideTimer = 0;
  const render = () => { label.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`; };
  const tick = (t: number) => {
    const dt = last ? Math.min(64, t - last) : 16; last = t;
    const k = reduce ? 1 : 1 - Math.pow(0.0008, dt / 1000 * 3);   // frame-rate independent ease (~90ms to settle)
    x += (tx - x) * k; y += (ty - y) * k;
    render();
    if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(tick);
    else { x = tx; y = ty; render(); raf = 0; last = 0; }
  };
  const show = (target: Element, e: PointerEvent) => {
    clearTimeout(hideTimer);
    const text = target.getAttribute('data-cursor') || '';
    if (label.textContent !== text) label.textContent = text;
    if (!label.classList.contains('on')) { x = tx = e.clientX; y = ty = e.clientY; render(); }   // appear right at the pointer
    label.classList.add('on');
  };
  const hide = (delay = 90) => {      // short grace period so moving between cards doesn't flicker
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => { current = null; label.classList.remove('on'); }, delay);
  };
  document.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    const target = (e.target as Element).closest('[data-cursor]');
    if (target) { current = target; show(target, e); }
    else if (current) hide();
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => hide(0));
  window.addEventListener('blur', () => hide(0));
}
