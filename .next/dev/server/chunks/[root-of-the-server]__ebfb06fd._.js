module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/api/generate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
const runtime = "nodejs";
async function POST(req) {
    // SIGNATURE (temp) — à supprimer après validation
    if (req.headers.get("x-signature-check") === "1") {
        return Response.json({
            ok: true,
            file: "app/api/generate/route.ts",
            mode: "relative_urls_expected"
        });
    }
    const n8n = process.env.N8N_BASE_URL;
    if (!n8n) {
        return Response.json({
            status: "error",
            error: {
                code: "CONFIG",
                message: "N8N_BASE_URL missing"
            }
        }, {
            status: 500
        });
    }
    const payload = await req.json();
    // FAST TEST: ne contacte pas n8n si x-dry-run=1
    if (req.headers.get("x-dry-run") === "1") {
        return Response.json({
            request_id: "dry-run",
            status: "done",
            echo: payload,
            files: {
                article: {
                    name: "article_test.md",
                    download_url: `/api/download/article?file_id=TEST&name=article_test.md`
                },
                album_zip: {
                    name: "album_test.zip",
                    download_url: `/api/download/album?file_id=TEST&name=album_test.zip`
                }
            }
        });
    }
    const upstream = await fetch(`${n8n}/webhook/v1/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await upstream.json();
    // Réécriture RELATIVE (pas d'origin => OK local + prod + coolify)
    if (data?.files?.article?.download_url) {
        const u = new URL(data.files.article.download_url);
        const file_id = u.searchParams.get("file_id") || "";
        const name = u.searchParams.get("name") || "article.md";
        data.files.article.download_url = `/api/download/article?file_id=${encodeURIComponent(file_id)}&name=${encodeURIComponent(name)}`;
    }
    if (data?.files?.album_zip?.download_url) {
        const u = new URL(data.files.album_zip.download_url);
        const file_id = u.searchParams.get("file_id") || "";
        const name = u.searchParams.get("name") || "album.zip";
        data.files.album_zip.download_url = `/api/download/album?file_id=${encodeURIComponent(file_id)}&name=${encodeURIComponent(name)}`;
    }
    return Response.json(data, {
        status: upstream.status
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ebfb06fd._.js.map