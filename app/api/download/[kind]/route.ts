export const runtime = "nodejs";

function contentDisposition(name: string) {
  const safe = (name || "file").replace(/[\r\n"]/g, "").trim();
  return `attachment; filename="${safe}"`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const n8n = process.env.N8N_BASE_URL;
  if (!n8n) return new Response("N8N_BASE_URL missing", { status: 500 });

  const { kind: kindParam } = await params;

  const rawKind = kindParam ?? "";
  const kind = rawKind.toString().trim().toLowerCase().replace(/\/+$/, "");



  const url = new URL(req.url);
  const file_id = url.searchParams.get("file_id");
  const name = url.searchParams.get("name") || (kind === "album" ? "album.zip" : "article.md");

  if (!file_id) return new Response("file_id required", { status: 400 });

  const upstreamPath =
    kind === "article" ? "article" :
    kind === "album" ? "album" :
    null;

  if (!upstreamPath) return new Response("unknown kind", { status: 400 });

  const upstream = await fetch(
    `${n8n}/webhook/v1/download/${upstreamPath}?file_id=${encodeURIComponent(file_id)}&name=${encodeURIComponent(name)}`
  );

  if (!upstream.ok) {
    const txt = await upstream.text().catch(() => "");
    return new Response(txt || "upstream error", { status: upstream.status });
  }

   const headers = new Headers(upstream.headers);

  // FIX: éviter mismatch gzip/deflate entre upstream et Next/Node fetch
  headers.delete("content-encoding");
  headers.delete("content-length");

  headers.set("Content-Disposition", contentDisposition(name));

  // (optionnel mais utile) content-type explicite
  if (upstreamPath === "album") headers.set("Content-Type", "application/zip");
  if (upstreamPath === "article") headers.set("Content-Type", "text/markdown; charset=utf-8");

  return new Response(upstream.body, { status: 200, headers });

}
