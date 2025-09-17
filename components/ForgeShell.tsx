export default function ForgeShell(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <h1 className="text-2xl font-bold">{props.title}</h1>
          {props.subtitle && <p className="mt-1 text-sm text-gray-600">{props.subtitle}</p>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {props.children}
      </main>
      <footer className="border-t bg-white/70">
        <div className="mx-auto max-w-3xl px-4 py-4 text-xs text-gray-500">
          Golden Content Forge • preview
        </div>
      </footer>
    </div>
  );
}
