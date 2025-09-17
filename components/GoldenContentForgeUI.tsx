"use client";

import { useState } from "react";

/* ---- Brand header met logo + brede fallback ---- */
function BrandTitle() {
  const [i, setI] = useState(0);
  const candidates = [
    "/gcf-logo.svg",
    "/gcf-logo.png",
    "/brands/forge.svg",
    "/brands/forge.png",
    "/brands/golden-content-forge.svg",
    "/brands/golden-content-forge.png",
    "/brands/gcf.svg",
    "/brands/gcf.png",
    "/logo.svg",
    "/logo.png",
  ];
  const src = i < candidates.length ? candidates[i] : null;

  return (
    <div className="flex items-center gap-3">
      {src ? (
        <img
          src={`${src}?v=1`}             // mini cache-buster
          alt="Golden Content Forge"
          width={28}
          height={28}
          className="shrink-0 rounded-md"
          onError={() => setI((n) => n + 1)}  // probeer volgende kandidaat
        />
      ) : null}
      <h1 className="text-3xl font-extrabold tracking-tight">
        <span className="text-amber-300">Golden</span>{" "}
        <span className="text-amber-100">Content Forge</span>
      </h1>
    </div>
  );
}
/* ----------------------------------------------- */


type BlogSavedPayload = {
  title: string;
  slug?: string;
  summary?: string;
  canonical_url?: string;
};

export default function GoldenContentForgeUI({
  onBlogSaved,
}: {
  onBlogSaved?: (blog: BlogSavedPayload) => Promise<void> | void;
}) {
  const [prompt, setPrompt] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaPreview, setMetaPreview] = useState<string>("");
  const [blogPreview, setBlogPreview] = useState<string>("");
  const [log, setLog] = useState<string[]>([]);

  function pushLog(line: string) {
    setLog((l) => [new Date().toLocaleTimeString() + " — " + line, ...l].slice(0, 50));
  }

  async function handleForge() {
    if (!webhookUrl.trim()) {
      alert("Vul eerst je n8n Webhook URL in.");
      return;
    }
    if (!prompt.trim()) {
      alert("Schrijf eerst een korte scene/omschrijving.");
      return;
    }
    setLoading(true);
    pushLog("Start forge…");

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const ct = res.headers.get("content-type") || "";
      const data: any = ct.includes("application/json") ? await res.json() : await res.text();

      const title: string =
        (data?.title as string) ??
        (data?.blog?.title as string) ??
        (data?.meta?.title as string) ??
        "Untitled";

      const slug: string | undefined =
        (data?.slug as string) ?? (data?.blog?.slug as string) ?? undefined;

      const summary: string | undefined =
        (data?.summary as string) ??
        (data?.blog?.summary as string) ??
        (data?.meta?.description as string) ??
        undefined;

      const canonical_url: string | undefined =
        (data?.canonical_url as string) ??
        (data?.blog?.canonical_url as string) ??
        (data?.meta?.url as string) ??
        undefined;

      const metaText =
        typeof data?.meta === "string"
          ? data.meta
          : data?.meta
          ? JSON.stringify(data.meta, null, 2)
          : summary || "(geen meta ontvangen)";
      const blogText =
        typeof data?.blog === "string"
          ? data.blog
          : data?.blog?.content
          ? data.blog.content
          : JSON.stringify(data?.blog ?? data, null, 2);

      setMetaPreview(metaText);
      setBlogPreview(blogText);

      pushLog("Webhook OK — blog ontvangen.");

      await onBlogSaved?.({ title, slug, summary, canonical_url });
      pushLog("Forge: Source + socials aangemaakt.");
    } catch (e: any) {
      console.error(e);
      pushLog("Fout: " + (e?.message || "onbekend"));
      alert("Er ging iets mis: " + (e?.message || "onbekend"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <BrandTitle />

      {/* Top: prompt + webhook */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
          <label className="block text-sm text-slate-400 mb-2">Paint your scene</label>
          <textarea
            className="w-full min-h-[180px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none"
            placeholder="Korte scene/beeld. Voorbeeld: “Kleine studio, regen tikt op het raam… ik besluit mijn chaos te ordenen door hardop te creëren.”"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            onClick={handleForge}
            disabled={loading}
            className={[
              "mt-4 rounded-xl border px-4 py-2 text-sm",
              loading
                ? "border-slate-700/60 bg-slate-800/40 text-slate-500 cursor-not-allowed"
                : "border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20",
            ].join(" ")}
          >
            {loading ? "Aanmaken…" : "Forge ✨"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
          <label className="block text-sm text-slate-400 mb-2">n8n Webhook URL</label>
          <input
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none"
            placeholder="https://<jouw-n8n>.cloud/webhook/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
      </section>

      {/* Previews */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-yellow-300">Meta Preview</h3>
          <pre className="mt-3 whitespace-pre-wrap text-slate-300 text-sm" style={{ overflowWrap: "anywhere" }}>
            {metaPreview || "Nog niets — forge eerst, of wacht tot de meta is geschreven…"}
          </pre>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-300">Blog Preview</h3>
          <pre className="mt-3 whitespace-pre-wrap text-slate-300 text-sm" style={{ overflowWrap: "anywhere" }}>
            {blogPreview || "Nog niets — forge eerst, of wacht tot de blog klaar is…"}
          </pre>
        </div>
      </section>

      {/* Log */}
      <section className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Log</h3>
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {log.length === 0 ? <li>(leeg)</li> : log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </section>
    </main>
  );
}
