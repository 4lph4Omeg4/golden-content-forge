import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!; // SERVER-ONLY
const supabase = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

type Body = {
  title: string;
  slug?: string;
  summary?: string;
  canonicalUrl?: string;
  variant?: "calm" | "spicy";
};

function utm(base: string | undefined, platform: string, slug: string | undefined) {
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=${platform}&utm_medium=social&utm_campaign=timeline_alchemy&utm_content=${slug ?? "content"}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { title, slug, summary, canonicalUrl, variant = "calm" } = body;
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    // 1) Source aanmaken
    const { data: src, error: srcErr } = await supabase
      .from("content_sources")
      .insert([{ title, slug: slug ?? null, summary: summary ?? null, canonical_url: canonicalUrl ?? null }])
      .select("id, slug, canonical_url")
      .single();
    if (srcErr) throw srcErr;

    const platforms = [
      { platform: "x", kind: "caption" as const },
      { platform: "instagram", kind: "caption" as const },
      { platform: "tiktok", kind: "tiktok_script" as const },
      { platform: "linkedin", kind: "caption" as const },
      { platform: "facebook", kind: "caption" as const },
    ];

    // 2) 5 socials genereren met simpele payload + UTM
    const rows = platforms.map((p) => {
      const link = utm(src.canonical_url as any, p.platform, src.slug);
      const baseText =
        variant === "spicy"
          ? "Als je ophoudt met duwen, beweegt alles makkelijker. Presence ≠ passief: het is zuivere kracht."
          : "Soms is niets doen het meest productieve. Eén adem. Presence.";
      const payload: any =
        p.kind === "tiktok_script"
          ? {
              variant,
              overlay: ["Fixen is de blokkade.", "Presence = power."],
              script: 'Hook: “Wat als fixen je gevangen houdt?” | 1 paradox | 1 stap: 1 adem + 5s stilte | CTA',
              cta_url: link,
            }
          : {
              variant,
              caption: `${baseText}${link ? `\n→ Lees: ${link}` : ""}`,
              hashtags: ["#presence", "#nonduality", "#inneralchemy"],
              cta_url: link,
            };
      return {
        source_id: src.id,
        platform: p.platform,
        kind: p.kind,
        status: "draft",
        payload,
      };
    });

    const { error: derErr } = await supabase.from("content_derivatives").insert(rows);
    if (derErr) throw derErr;

    return NextResponse.json({ ok: true, sourceId: src.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
