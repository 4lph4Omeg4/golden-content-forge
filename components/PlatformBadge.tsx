const MAP: Record<string, { label: string; emoji: string }> = {
  x: { label: "X", emoji: "𝕏" },
  instagram: { label: "Instagram", emoji: "📸" },
  tiktok: { label: "TikTok", emoji: "🎵" },
  linkedin: { label: "LinkedIn", emoji: "💼" },
  facebook: { label: "Facebook", emoji: "📘" },
  generic: { label: "Generic", emoji: "✨" },
};

export default function PlatformBadge({ platform }: { platform?: string | null }) {
  const key = (platform ?? "generic").toLowerCase();
  const cfg = MAP[key] ?? MAP.generic;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-xs text-gray-700">
      <span>{cfg.emoji}</span>
      <span className="font-medium">{cfg.label}</span>
    </span>
  );
}
