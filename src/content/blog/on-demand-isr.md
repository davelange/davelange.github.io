---
title: On demand ISR with Next.JS and Sanity 
publishedAt: November 2022
description: We’ve been exploring smarter ways of updating static sites. With Next.JS’s on-demand ISR and Sanity CMS, we can keep content up to date and build times down.
canonical: https://blog.finiam.com/blog/on-demand-isr-with-next-js-and-sanity
---

# On demand ISR with Next.JS and Sanity 

_This was originally written for [Finiam](https://blog.finiam.com/blog/on-demand-isr-with-next-js-and-sanity)_

Static sites are great, right? You get excellent performance and can make the most out of CDNs and caching. Frameworks like Next.JS have made it quite easy to create and deploy static content, and you can mix it up with SSR (server side rendering) when needed.

SSG (static site generation) has traditionally had a pretty big downside though - when you need to update something, you have to rebuild *the whole thing all over again*. With Next.JS though, we can mitigate that problem with ISR (Incremental Static Regenaration). Basically, ISR adds functionality to regenerate specific pages, and version 12.1 of Next brought us the highly requested **on demand ISR**.

This means a static Next site that fetches content from a CMS can now get updated on demand, (re)building only the parts that actually need to change. 

So I decided to investigate how I could update a static site connected to [Sanity CMS](https://www.sanity.io/). For those of you who don't know, Sanity is an open-source CMS - it's flexible and pretty easy to get started with, and a great choice if you want to just host some content. 

## On demand revalidation

First, here's the example for ISR in the [Next.JS docs](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration#on-demand-revalidation):

```typescript
// pages/api/revalidate.js

export default async function handler(req, res) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.MY_SECRET_TOKEN) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    // this should be the actual path not a rewritten path
    // e.g. for "/blog/[slug]" this should be "/blog/post-1"
    await res.revalidate('/path-to-revalidate')
    return res.json({ revalidated: true })
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send('Error revalidating')
  }
}

```

The idea here is that you can send a request to a `api/revalidate` endpoint, and then call the `revalidate` method on the response object, passing in the path you want to update. Pretty simple right?

## Sanity custom actions
So how do we call that `revalidate` endpoint from Sanity? 

One option is using [Sanity's webhooks](https://www.sanity.io/docs/webhooks), and there's already an article on that [right here](https://dev.to/valse/nextjs-on-demand-isr-by-sanity-groq-powered-webhooks-221n)! 

However, you might need a little more flexibility and control - for instance you might not want to trigger rebuilds on every single update. Or maybe you need to send requests to different frontends at different times (like when you have a staging site and a production site). 

In these cases, you can use custom Sanity actions. Basically, these let you add buttons to the studio editor.

![](https://i.imgur.com/flr6D44.png)

You can find a good starter on [adding actions in Sanity's docs here](https://www.sanity.io/docs/document-actions), so I'll skip to the action itself:

```javascript
export function MovieUpdateBlog(props) {
  const [status, setStatus] = useState("pending");

  const label = useMemo(() => {
    switch (status) {
      case "success":
        return "Updated";
      case "error":
        return "Something went wrong";
      default:
        return "Update blog";
    }
  }, [status]);

  if (props.type !== "movie") {
    return null;
  }

  return {
    label,
    onHandle: async () => {
      // this gets called when the button is clicked
      try {
        await revalidatePath(`/movie/${props.published.slug.current}`);

        setStatus("success");
      } catch (err) {
        setStatus("error");
      } finally {
        // Signal that the action is completed
        props.onComplete();
      }
    },
  };
}

```

First, we check what the document type is - in this case I only want this action to apply to `"movie"` documents. When the button is clicked, the `onHandle` function runs, and we pass in the document slug to a `revalidatePath` function: 

```javascript
async function revalidatePath(path: string) {
  try {
    const endpoint = new URL(FRONTEND_API_URL);

    endpoint.searchParams.append("path", path);
    endpoint.searchParams.append("secret", SECRET_TOKEN);

    await fetch(endpoint.href);
  } catch (err) {
    console.error(err);

    return null;
  }
}
```
This sends the request with the updated path to our frontend's `revalidate` endpoint. Success!

## No, it's not so simple

In most cases one updated piece of content will require other changes elsewhere. Imagine a static site about movies - the homepage will show links to each movie's page, and on that page there's a list of the movie's cast, who also have their own page:


![](https://i.imgur.com/Z3VZdnW.png)


*Fig.1: complex diagram clearly demonstrates how I could have been an architect*

If we update Movie #1's name, we'll need to rebuild its page *and* the homepage, or else it would still show the old name. And if we update Person A's name, we need to also update the page of any movie that mentions them. 

This will always depend on how your site is structured, but in this case we can deal with this logic within the action we just created:

```javascript
await revalidatePaths([`/movie/${props.draft.slug.current}`, "/"]);
```
```typescript
async function revalidatePaths(paths: string[]) {
  try {
    const endpoint = new URL(FRONTEND_API_URL);

    endpoint.searchParams.append("paths", paths.join(","));
    endpoint.searchParams.append("secret", SECRET_TOKEN);

    return fetch(endpoint.href);
  } catch (err) {
    console.error(err);

    return null;
  }
}
```

We're simply passing the movie's path and the `/` homepage path. We then have to deal with multiple paths on revalidation endpoint:

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATION_TOKEN) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const paths = (req.query.paths as string).split(",");

    for(let i = 0; i < paths.length; i++) {
      await res.revalidate(paths[i]);
    }

    return res.json({ revalidated: true });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send("Error revalidating");
  }
}
```

So what about updates to Person pages? For that, we need a new action with a little more logic:

```javascript
export function OnUpdatePerson(props) {
  const [status, setStatus] = useState("pending");

  const label = useMemo(() => {
    switch (status) {
      case "success":
        return "Updated";
      case "error":
        return "Something went wrong";
      default:
        return "Update blog";
    }
  }, [status]);

  if (props.type !== "person") {
    return null;
  }
  
  return {
    label,
    onHandle: async () => {
      try {
        const dependantMoviesReq = await fetch(`${SANITY_ENDPOINT}?query=*["${props.id}" in castMembers[].person._ref]`);
          
        const { result } = await dependantMoviesReq.json();
          
        const movieSlugs = result.map((movie) => `/movie/${movie.slug.current}`);         
        const personSlug = `/people/${props.published.slug.current}`;

        await revalidatePath([personSlug, ...movieSlugs]);

        setStatus("success");
      } catch (err) {
        setStatus("error");
      } finally {
        // Signal that the action is completed
        props.onComplete();
      }
    },
  };
```

To know what movies mention the updated person, we need to query Sanity. And if you're wondering what on earth this is:
```javascript
`${SANITY_ENDPOINT}?query=*["${props.id}" in castMembers[].person._ref]`
```
it's [GROQ](https://www.sanity.io/docs/groq), Sanity's custom query language. I would probably just use GraphQL, but I thought it would be interesting to try out GROQ for this demo. 

Anyway, the query returns an array of movies that refer to the person. So we just get those slugs and add the current person slug, and pass it all to `revalidatePath`. And now we can update all the affected pages with just one click. This kind of logic will really be specific to each case - you should also change what paths you update based on the specifc data that was changed - an update to the person's bio might not require rebuilding pages that only contain their name.

## Adding new data
Does this work when creating new pages? Yes, but there's an important detail you might miss. In the movie page scenario, I'm using `getStaticPaths` + `getStaticProps`:
```javascript
export const getStaticPaths: GetStaticPaths = async () => {
  const { allMovie } = await getAllMovies();

  const paths = allMovie.map((item) => ({
    params: {
      slug: item.slug.current,
    },
  }));

  return {
    paths,
    fallback: true,
  };
};
```
If `fallback` is false, it won't work - the result of `getStaticPaths` would be the same as at build time, when the new content didn't exist. Setting it to `true` ensures it gets called again.

## Some things to consider
With that, we have a much smarter way of updating static pages. Still, there are some things you should consider before you start ISRing everything:

- Serverless function limitations. There is usually some execution timeout on these (you can check out [Vercel's](https://vercel.com/docs/concepts/limits/overview) here), so there's a limit to how many paths you can revalidate.
- Are you using a cached endpoint? For instance, Sanity provides a live endpoint and a `cdn` version. If you use the `cdn` endpoint in your build, it might not get fresh data when revalidating.
- You will need to setup CORS for your endpoint to accept the requests once it's deployed. There's a guide on [how to do that here](https://nextjs.org/docs/api-routes/api-middlewares).
- Don't do this in the `api/revalidate` endpoint:
 ```typescript
paths.map(async (path) => await res.revalidate(path));

await Promise.all(paths);
```
This was my first approach, and though it worked fine in local builds, when I deployed it to Vercel it would just fail. Basically you have to revalidate the paths sequentially, so `Promise.all` is not an option.

## Wrapping up
On demand ISR is still a pretty recent feature, and I wouldn't be surprised if it changed somewhat in the near future. For now though, it looks like it could make static sites a lot easier to manage, and cut down on build times. 

Next step: actually implementing it on this blog :)
