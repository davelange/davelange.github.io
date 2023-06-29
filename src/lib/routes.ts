export const routes = {
  home: `/`,
  blog: `/blog`,
  sideProjects: `/side-projects`,
  about: `/about`,
  public: (path: string) => `/${path}`,
  blogPost: (slug: string) => `/blog/${slug}`,
};
