// components/GoldenContentForgeUI.tsx
"use client";

import React, { useMemo, useState } from "react";

/** Defaults from env (optioneel invullen in .env.local) */
const DEFAULTS = {
  webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isUUID(v?: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    (v || "").trim()
  );
}

async function postWebhook(url: string, text: string) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`Webhook ${r.status}`);
  return r.json() as Promise<{ ok?: boolean; idea_id?: string; id?: string }>;
}

async function fetchMeta(base: string, anon: string, ideaId: string) {
  const url = `${base}/rest/v1/idea_meta?idea_id=eq.${encodeURIComponent(
    ideaId
  )}&select=idea_id,title,summary,topics,reading_time_sec`;
  const r = await fetch(url, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "count=exact",
    },
  });
  if (!r.ok) throw new Error(`meta ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j[0] : j;
}

async function fetchBlog(base: string, anon: string, ideaId: string) {
  const url = `${base}/rest/v1/content_staging?idea_id=eq.${encodeURIComponent(
    ideaId
  )}&format=eq.blog&select=idea_id,title,body,lang,status,tags`;
  const r = await fetch(url, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "count=exact",
    },
  });
  if (!r.ok) throw new Error(`blog ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j[0] : j;
}

export default function GoldenContentForgeUI() {
  const [scene, setScene] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(DEFAULTS.webhookUrl);
  const [sbUrl, setSbUrl] = useState(DEFAULTS.supabaseUrl);
  const [sbAnon, setSbAnon] = useState(DEFAULTS.supabaseAnon);

  const [loading, setLoading] = useState(false);
  const [ideaId, setIdeaId] = useState("");
  const [meta, setMeta] = useState<any>(null);
  const [blog, setBlog] = useState<any>(null);
  const [log, setLog] = useState<{ t: string; m: string }[]>([]);

  function push(msg: unknown) {
    setLog((xs) => [
      ...xs,
      {
        t: new Date().toLocaleTimeString(),
        m: typeof msg === "string" ? msg : JSON.stringify(msg),
      },
    ]);
  }

  async function pollForResults(
    base: string,
    anon: string,
    ideaId: string,
    { tries = 20, delayMs = 1500 } = {}
  ) {
    for (let i = 0; i < tries; i++) {
      try {
        const [m, b] = await Promise.all([
          fetchMeta(base, anon, ideaId).catch(() => null),
          fetchBlog(base, anon, ideaId).catch(() => null),
        ]);
        if (m) setMeta(m);
        if (b) setBlog(b);
        if (m && b) return { m, b };
      } catch {
        // ignore
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return { m: null, b: null };
  }

  async function handleForge(e: React.FormEvent) {
    e.preventDefault();
    setMeta(null);
    setBlog(null);
    setIdeaId("");
    setLog([]);

    const sceneClean = scene.trim();
    if (!sceneClean) return push("Geef eerst je scene in.");
    if (!webhookUrl) return push("Vul je n8n webhook URL in.");

    try {
      setLoading(true);
      push("POST → webhook…");
      const resp = await postWebhook(webhookUrl, sceneClean);
      push(resp);
      const id = resp?.idea_id || resp?.id || "";
      if (!id || !isUUID(id)) {
        push("Geen geldige idea_id ontvangen — check Respond-node of Webhook mode.");
        setIdeaId(String(id || ""));
        return;
      }
      setIdeaId(id);

      if (sbUrl && sbAnon) {
        push("Poll Supabase voor meta + blog…");
        await pollForResults(sbUrl, sbAnon, id);
      } else {
        push("Supabase URL/Anon niet ingevuld — alleen idea_id getoond.");
      }
    } catch (e: any) {
      console.error(e);
      push(`Fout: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  const envFilled = Boolean(DEFAULTS.webhookUrl && DEFAULTS.supabaseUrl && DEFAULTS.supabaseAnon);
  const canQuerySb = useMemo(() => Boolean(sbUrl && sbAnon && isUUID(ideaId)), [sbUrl, sbAnon, ideaId]);

  return (
    <div>
      {/* HERO */}
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
            Paint → Blog Forge
          </span>
        </h1>
        <p className="mt-2 text-slate-300/80">
          Schilder een scene. Klik <span className="font-semibold">Forge</span>. Krijg titel, samenvatting &amp; blog — klaar voor publicatie.
        </p>
      </header>

      {/* FORM + CONFIG */}
      <form onSubmit={handleForge} className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-xl backdrop-blur">
          <label className="block text-sm font-medium mb-2 text-slate-300">Paint your scene</label>
          <textarea
            className="w-full h-44 resize-vertical rounded-xl bg-slate-950/60 ring-1 ring-white/10 p-4 outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-slate-500"
            placeholder='Korte scene/beeld. Voorbeeld: "Kleine studio, regen tikt op het raam… ik besluit mijn chaos te ordenen door hardop te creëren."'
            value={scene}
            onChange={(e) => setScene(e.target.value)}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className={cx(
                "inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold",
                "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950",
                "shadow-[0_8px_30px_rgb(253_186_116_/_45%)] hover:brightness-110 active:scale-[.99] transition",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Bezig…" : "Forge ✨"}
            </button>
            {ideaId && (
              <span className="text-xs text-slate-400">
                idea_id: <span className="font-mono">{ideaId}</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-xl backdrop-blur space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">n8n Webhook URL</label>
            <input
              className="w-full rounded-lg bg-slate-950/60 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/50"
              placeholder="https://your-n8n/.../webhook/paint"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          {!envFilled && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Supabase URL (preview)</label>
                <input
                  className="w-full rounded-lg bg-slate-950/60 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="https://xxxxx.supabase.co"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Supabase anon key (preview)</label>
                <input
                  className="w-full rounded-lg bg-slate-950/60 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="ey... (alleen anon; geen service_role)"
                  value={sbAnon}
                  onChange={(e) => setSbAnon(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-400/80">
                Deze keys worden alleen client-side gebruikt voor read-only previews. Zorg dat RLS select aan staat.
              </p>
            </>
          )}
        </div>
      </form>

      {/* PREVIEWS */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-xl backdrop-blur min-h-48">
          <div className="mb-3 text-sm uppercase tracking-widest text-amber-300/80">Meta Preview</div>
          {!meta ? (
            <p className="text-sm text-slate-400">Nog niets — forge eerst, of wacht tot de meta is geschreven…</p>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-amber-200">{meta.title}</h2>
              <p className="text-slate-300/90">{meta.summary}</p>
              {Array.isArray(meta.topics) && meta.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {meta.topics.map((t: any, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs rounded-full bg-slate-800 ring-1 ring-white/10 text-slate-200"
                    >
                      {String(t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-xl backdrop-blur min-h-48">
          <div className="mb-3 text-sm uppercase tracking-widest text-emerald-300/80">Blog Preview</div>
          {!blog ? (
            <p className="text-sm text-slate-400">Nog niets — forge eerst, of wacht tot de blog klaar is…</p>
          ) : (
            <article className="prose prose-invert prose-slate max-w-none">
              <h1 className="!mb-2">{blog.title}</h1>
              <div className="whitespace-pre-wrap text-slate-200/95 leading-relaxed">{blog.body}</div>
            </article>
          )}
        </div>
      </section>

      {/* LOG */}
      <section className="mt-8 p-5 rounded-2xl bg-black/40 ring-1 ring-white/10 shadow-lg">
        <div className="mb-2 text-sm uppercase tracking-widest text-slate-400">Log</div>
        <div className="text-xs font-mono space-y-1 max-h-48 overflow-auto">
          {log.map((l, i) => (
            <div key={i} className="text-slate-300">
              <span className="text-slate-500">{l.t}</span> — {l.m}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}