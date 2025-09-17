"use client";

import GoldenContentForgeUI from "../components/GoldenContentForgeUI";

async function createForgeFromBlog(opts: {
  title: string;
  slug?: string;
  summary?: string;
  canonicalUrl?: string;
}) {
  const res = await fetch("/api/forge/create-source", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("application/json") ? await res.json() : null;
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Forge create failed (${res.status})`);
  return json.sourceId as string;
}

export default function Page() {
  return (
    <GoldenContentForgeUI
      onBlogSaved={async (blog: { title: string; slug?: string; summary?: string; canonical_url?: string }) => {
        try {
          await createForgeFromBlog({
            title: blog.title,
            slug: blog.slug,
            summary: blog.summary,
            canonicalUrl:
              blog.canonical_url ||
              (blog.slug ? `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/blog/${blog.slug}` : undefined),
          });
          // optioneel: console.log("Forge source created");
        } catch (e) {
          console.error("Forge create failed", e);
        }
      }}
    />
  );
}
