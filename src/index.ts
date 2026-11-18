import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "HEAD", "PUT", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Range", "X-Media-Token"]
}));

// Status endpoint
app.get("/", (c) => {
  return c.json({
    service: "IEADPG Media Storage (R2)",
    status: "online",
    bucket: "ieadpg",
    usage: "GET /<caminho/do/arquivo.ext>"
  });
});

// Manipulador de leitura (GET e HEAD) com suporte a HTTP Range e streaming
const handleRead = async (c: any) => {
  const rawKey = c.req.param("key");
  const key = decodeURIComponent(rawKey);

  if (!key) {
    return c.json({ error: "Chave do arquivo não fornecida" }, 400);
  }

  const range = c.req.header("range");
  const object = await c.env.MEDIA_BUCKET.get(key, {
    range: range ? c.req.raw.headers : undefined,
    onlyIf: c.req.raw.headers
  });

  if (!object) {
    return c.text("Arquivo não encontrado no repositório de mídia", 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (object.range) {
    const rangeHeader = `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`;
    headers.set("Content-Range", rangeHeader);
    headers.set("Content-Length", String(object.range.length));
    headers.set("Accept-Ranges", "bytes");

    return new Response(c.req.method === "HEAD" ? null : object.body, {
      status: 206,
      headers
    });
  }

  headers.set("Content-Length", String(object.size));
  headers.set("Accept-Ranges", "bytes");

  return new Response(c.req.method === "HEAD" ? null : object.body, {
    status: 200,
    headers
  });
};

app.get("/:key{.+}", handleRead);
app.on("HEAD", "/:key{.+}", handleRead);

// Upload seguro de arquivo
app.put("/:key{.+}", async (c) => {
  const rawKey = c.req.param("key");
  const key = decodeURIComponent(rawKey);

  if (!key) {
    return c.json({ error: "Chave do arquivo não fornecida" }, 400);
  }

  const authHeader = c.req.header("Authorization") || c.req.header("X-Media-Token");
  const expectedToken = c.env.MEDIA_UPLOAD_SECRET;

  if (!expectedToken || (authHeader !== `Bearer ${expectedToken}` && authHeader !== expectedToken)) {
    return c.text("Não autorizado", 401);
  }

  if (!c.req.raw.body) {
    return c.json({ error: "Corpo da requisição vazio" }, 400);
  }

  await c.env.MEDIA_BUCKET.put(key, c.req.raw.body, {
    httpMetadata: c.req.raw.headers
  });

  const url = new URL(c.req.url);
  return c.json({
    success: true,
    key,
    url: `${url.origin}/${key}`
  });
});

export default app;
