"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Source = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  created_at: string;
};

type Derivative = {
  id: string;
  platform: string | null;
  kind: string | null;
  status: string | null;
  created_at: string;
  payload: any; // {caption?, script?, hashtags?, cta_url?}
};

export default function ForgeViewer() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) Haal een lijst met bronnen op (laatste eerst)
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

  // 2) Als er eentje geselecteerd is: haal de bijbehorende socials
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data, error } = await supabase
        .from("content_derivatives")
        .select("id,platform,kind,status,created_at,payload")
        .eq("source_id", selectedId)
        .in("status", ["draft", "review", "approved", "scheduled", "posted"]) // geen 'archived' rommel
        .order("platform", { ascending: true })
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && data) setDerivatives(data as any);
    })();
  }, [selectedId]);

  if (loading) return <div className="p-6">Loading…</div>;

  const selected = sources.find(s => s.id === selectedId) || null;

  return (
    <div className="p-6 space-y-8">
      {/* Bronnen lijst */}
      <div>
        <h1 className="text-xl font-bold">Golden Content Forge — Viewer</h1>
        {sources.length === 0 ? (
          <p className="text-gray-600 mt-2">Geen bronnen gevonden.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`px-3 py-1 rounded border text-sm ${
                  s.id === selectedId ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                }`}
                title={s.id}
              >
                {s.title || s.slug || s.id.slice(0,8)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geselecteerde bron */}
      {selected && (
        <div>
          <h2 className="text-lg font-semibold">{selected.title}</h2>
          {selected.summary && <p className="text-gray-600 mt-1">{selected.summary}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Bron-ID: {selected.id}
          </p>
        </div>
      )}

      {/* Socials lijst */}
      <div className="space-y-4">
        <h3 className="font-semibold">Social posts (niet-gearchiveerd)</h3>
        {derivatives.length === 0 ? (
          <p className="text-gray-600">Nog geen socials voor deze bron.</p>
        ) : (
          derivatives.map(d => {
            const text = d.payload?.caption ?? d.payload?.script ?? "";
            const hashtags = Array.isArray(d.payload?.hashtags) ? d.payload.hashtags.join(" ") : "";
            const link = d.payload?.cta_url ?? "";
            return (
              <div key={d.id} className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="uppercase font-medium">{d.platform}</span>
                  <span>·</span>
                  <span>{d.kind}</span>
                  <span>·</span>
                  <span className="rounded-full px-2 py-0.5 border">{d.status}</span>
                </div>
                {text && <p className="mt-2 whitespace-pre-line">{text}</p>}
                {hashtags && <p className="mt-1 text-sm text-gray-500">{hashtags}</p>}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-blue-600 hover:underline break-all"
                  >
                    🔗 {link}
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
