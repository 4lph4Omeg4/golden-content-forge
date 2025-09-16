// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golden Content Forge",
  description: "Forge golden content from your raw ideas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-zinc-950 via-amber-950 to-black text-slate-100 antialiased selection:bg-amber-500/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {children}
        </div>
      </body>
    </html>
  );
}