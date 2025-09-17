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
    <div
      className={[
        "rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5",
        "overflow-hidden",
        className,
      ].join(" ")}
    >
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
        onError={(e) => ((e.currentTarget as HTMLImageElement).src = png)}
        alt={(label || key).toUpperCase()}
        width={16}
        height={16}
        style={{ display: "inline-block", width: 16, height: 16, objectFit: "contain" }}
      />
      <span className="text-xs font-medium text-slate-200">{(label || key).toUpperCase()}</span>
    </span>
  );
}

// Copy-knop (Clipboard API + fallback)
function CopyBtn({ text }: { text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      alert("Gekopieerd ✅");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Gekopieerd ✅");
    }
  }
  return (
    <button
      onClick={copy}
      className="rounded-lg border border-slate-600/70 bg-slate-800/60 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
      title="Copy caption"
      type="button"
    >
      Copy
    </button>
  );
}

// Kleine actieknop
function ActionBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      className={[
        "rounded-lg border px-2 py-1 text-xs",
        disabled
          ? "border-slate-700/60 bg-slate-800/40 text-slate-500 cursor-not-allowed"
          : "border-slate-600/70 bg-slate-800/60 text-slate-200 hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
// -------------------------------------------------------------------

type Source = { id: string; title: string; slug: string | null; summary: string | null; created_at: string };
type Derivative = { id: string; platform: string | null; kind: string | null; status: string | null; created_at: string; payload: any };

export default function ForgePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // bronnen ophalen
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("content_sources")
        .select("id,title,slug,summary,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!mounted) return;
      if (data?.length) {
        setSources(data);
        setSelectedId((prev) => prev ?? data[0].id);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // socials voor geselecteerde bron
  useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("content_derivatives")
        .select("id,platform,kind,status,created_at,payload")
        .eq("source_id", selectedId)
        .in("status", ["draft", "review", "approved", "scheduled", "posted"])
        .order("platform", { ascending: true })
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      if (mounted) setDerivatives(data || []);
    })();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  // status updaten (approve / archive)
  async function setStatus(id: string, status: "approved" | "archived") {
    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from("content_derivatives")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      // Optimistische UI
      setDerivatives((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    } catch (e) {
      alert("Kon status niet updaten 😕");
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-300">Golden Content Forge</h1>
        <p className="mt-1 text-slate-400">Preview van opgeslagen content</p>
        <Card className="mt-6">Laden…</Card>
      </main>
    );
  }

  const selected = sources.find((s) => s.id === selectedId) || null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <h1 className="text-3xl font-extrabold tracking-tight text-amber-300">Golden Content Forge</h1>
      <p className="mt-1 text-slate-400">Preview van opgeslagen content</p>

      {/* Bronselector */}
      <Card className="mt-6">
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-sm",
                  active ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-slate-600/60 bg-slate-800/60 text-slate-200",
                ].join(" ")}
                title={s.slug ?? s.id}
              >
                {s.title || s.slug || s.id.slice(0, 8)}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Geselecteerde bron */}
      {selected && (
        <Card className="mt-4">
          <h2 className="text-xl font-semibold text-slate-100">{selected.title}</h2>
          {selected.summary && <p className="mt-1 text-slate-400">{selected.summary}</p>}
          <p className="mt-2 text-xs text-slate-500">Bron-ID: {selected.id}</p>
        </Card>
      )}

      {/* Social posts */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal-300">Social posts</h3>
        {derivatives.length === 0 ? (
          <Card>Nog geen socials voor deze bron.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {derivatives.map((d) => {
              const payload = d.payload || {};
              const text = payload.caption ?? payload.script ?? "";
              const hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.join(" ") : "";
              const link = payload.cta_url ?? "";
              const busy = updatingId === d.id;

              return (
                <Card key={d.id} className="min-h-[180px]">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <LogoBadge platform={d.platform} />
                      <span className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                        {d.kind}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyBtn text={text} />
                      <ActionBtn onClick={() => setStatus(d.id, "approved")} disabled={busy} title="Markeer als approved">
                        Approve
                      </ActionBtn>
                      <ActionBtn onClick={() => setStatus(d.id, "archived")} disabled={busy} title="Archiveer deze post">
                        Archive
                      </ActionBtn>
                      <span className="rounded-full border border-slate-600/70 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                        {busy ? "..." : d.status}
                      </span>
                    </div>
                  </div>

                  {text && (
                    <p
                      className="mt-3 text-[15px] leading-relaxed text-slate-200"
                      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                      {text}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hashtags && <span className="text-xs text-slate-400" style={{ overflowWrap: "anywhere" }}>{hashtags}</span>}
                    {link && (
                      <a
                        className="text-sm text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ wordBreak: "break-all" }}
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
