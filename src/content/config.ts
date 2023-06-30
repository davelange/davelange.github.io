import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    canonical: z.string(),
  }),
});

const sideProject = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    repo: z.string(),
    url: z.string(),
    order: z.number(),
  }),
});

export const collections = { blog, "side-projects": sideProject };
