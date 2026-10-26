// One canonical URL per page.
// Netlify serves /blog/slug and /blog/slug.html both as 200, and a redirect
// rule cannot reliably force the extensionless path onto the .html file
// (the extensionless path is shadowed by that file). This function does.
// _redirects repeats the same rules for deploys where the edge function is skipped.

const POST = /^\/blog\/([a-z0-9-]+)\/?$/;

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/blog") {
    return Response.redirect(`${url.origin}/blog/${url.search}`, 301);
  }

  if (path === "/blog/index" || path === "/blog/index.html") {
    return Response.redirect(`${url.origin}/blog/${url.search}`, 301);
  }

  const post = path.match(POST);
  if (post && post[1] !== "index") {
    return Response.redirect(`${url.origin}/blog/${post[1]}.html${url.search}`, 301);
  }

  if (path === "/ai-training" || path === "/ai-training/") {
    return Response.redirect(`${url.origin}/ai-training.html${url.search}`, 301);
  }

  return context.next();
};

export const config = {
  path: ["/blog", "/blog/*", "/ai-training", "/ai-training/"],
};
