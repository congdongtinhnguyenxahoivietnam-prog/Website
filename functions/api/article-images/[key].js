export async function onRequestGet({ params, env }) {
  if (!env.ARTICLE_IMAGES) return new Response("Image storage is not configured.", { status: 503 });
  const key = String(params.key || "");
  if (!/^articles-[a-zA-Z0-9_-]{1,100}-[0-9]+-[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key)) {
    return new Response("Not found.", { status: 404 });
  }

  const object = await env.ARTICLE_IMAGES.get(key);
  if (!object) return new Response("Not found.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
