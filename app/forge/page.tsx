"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- UI helpers ----------
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function LogoBadge({ platform, label }: { platform?: string | null; label?: string | null }) {
  const key = (platform ?? "generic").toLowerCase();
  const map: Record<string, string> = {
    x: "x",
    instagram: "instagram",
    tiktok: "tiktok",
    linkedin: "linkedin",
    facebook: "facebook",
  };
  const base = map[key];
  if (!base) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-200">
        {(label || key).toUpperCase()}
      </span>
    );
  }

  const svg = `/brands/${base}.svg`;
  const png = `/brands/${base}.png`;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5">
      <img
        src={svg}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = png;
        }}
        alt={(label || key).toUpperCase()}
        width={14}
        height={14}
        style={{ display: "inline-block" }}
      />
      <span className="text-xs font-medium text-slate-200">{(label || key).toUpperCase()}</span>
    </span>
  );
}
// --------------------------------


type Source = { id: string; title: string; slug: string | null; summary: string | null; created_at: string };
type Derivative = { id: string; platform: string | null; kind: string | null; status: string | null; created_at: string; payload: any };

export default function ForgePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) bronnen
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_sources")
        .select("id,title,slug,summary,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (data?.length) {
        setSources(data);
        setSelectedId(data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  // 2) socials
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data } = await supabase
        .from("content_derivatives")
        .select("id,platform,kind,status,created_at,payload")
        .eq("source_id", selectedId)
        .in("status", ["draft","review","approved","scheduled","posted"])
        .order("platform", { ascending: true })
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      setDerivatives(data || []);
    })();
  }, [selectedId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-300">Golden Content Forge</h1>
        <p className="mt-1 text-slate-400">Preview van opgeslagen content</p>
        <Card className="mt-6">Laden…</Card>
      </main>
    );
  }

  const selected = sources.find(s => s.id === selectedId) || null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <h1 className="text-3xl font-extrabold tracking-tight text-amber-300">Golden Content Forge</h1>
      <p className="mt-1 text-slate-400">Preview van opgeslagen content</p>

      {/* selector */}
      <Card className="mt-6">
        <div className="flex flex-wrap gap-2">
          {sources.map(s => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.15)]"
                    : "border-slate-600/60 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                ].join(" ")}
                title={s.slug ?? s.id}
              >
                {s.title || s.slug || s.id.slice(0, 8)}
              </button>
            );
          })}
        </div>
      </Card>

      {/* bron */}
      {selected && (
        <Card className="mt-4">
          <h2 className="text-xl font-semibold text-slate-100">{selected.title}</h2>
          {selected.summary && <p className="mt-1 text-slate-400">{selected.summary}</p>}
          <p className="mt-2 text-xs text-slate-500">Bron-ID: {selected.id}</p>
        </Card>
      )}

      {/* socials met ECHTE logo's */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal-300">Social posts</h3>
        {derivatives.length === 0 ? (
          <Card>Nog geen socials voor deze bron.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {derivatives.map(d => {
              const payload = d.payload || {};
              const text = payload.caption ?? payload.script ?? "";
              const hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.join(" ") : "";
              const link = payload.cta_url ?? "";
              return (
                <Card key={d.id}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <LogoBadge platform={d.platform} />
                      <span className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                        {d.kind}
                      </span>
                    </div>
                    <span className="rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                      {d.status}
                    </span>
                  </div>

                  {text && (
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
                      {text}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hashtags && <span className="text-xs text-slate-400">{hashtags}</span>}
                    {link && (
                      <a
                        className="text-sm text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link}
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
