import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// simpele, veilige slugify
function slugify(input: string, max = 80) {
  const s = (input || "")
    .normalize("NFKD")                 // strip accents
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const trimmed = s.slice(0, max);
  return trimmed || `post-${Date.now().toString(36)}`;
}

type Body = {
  title: string;
  slug?: string;
  summary?: string;
  canonicalUrl?: string;
};

function utm(base: string | null, platform: string, slug: string | null) {
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=${platform}&utm_medium=social&utm_campaign=timeline_alchemy&utm_content=${slug ?? "content"}`;
}

function normalizeText(s: string | null | undefined, max = 500) {
  const clean = (s ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "create-source" });
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SRK = reqEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

    const b = (await req.json()) as Body;

    const title = normalizeText(b.title, 180);
    if (!title) return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });

    // 🔧 altijd een geldige slug maken
    const incomingSlug = (b.slug ?? "").trim();
    const safeSlug = incomingSlug || slugify(title);

    const summary = normalizeText(b.summary, 500) || null;
    const canonicalUrl = b.canonicalUrl?.trim() || null;

    // 1) Source
    const { data: src, error: srcErr } = await supabase
      .from("content_sources")
      .insert([{
        title,
        slug: safeSlug,               // <-- nooit null
        summary,
        canonical_url: canonicalUrl,
        json: {}                      // veilig i.c.m. NOT NULL
      }])
      .select("id, slug, canonical_url, summary, title")
      .single();
    if (srcErr) throw srcErr;

    // 2) 5 socials uit echte content
    const platforms = [
      { platform: "x",         kind: "caption" as const },
      { platform: "instagram", kind: "caption" as const },
      { platform: "tiktok",    kind: "tiktok_script" as const },
      { platform: "linkedin",  kind: "caption" as const },
      { platform: "facebook",  kind: "caption" as const },
    ];

    const rows = platforms.map(p => {
      const link = utm(src.canonical_url as any, p.platform, src.slug);
      if (p.kind === "tiktok_script") {
        return {
          source_id: src.id,
          platform: p.platform,
          kind: p.kind,
          status: "draft",
          payload: {
            script: `Hook: ${src.title}\n\n${src.summary || "Kern in 1–2 zinnen."}\n\nCTA: ${link ?? ""}`.trim(),
            overlay: [src.title].concat(src.summary ? [normalizeText(src.summary, 40)] : []),
            cta_url: link
          }
        };
      } else {
        const caption = `${src.summary || src.title}${link ? `\n→ Lees: ${link}` : ""}`.trim();
        return {
          source_id: src.id,
          platform: p.platform,
          kind: p.kind,
          status: "draft",
          payload: { caption, hashtags: [], cta_url: link }
        };
      }
    });

    const { error: derErr } = await supabase.from("content_derivatives").insert(rows);
    if (derErr) throw derErr;

    return NextResponse.json({ ok: true, sourceId: src.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
