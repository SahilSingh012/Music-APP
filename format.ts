export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatCount(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Deterministic 32-bit hash so artwork/gradients stay stable across renders. */
export function hashCode(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const LANGUAGE_LABEL: Record<string, string> = {
  punjabi: "Punjabi",
  haryanvi: "Haryanvi",
  hindi: "Hindi",
};

/** Each language owns a colour story used for artwork + accents. */
export const LANGUAGE_THEME: Record<
  string,
  { from: string; via: string; to: string; ring: string; text: string; chip: string }
> = {
  punjabi: {
    from: "#ff7a18",
    via: "#e0115f",
    to: "#5b1a8c",
    ring: "rgba(255,122,24,0.55)",
    text: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-400/30",
  },
  haryanvi: {
    from: "#f5d020",
    via: "#2fae5f",
    to: "#0b5d3b",
    ring: "rgba(47,174,95,0.55)",
    text: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30",
  },
  hindi: {
    from: "#7f5bff",
    via: "#e0457b",
    to: "#221a5c",
    ring: "rgba(127,91,255,0.55)",
    text: "text-violet-300",
    chip: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30",
  },
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
