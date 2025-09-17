"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Source = { id: string; title: string; slug: string | null; summary: string | null; created_at: string; };
type Derivative = { id: string; platform: string | null; kind: string | null; status: string | null; created_at: string; payload: any; };

export default function ForgePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_sources")
        .select("id,title,slug,summary,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (data && data.length) {
        setSources(data);
        setSelectedId(data[0].id);
      }
      setLoading(false);
    })();
  }, []);

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
      if (data) setDerivatives(data as any);
    })();
  }, [selectedId]);

  return (
    <main>
      <h1>Golden Content Forge</h1>
      <p>Preview van opgeslagen content</p>

      {loading ? (
        <p>Laden…</p>
      ) : (
        <>
          {/* Bronnen-keuze (simpele knoppen, geen styling-klassen) */}
          <section>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                title={s.slug ?? s.id}
                style={{
                  padding: "8px 12px",
                  border: "1px solid currentColor",
                  marginRight: 8,
                  marginBottom: 8,
                  background: s.id === selectedId ? "currentColor" : "transparent",
                  color: s.id === selectedId ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                {s.title || s.slug || s.id.slice(0, 8)}
              </button>
            ))}
          </section>

          <hr />

          {/* Geselecteerde bron */}
          {(() => {
            const s = sources.find((x) => x.id === selectedId);
            if (!s) return null;
            return (
              <section>
                <h2>{s.title}</h2>
                {s.summary && <p>{s.summary}</p>}
                <small>Bron-ID: {s.id}</small>
              </section>
            );
          })()}

          <hr />

          {/* Social posts */}
          <section>
            <h3>Social posts</h3>
            {derivatives.length === 0 ? (
              <p>Nog geen socials voor deze bron.</p>
            ) : (
              derivatives.map((d) => {
                const payload = d.payload || {};
                const text = payload.caption ?? payload.script ?? "";
                const hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.join(" ") : "";
                const link = payload.cta_url ?? "";
                return (
                  <article key={d.id}>
                    <p>
                      <strong>{(d.platform ?? "generic").toUpperCase()}</strong> · {d.kind} · {d.status}
                    </p>
                    {text && <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>}
                    {hashtags && <p><small>{hashtags}</small></p>}
                    {link && (
                      <p>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {link}
                        </a>
                      </p>
                    )}
                    <hr />
                  </article>
                );
              })
            )}
          </section>
        </>
      )}
    </main>
  );
}
