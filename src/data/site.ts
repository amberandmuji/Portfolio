// Central place for content shared across pages.
// Asset URLs still point at Framer's CDN; run `npm run pull-assets`
// to download them into /public/assets and rewrite these to local paths.

export const site = {
  name: 'Amber Liang',
  title: "Amber's portfolio",
  description: "Hi it's Amber!",
  ogImage: 'https://framerusercontent.com/images/2tbs2krqVM7Dv2BTvGuq46njxI.png',
  email: 'amberliangdesign@gmail.com',
  linkedin: 'https://www.linkedin.com/in/amberamberliang/',
  resume: 'https://drive.google.com/file/d/1A_y0yWqywBqdfvFAxsPZsVOIBvwer2c1/view?usp=sharing',
  gtm: 'GTM-KK8D28BG',
};

export const nav = [
  { label: 'Work', href: '/#projects' },
  { label: 'About', href: '/about' },
  { label: 'Resume', href: site.resume, external: true },
];

export type Card = { href: string; title: string; tags: string[]; media?: string; poster?: string; external?: boolean };

export const selectedWorks: Card[] = [
  {
    href: '/pcc-client-portal',
    title: 'Automated Partner File Portal I 12% Less Manual Work',
    tags: ['B2B', '0 to 1', 'Workflow Automation'],
    media: 'https://framerusercontent.com/assets/R3ubwcpGgOXQswe4PLhcGieQ.mp4',
  },
  {
    href: '/home-page-redesign',
    title: 'Homepage Redesign, AI Deployment I +52% Add-to-Cart',
    tags: ['B2C', 'E-Commerce', 'AI Dev Tools'],
    media: 'https://framerusercontent.com/assets/r8FQPS2aKImhrUqB50chBw4Ik.mp4',
  },
  {
    href: '/shopping-cart-redesign',
    title: 'Checkout Redesign, Price Transparency I +32% Conversion',
    tags: ['E-Commerce', 'Growth/CRO', 'Usability Testing'],
    media: 'https://framerusercontent.com/assets/Tk8LeIvcKNjSwlwUwoIDT2ti7M.mp4',
  },
  {
    href: '/budget-dashboard',
    title: 'Web-to-Mobile Budgeting, Dashboard I +20% Engagement',
    tags: ['Fintech', 'Design System', 'UX Design'],
    // The live card has no video; it uses the case-study hero image.
    poster: 'https://framerusercontent.com/images/MnuqMsgRw8GBqZt1lt1ABzq80xA.png',
  },
];

export const playground: Card[] = [
  {
    href: 'https://amberandmuji.github.io/portfolio-apps/starside-campfire/',
    title: 'Starside Campfire',
    tags: ['Claude Code'],
    media: 'https://framerusercontent.com/assets/zX50upwzkIQ5ciAP0xz3NgsOQ.mp4',
    external: true,
  },
  {
    href: 'https://amberandmuji.github.io/portfolio-apps/drape-room/',
    title: 'Drape Room',
    tags: ['Claude Code'],
    media: 'https://framerusercontent.com/assets/YqtuR1cPAAZWstF19JUaLxi0Aw.mp4',
    external: true,
  },
  {
    href: 'https://amberandmuji.github.io/portfolio-apps/hsinchu-wind/',
    title: 'Twenty Years in the Windy City',
    tags: ['Claude Code'],
    media: 'https://framerusercontent.com/assets/8NvRmpkyh6hJ1h1DKHR5gKeu0.mp4',
    external: true,
  },
  {
    href: '',
    title: 'Sent',
    tags: ['Claude Code', 'React'],
    media: 'https://framerusercontent.com/assets/LLFUNbfD4NxHQXcoqQxIorRa7F0.mp4',
  },
];

export const passion: Card[] = [
  {
    href: '/appeal-of-social-media-influencers',
    title: 'Why Audiences Trust Influencers Over Traditional Media: 45 Interviews, CHI 2023',
    tags: ['UX Research', 'CHI 2023 Publication'],
    poster: 'https://framerusercontent.com/images/3GelbFnJAJUD8dK3shAK8cgWGEw.png',
  },
  {
    href: '/design-system',
    title: 'Develop a Design System to Accelerate Development Time',
    tags: ['Design Systems', 'Fintech', '0 to 1'],
    poster: 'https://framerusercontent.com/images/nsD1ydpSQU1QkXElfy83ERJmuA.png',
  },
];

export const testimonials = [
  {
    name: 'Bofan Xu',
    role: 'CEO @Shepherd Money',
    photo: 'https://framerusercontent.com/images/1v9NRpCgHgzdhJaWOqd8YKekjrU.png?width=908&height=910',
    quote:
      'Amber Liang was an exceptional UIUX design intern. She played a key role in creating our design system and contributed to several critical pages. Amber collaborated seamlessly with our product and engineering teams, ensuring her designs were successfully implemented and launched. Her strong design skills, attention to detail, and ability to work cross-functionally made a significant impact.',
  },
  {
    name: 'Lai Wang',
    role: 'SWE @Shepherd Money',
    photo: 'https://framerusercontent.com/images/2odU3mUxdjE7fkjLco33bjg8Koc.png?width=908&height=906',
    quote:
      'Amber is a talented designer and a wonderful person to work with! I was working with her at Shepherd Money, where she led the creation and implementation of the internal design system. Her ability to collaborate across teams stood out —she consistently communicated design intent clearly and made thoughtful decisions that balanced user needs with technical feasibility. Her contributions have demonstrably benefited the entire product team.',
  },
];
