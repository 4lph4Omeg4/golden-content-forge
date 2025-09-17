"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// app/forge/page.tsx
import ForgeShell from "../../components/ForgeShell";
import PlatformBadge from "../../components/PlatformBadge";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Source = { id: string; title: string; slug: string | null; summary: string | null; created_at: string; };
type Derivative = { id: string; platform: string | null; kind: string | null; status: string | null; created_at: string; payload: any; };

export default function ForgeViewer() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(true);

  // bronnen ophalen
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("content_sources")
        .select("id,title,slug,summary,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!error && data) {
        setSources(data);
        if (data.length > 0) setSelectedId(data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  // socials voor geselecteerde bron
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data, error } = await supabase
        .from("content_derivatives")
        .select("id,platform,kind,status,created_at,payload")
        .eq("source_id", selectedId)
        .in("status", ["draft","review","approved","scheduled","posted"])
        .order("platform", { ascending: true })
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && data) setDerivatives(data as any);
    })();
  }, [selectedId]);

  if (loading) {
    return (
      <ForgeShell title="Golden Content Forge" subtitle="Preview">
        <div className="rounded-xl border bg-white p-6">⏳ Laden…</div>
      </ForgeShell>
    );
  }

  const selected = sources.find(s => s.id === selectedId) || null;

  return (
    <ForgeShell title="Golden Content Forge" subtitle="Preview van opgeslagen content">
      {/* bronselector */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`px-3 py-1 rounded-lg border text-sm transition ${
                s.id === selectedId
                  ? "bg-black text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
              title={s.slug ?? s.id}
            >
              {s.title || s.slug || s.id.slice(0,8)}
            </button>
          ))}
        </div>
      </section>

      {/* bron kop */}
      {selected && (
        <section className="rounded-xl border bg-white p-6 space-y-2">
          <h2 className="text-xl font-bold">{selected.title}</h2>
          {selected.summary && <p className="text-gray-600">{selected.summary}</p>}
          <p className="text-xs text-gray-400">Bron-ID: {selected.id}</p>
        </section>
      )}

      {/* socials */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Social posts</h3>
        {derivatives.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-gray-600">Nog geen socials voor deze bron.</div>
        ) : (
          derivatives.map(d => {
            const payload = d.payload || {};
            const text = payload.caption ?? payload.script ?? "";
            const hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.join(" ") : "";
            const link = payload.cta_url ?? "";
            return (
              <article key={d.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={d.platform ?? undefined} />
                    <span className="text-gray-500">{d.kind}</span>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{d.status}</span>
                </div>

                {text && <p className="mt-3 whitespace-pre-line leading-relaxed">{text}</p>}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {hashtags && <span className="text-xs text-gray-500">{hashtags}</span>}
                  {link && (
                    <a
                      className="text-sm text-blue-600 hover:underline break-all"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔗 {link}
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </ForgeShell>
  );
}
