"use client";
import { useState } from "react";

/* ---- Brand header: simpel & robuust ---- */
function BrandTitle() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/brands/forge.svg?v=1"
        alt=""
        width={28}
        height={28}
        className="shrink-0 rounded-md"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img.src.includes(".svg")) img.src = "/brands/forge.png?v=1";
          else img.remove();
        }}
      />
      <h1 className="text-3xl font-extrabold tracking-tight">
        <span className="text-amber-300">Golden</span>{" "}
        <span className="text-amber-100">Content Forge</span>
      </h1>
    </div>
  );
}
/* --------------------------------------- */

/** ✏️ Vul je vaste webhook hieronder in (geen env gedoe). */
const WEBHOOK = "https://sh4m4ni4k.app.n8n.cloud/webhook/paint";

/** Helper om netjes te loggen in de UI */
function useLog() {
  const [log, setLog] = useState<string[]>([]);
  return {
    log,
    push(line: string) {
      setLog((l) => [new Date().toLocaleTimeString() + " — " + line, ...l].slice(0, 50));
    },
    clear() {
      setLog([]);
    },
  };
}

export default function GoldenContentForgeUI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaPreview, setMetaPreview] = useState<string>("");
  const [blogPreview, setBlogPreview] = useState<string>("");
  const { log, push } = useLog();

  async function handleForge() {
    if (!WEBHOOK || WEBHOOK.includes("<jouw-n8n>")) {
      return alert("Webhook URL ontbreekt of is nog niet ingevuld.");
    }
    if (!prompt.trim()) return alert("Schrijf eerst een korte scene/omschrijving.");

    setLoading(true);
    push("Start forge…");

    try {
      // 1) Webhook aanroepen
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const ct = res.headers.get("content-type") || "";
      const data: any = ct.includes("application/json") ? await res.json() : await res.text();

      // 2) Helpers (scoped → geen naam-conflicten)
      const pick = (obj: any, path: string) =>
        path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
      const stripHtml = (val: any) => {
        const s = typeof val === "string" ? val : "";
        const div = document.createElement("div");
        div.innerHTML = s;
        return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
      };
      const firstWords = (s: string, n = 12) => s.trim().split(/\s+/).slice(0, n).join(" ");

      // 3) Robuuste extractie (valt terug op blogtekst i.p.v. "Untitled")
      const rawBlogHtml =
        pick(data, "blog.content") ??
        pick(data, "content") ??
        pick(data, "html") ??
        "";
      const plainBlogText = stripHtml(rawBlogHtml);

      const title =
        ([
          "title",
          "blog.title",
          "meta.title",
          "seo.title",
          "meta.seoTitle",
          "meta.headline",
          "post.title",
        ]
          .map((p) => pick(data, p))
          .find((v) => typeof v === "string" && v.trim().length > 0) as string) ||
        (plainBlogText ? firstWords(plainBlogText, 12) : "") ||
        "Draft";

      const summary =
        ([
          "summary",
          "blog.summary",
          "meta.description",
          "seo.description",
          "excerpt",
          "blog.excerpt",
        ]
          .map((p) => pick(data, p))
          .find((v) => typeof v === "string" && v.trim().length > 0) as string) ||
        (plainBlogText ? plainBlogText.slice(0, 220) : "");

      const slug =
        (["slug", "blog.slug"]
          .map((p) => pick(data, p))
          .find((v) => typeof v === "string" && v.trim()) as string) || undefined;

      const canonicalUrl =
        (["canonical_url", "blog.canonical_url", "meta.url"]
          .map((p) => pick(data, p))
          .find((v) => typeof v === "string" && v.trim()) as string) ||
        (slug
          ? `${(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)}/blog/${slug}`
          : undefined);

      // 4) Previews in UI
      const metaPreviewText =
        typeof data?.meta === "string"
          ? data.meta
          : data?.meta
          ? JSON.stringify(data.meta, null, 2)
          : summary || "(geen meta ontvangen)";

      const blogPreviewText =
        typeof data?.blog === "string"
          ? data.blog
          : data?.blog?.content
          ? data.blog.content
          : JSON.stringify(data?.blog ?? data, null, 2);

      setMetaPreview(metaPreviewText);
      setBlogPreview(blogPreviewText);
      push("Webhook OK — blog ontvangen.");

      // 5) Forge laten aanmaken (source + 5 drafts)
      const forgeRes = await fetch("/api/forge/create-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, summary, canonicalUrl }),
      });
      const forgeCt = forgeRes.headers.get("content-type") || "";
      const forgeJson = forgeCt.includes("application/json") ? await forgeRes.json() : null;
      if (!forgeRes.ok || !forgeJson?.ok) throw new Error(forgeJson?.error || "Forge create failed");

      push("Forge: Source + socials aangemaakt.");
    } catch (e: any) {
      console.error(e);
      push("Fout: " + (e?.message || "onbekend"));
      alert("Er ging iets mis: " + (e?.message || "onbekend"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <BrandTitle />

      {/* Prompt + knop (hardcoded webhook; geen inputveld nodig) */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 md:col-span-2">
          <label className="block text-sm text-slate-400 mb-2">Paint your scene</label>
          <textarea
            className="w-full min-h-[180px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none"
            placeholder="Korte scene/beeld…"
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
