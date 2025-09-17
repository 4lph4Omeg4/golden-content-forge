import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

type Body = {
  title: string;
  slug?: string;
  summary?: string;
  canonicalUrl?: string;
  variant?: "calm" | "spicy";
};

function utm(base: string | null, platform: string, slug: string | null) {
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=${platform}&utm_medium=social&utm_campaign=timeline_alchemy&utm_content=${slug ?? "content"}`;
}

export async function GET() {
  // snelle route-check
  return NextResponse.json({ ok: true, route: "create-source" });
}

export async function POST(req: Request) {
  try {
    // env pas HIER lezen (niet top-level) zodat we nette JSON error kunnen geven
    const SUPABASE_URL = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SRK = reqEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

    const b = (await req.json()) as Body;
    const title = (b.title ?? "").toString().trim();
    if (!title) return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });

    const slug = b.slug ? String(b.slug) : null;
    const summary = b.summary ? String(b.summary) : null;
    const canonicalUrl = b.canonicalUrl ? String(b.canonicalUrl) : null;
    const variant: "calm" | "spicy" = b.variant === "spicy" ? "spicy" : "calm";

    // 1) Source
    const { data: src, error: srcErr } = await supabase
      .from("content_sources")
      .insert([{ title, slug, summary, canonical_url: canonicalUrl }])
      .select("id, slug, canonical_url")
      .single();
    if (srcErr) throw srcErr;

    // 2) 5 socials
    const platforms = [
      { platform: "x", kind: "caption" as const },
      { platform: "instagram", kind: "caption" as const },
      { platform: "tiktok", kind: "tiktok_script" as const },
      { platform: "linkedin", kind: "caption" as const },
      { platform: "facebook", kind: "caption" as const },
    ];

    const baseText =
      variant === "spicy"
        ? "Als je ophoudt met duwen, beweegt alles makkelijker. Presence ≠ passief: het is zuivere kracht."
        : "Soms is niets doen het meest productieve. Eén adem. Presence.";

    const rows = platforms.map((p) => {
      const link = utm(src.canonical_url as any, p.platform, src.slug);
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
      return { source_id: src.id, platform: p.platform, kind: p.kind, status: "draft", payload };
    });

    const { error: derErr } = await supabase.from("content_derivatives").insert(rows);
    if (derErr) throw derErr;

    return NextResponse.json({ ok: true, sourceId: src.id });
  } catch (e: any) {
    // ALTIJD JSON teruggeven
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
