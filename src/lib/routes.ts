export const routes = {
  home: `/`,
  blog: `/blog`,
  sideProjects: `/side-projects`,
  public: (path: string) => `/${path}`,
  blogPost: (slug: string) => `/blog/${slug}`,
};
