# Golden Content Forge (UI)

“Paint a picture” → AI smeedt er **title + summary + blog** van en schrijft het in jouw DB.
Frontend-only (Next.js + Tailwind). Schrijven gaat via jouw n8n webhook; lezen (preview) via Supabase REST met **anon** key.

## Stack
- Next.js 14 (App Router, TypeScript, Turbopack)
- TailwindCSS
- n8n webhook (`/paint`)
- Supabase (REST, RLS-read voor anon)

---

## Snel starten (GitHub Codespaces)

1. **Codespace openen**  
   Repo → **Code** → **Codespaces** → *Create codespace on main*.

2. **Env zetten**  
   Maak `.env.local` in de root (niet committen):