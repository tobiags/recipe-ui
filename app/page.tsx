"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Engine = "flux_replicate" | "flux_pro" | "midjourney";
type Lang = "fr" | "en";

type GenerateRequest = {
  topic: string;
  recipe_count: number;
  image_count: number;
  image_engine: Engine;
  style_ref_url: string | null;
  prompt_override: string | null;
  output: { aspect_ratio: string; image_format: string };
  client: { email: string | null };
};

type GenerateResponse = {
  request_id: string;
  status: "done" | "error";
  topic?: string;
  recipe_count?: number;
  image_count?: number;
  files?: {
    article: { name: string; download_url: string } | null;
    album_zip: { name: string; download_url: string } | null;
  };
  error?: { code: string; message: string };
};

const M = {
  fr: {
    brand: "Console Recettes",
    tagline: "Générez un article + un album d’images (ZIP) via votre workflow n8n — sans exposer n8n au client.",
    lang: "Langue",
    generate: "Générer",
    generating: "Génération en cours…",
    advanced: "Options avancées",
    hideAdvanced: "Masquer",
    inputs: "Paramètres",
    results: "Téléchargements",
    topic: "Sujet",
    recipeCount: "Nombre de recettes",
    imageCount: "Nombre d’images",
    engine: "Moteur d’images",
    styleRef: "Référence de style (URL)",
    promptOverride: "Prompt personnalisé",
    aspect: "Ratio",
    format: "Format image",
    email: "Email client",
    tip: "Astuce : la génération peut prendre plusieurs minutes selon le moteur.",
    status: "Statut",
    request: "Requête",
    dlArticle: "Télécharger l’article",
    dlAlbum: "Télécharger l’album (ZIP)",
    raw: "JSON brut",
    empty: "Lance une génération pour afficher les liens.",
    progress: "Avancement",
    elapsed: "Temps écoulé",
    s1: "Analyse",
    s2: "Rédaction",
    s3: "Images",
    s4: "Packaging",
    error: "Erreur",
  },
  en: {
    brand: "Recipe Console",
    tagline: "Generate an article + an image album (ZIP) via n8n — without exposing n8n to the client.",
    lang: "Language",
    generate: "Generate",
    generating: "Generating…",
    advanced: "Advanced",
    hideAdvanced: "Hide",
    inputs: "Inputs",
    results: "Downloads",
    topic: "Topic",
    recipeCount: "Recipe count",
    imageCount: "Image count",
    engine: "Image engine",
    styleRef: "Style reference (URL)",
    promptOverride: "Prompt override",
    aspect: "Aspect ratio",
    format: "Image format",
    email: "Client email",
    tip: "Tip: generation can take a few minutes depending on the engine.",
    status: "Status",
    request: "Request",
    dlArticle: "Download article",
    dlAlbum: "Download album (ZIP)",
    raw: "Raw JSON",
    empty: "Run a generation to show the download links.",
    progress: "Progress",
    elapsed: "Elapsed",
    s1: "Analyze",
    s2: "Write",
    s3: "Images",
    s4: "Package",
    error: "Error",
  },
} as const;

