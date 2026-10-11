import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default("Hi it's Amber!"),
    hero: z.string(),
    meta: z.array(z.object({ label: z.string(), value: z.string() })),
    toc: z.array(z.object({ label: z.string(), id: z.string() })).optional(),
    next: z.object({ slug: z.string(), eyebrow: z.string(), title: z.string(), tags: z.array(z.string()).default([]) }),
  }),
});

export const collections = { work };
