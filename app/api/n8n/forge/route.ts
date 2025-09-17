import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok:false, error:"Missing N8N_WEBHOOK_URL" }, { status: 500 });
    const body = await req.text(); // raw doorzetten
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message || "proxy error" }, { status: 500 });
  }
}