function cx(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(" ");
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-black/70 shadow-sm">
      {children}
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-extrabold text-black/80">{label}</span>
        {hint ? <span className="text-xs text-black/45">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Progress({ active, value }: { active: boolean; value: number }) {
  const v = Math.max(3, Math.min(100, value));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/10">
      <div
        className={cx(
          "h-full rounded-full transition-all duration-500",
          active
            ? "bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400"
            : "bg-black/20"
        )}
        style={{ width: `${v}%` }}
      />
      {active && (
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="h-full w-full animate-[shine_1.1s_linear_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.8),transparent)]" />
        </div>
      )}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(60%); }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr");
  const t = M[lang];

  // inputs
  const [topic, setTopic] = useState("Top 3 Recettes Curry");
  const [recipeCount, setRecipeCount] = useState(3);
  const [imageCount, setImageCount] = useState(3);
  const [engine, setEngine] = useState<Engine>("flux_replicate");
  const [styleRefUrl, setStyleRefUrl] = useState("");
  const [promptOverride, setPromptOverride] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:2");
  const [imageFormat, setImageFormat] = useState("jpg");
  const [email, setEmail] = useState("");

  // ui state
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // progress (indicatif)
  const startedAt = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  const canSubmit = useMemo(
    () => topic.trim().length > 0 && recipeCount >= 1 && imageCount >= 0,
    [topic, recipeCount, imageCount]
  );

  useEffect(() => {
    if (!loading) return;
    const it = setInterval(() => {
      if (!startedAt.current) return;
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      const p = 100 * (1 - Math.exp(-ms / 45000));
      setProgress(Math.min(92, Math.round(p)));
    }, 300);
    return () => clearInterval(it);
  }, [loading]);

  const steps = [t.s1, t.s2, t.s3, t.s4];
  const stepIndex = useMemo(() => {
    if (!loading) return resp ? 3 : 0;
    if (progress < 18) return 0;
    if (progress < 48) return 1;
    if (progress < 82) return 2;
    return 3;
  }, [loading, progress, resp]);

  async function onGenerate() {
    setErr(null);
    setResp(null);

    const payload: GenerateRequest = {
      topic: topic.trim(),
      recipe_count: Number(recipeCount),
      image_count: Number(imageCount),
      image_engine: engine,
      style_ref_url: styleRefUrl.trim() ? styleRefUrl.trim() : null,
      prompt_override: promptOverride.trim() ? promptOverride.trim() : null,
      output: { aspect_ratio: aspectRatio.trim() || "3:2", image_format: imageFormat },
      client: { email: email.trim() ? email.trim() : null },
    };

    startedAt.current = Date.now();
    setElapsed(0);
    setProgress(5);
    setLoading(true);

    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await r.json()) as GenerateResponse;
      if (!r.ok) {
        setErr(`HTTP ${r.status}: ${JSON.stringify(data)}`);
        return;
      }
      setResp(data);
      setProgress(100);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] text-black">
      {/* background cuisine: crème + accents safran/tomate/menthe */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/80 via-rose-200/70 to-emerald-200/70 blur-3xl" />
        <div className="absolute top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-rose-200/70 to-orange-200/70 blur-3xl" />
        <div className="absolute bottom-24 -right-24 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-200/70 to-cyan-200/60 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>🍋 {t.brand}</Chip>
              <Chip>🍅 {t.lang}: {lang.toUpperCase()}</Chip>
              <Chip>🌿 n8n caché</Chip>
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {t.brand}
              <span className="text-black/45"> — cuisine UI</span>
            </h1>
            <p className="max-w-2xl text-sm text-black/60">{t.tagline}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-1 shadow-sm">
              <button
                onClick={() => setLang("fr")}
                className={cx("rounded-xl px-3 py-2 text-sm font-extrabold", lang === "fr" ? "bg-black text-white" : "text-black/60 hover:text-black")}
              >
                FR
              </button>
              <button
                onClick={() => setLang("en")}
                className={cx("rounded-xl px-3 py-2 text-sm font-extrabold", lang === "en" ? "bg-black text-white" : "text-black/60 hover:text-black")}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setAdvanced((v) => !v)}
              className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-extrabold shadow-sm transition hover:bg-white"
            >
              {advanced ? t.hideAdvanced : t.advanced}
            </button>

            <button
              disabled={!canSubmit || loading}
              onClick={onGenerate}
              className={cx(
                "rounded-2xl px-5 py-2.5 text-sm font-black shadow-sm transition",
                (!canSubmit || loading)
                  ? "bg-black/20 text-black/40"
                  : "bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 text-white hover:opacity-95"
              )}
            >
              {loading ? t.generating : t.generate}
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Inputs */}
          <div className="lg:col-span-2 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-black">{t.inputs}</h2>
                <p className="mt-1 text-sm text-black/60">{t.tip}</p>
              </div>

              {/* Progress */}
              <div className="min-w-[260px] rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-extrabold text-black/60">
                  <span>{t.progress}</span>
                  <span>{t.elapsed}: {fmt(elapsed)}</span>
                </div>
                <div className="mt-2">
                  <Progress active={loading} value={loading ? progress : resp ? 100 : 0} />
                </div>
                <div className="mt-3 grid gap-1 text-xs">
                  {steps.map((s, i) => (
                    <div key={s} className="flex items-center justify-between">
                      <span className={cx("font-extrabold", i <= stepIndex ? "text-black/80" : "text-black/30")}>{s}</span>
                      <span className={cx("font-black", i < stepIndex ? "text-emerald-700" : i === stepIndex && loading ? "text-rose-600" : "text-black/20")}>
                        {i < stepIndex ? "✓" : i === stepIndex && loading ? "…" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label={t.topic} hint="textarea">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80 outline-none placeholder:text-black/30 focus:border-black/20"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t.recipeCount}>
                  <input
                    type="number"
                    min={1}
                    value={recipeCount}
                    onChange={(e) => setRecipeCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                  />
                </Field>

                <Field label={t.imageCount}>
                  <input
                    type="number"
                    min={0}
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                  />
                </Field>
              </div>

              <Field label={t.engine}>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as Engine)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                >
                  <option value="flux_replicate">flux_replicate</option>
                  <option value="flux_pro">flux_pro</option>
                  <option value="midjourney">midjourney</option>
                </select>
              </Field>

              {advanced && (
                <div className="grid gap-4 rounded-3xl border border-black/10 bg-white p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t.styleRef} hint="optional">
                      <input
                        value={styleRefUrl}
                        onChange={(e) => setStyleRefUrl(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                        placeholder="https://..."
                      />
                    </Field>

                    <Field label={t.email} hint="optional">
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                        placeholder="client@email.com"
                      />
                    </Field>
                  </div>

                  <Field label={t.promptOverride} hint="optional">
                    <textarea
                      value={promptOverride}
                      onChange={(e) => setPromptOverride(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                      placeholder="Ex: photo culinaire, lumière naturelle, fond clair…"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t.aspect}>
                      <input
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                        placeholder="3:2"
                      />
                    </Field>

                    <Field label={t.format}>
                      <select
                        value={imageFormat}
                        onChange={(e) => setImageFormat(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                      >
                        <option value="jpg">jpg</option>
                        <option value="png">png</option>
                        <option value="webp">webp</option>
                      </select>
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
            <h2 className="text-base font-black">{t.results}</h2>
            <p className="mt-1 text-sm text-black/60">{t.empty}</p>

            {err && (
              <div className="mt-5 rounded-3xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
                <span className="font-black">{t.error}:</span> {err}
              </div>
            )}

            {!resp && !err && (
              <div className="mt-5 rounded-3xl border border-black/10 bg-white p-5 text-sm text-black/60">
                {t.empty}
              </div>
            )}

            {resp && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Chip>✅ {t.status}: {resp.status}</Chip>
                  <Chip>🧾 {t.request}: {resp.request_id}</Chip>
                </div>

                <div className="grid gap-3">
                  {resp.files?.article?.download_url && (
                    <a
                      href={resp.files.article.download_url}
                      className="group flex items-center justify-between rounded-3xl border border-black/10 bg-white px-4 py-4 text-sm font-extrabold shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="text-black/90">{t.dlArticle}</div>
                        <div className="mt-1 text-xs font-semibold text-black/50">{resp.files.article.name}</div>
                      </div>
                      <span className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 px-3 py-2 text-white shadow-sm transition group-hover:opacity-95">
                        ↓
                      </span>
                    </a>
                  )}

                  {resp.files?.album_zip?.download_url && (
                    <a
                      href={resp.files.album_zip.download_url}
                      className="group flex items-center justify-between rounded-3xl border border-black/10 bg-white px-4 py-4 text-sm font-extrabold shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="text-black/90">{t.dlAlbum}</div>
                        <div className="mt-1 text-xs font-semibold text-black/50">{resp.files.album_zip.name}</div>
                      </div>
                      <span className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 px-3 py-2 text-white shadow-sm transition group-hover:opacity-95">
                        ↓
                      </span>
                    </a>
                  )}
                </div>

                <details className="rounded-3xl border border-black/10 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-black/70">{t.raw}</summary>
                  <pre className="mt-3 overflow-auto text-xs text-black/60">{JSON.stringify(resp, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
