import { ZodType } from "astro/zod";
import { defineCollection, z } from "astro:content";

const BlogPost = z.object({
  title: z.string(),
  description: z.string(),
  publishedAt: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
});

const blog = defineCollection({
  // Type-check frontmatter using a schema
  schema: BlogPost,
});

export type BlogPost = z.infer<typeof BlogPost>;

export const collections = { blog };
