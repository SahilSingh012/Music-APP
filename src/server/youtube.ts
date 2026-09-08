/**
 * Server-side resolver that turns a catalogue entry (title + artist) into the
 * real, complete song on YouTube — official audio or music video, no API key
 * and no login required.
 *
 * We keep several ranked candidates per song so the player can fall back when a
 * video is not embeddable in a third-party page.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface VideoCandidate {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  views: number;
}

const NEGATIVE =
  /(behind the scenes|bts|reaction|reacts|review|teaser|trailer|making of|karaoke|instrumental(?!.*official)|cover by|tribute|whatsapp status|status video|slowed|reverb|lo-?fi|dj ?remix|mashup|medley|full movie|episode|news|podcast|unboxing|tutorial)/i;

const POSITIVE = /(official audio|official video|official music video|music video|full song|full video|lyric video|song)/i;

function parseLength(value?: string): number {
  if (!value) return 0;
  const parts = value.split(":").map((p) => Number(p.trim()));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function parseViews(value?: string): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]|\|.*$/g, " ")
    .replace(/[^a-z0-9\u0900-\u097F\u0A00-\u0A7F ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface RawNode {
  videoRenderer?: {
    videoId?: string;
    title?: { runs?: { text?: string }[] };
    lengthText?: { simpleText?: string };
    ownerText?: { runs?: { text?: string }[] };
    longBylineText?: { runs?: { text?: string }[] };
    viewCountText?: { simpleText?: string; runs?: { text?: string }[] };
  };
}

function collectRenderers(node: unknown, bucket: VideoCandidate[], seen: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const renderer = (node as RawNode).videoRenderer;
  if (renderer?.videoId && !seen.has(renderer.videoId)) {
    seen.add(renderer.videoId);
    const views =
      renderer.viewCountText?.simpleText ??
      renderer.viewCountText?.runs?.map((r) => r.text ?? "").join("") ??
      "";
    bucket.push({
      videoId: renderer.videoId,
      title: renderer.title?.runs?.map((r) => r.text ?? "").join("") ?? "",
      channel:
        renderer.ownerText?.runs?.[0]?.text ?? renderer.longBylineText?.runs?.[0]?.text ?? "",
      durationSec: parseLength(renderer.lengthText?.simpleText),
      views: parseViews(views),
    });
  }
  for (const key of Object.keys(node as Record<string, unknown>)) {
    const child = (node as Record<string, unknown>)[key];
    if (Array.isArray(child)) child.forEach((item) => collectRenderers(item, bucket, seen));
    else if (child && typeof child === "object") collectRenderers(child, bucket, seen);
  }
}

function extractCandidates(html: string): VideoCandidate[] {
  const bucket: VideoCandidate[] = [];
  const seen = new Set<string>();

  const dataMatch =
    html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/) ??
    html.match(/ytInitialData"?\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      collectRenderers(JSON.parse(dataMatch[1]), bucket, seen);
    } catch {
      /* fall through to the regex path */
    }
  }

  if (bucket.length < 4) {
    const loose = /"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"[\s\S]{0,2400}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
    let match: RegExpExecArray | null;
    while ((match = loose.exec(html)) !== null) {
      const videoId = match[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      bucket.push({
        videoId,
        title: match[2].replace(/\\u([0-9a-fA-F]{4})/g, (_s, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        ),
        channel: "",
        durationSec: 0,
        views: 0,
      });
    }
  }

  return bucket;
}

async function fetchSearch(query: string, timeoutMs = 12_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`,
      {
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          "accept-language": "en-US,en;q=0.9,hi;q=0.8,pa;q=0.7",
          accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      },
    );
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export function rankCandidates(
  candidates: VideoCandidate[],
  song: { title: string; artist: string; durationSec: number },
): VideoCandidate[] {
  const wantedTitle = normalise(song.title);
  const wantedArtist = normalise(song.artist);
  const artistTokens = wantedArtist.split(" ").filter((token) => token.length > 2);

  return candidates
    .map((candidate) => {
      const title = normalise(candidate.title);
      const channel = normalise(candidate.channel);
      let score = 0;

      if (title.startsWith(wantedTitle)) score += 70;
      else if (title.includes(wantedTitle)) score += 55;
      else {
        const words = wantedTitle.split(" ").filter((w) => w.length > 2);
        const hits = words.filter((w) => title.includes(w)).length;
        score += words.length ? Math.round((hits / words.length) * 35) : 0;
      }

      if (channel && wantedArtist && (channel.includes(wantedArtist) || wantedArtist.includes(channel)))
        score += 60;
      else if (artistTokens.some((token) => channel.includes(token) || title.includes(token))) score += 28;

      if (POSITIVE.test(candidate.title)) score += 18;
      if (NEGATIVE.test(candidate.title)) score -= 85;

      if (candidate.durationSec > 0 && song.durationSec > 0) {
        const delta = Math.abs(candidate.durationSec - song.durationSec);
        score -= Math.min(28, Math.round(delta / 4));
      }
      if (candidate.durationSec > 0 && candidate.durationSec < 45) score -= 40; // clips / shorts
      if (candidate.durationSec > 1500) score -= 25; // full albums / movies

      if (candidate.views > 0) score += Math.min(22, Math.round(Math.log10(candidate.views) * 2.6));

      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || b.candidate.views - a.candidate.views)
    .map((entry) => entry.candidate);
}

export interface Resolution {
  candidates: VideoCandidate[];
  chosen: VideoCandidate | null;
  query: string;
}

export async function resolveSongVideo(
  song: { title: string; artist: string; durationSec: number },
  attempts = 2,
): Promise<Resolution> {
  const queries = [
    `${song.artist} ${song.title} official audio`,
    `${song.title} ${song.artist} full song`,
    `${song.title} ${song.artist}`,
  ];

  let lastQuery = queries[0];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const query = queries[Math.min(attempt, queries.length - 1)];
    lastQuery = query;
    try {
      const html = await fetchSearch(query);
      const candidates = rankCandidates(extractCandidates(html), song);
      if (candidates.length) return { candidates: candidates.slice(0, 6), chosen: candidates[0], query };
    } catch {
      /* retry with the next query shape */
    }
  }

  return { candidates: [], chosen: null, query: lastQuery };
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeSearchUrl(song: { title: string; artist: string }): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${song.artist} ${song.title} song`,
  )}`;
}

/* ------------------------------------------------------------------------- */
/* Online search — when a query has no match in the catalogue, we search      */
/* YouTube live and return real playable songs so the user can hear them      */
/* anyway. No login, no API key.                                              */
/* ------------------------------------------------------------------------- */

export interface OnlineTrack {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  views: number;
}

/** Rank raw search results for a free-text query (song discovery, not exact match). */
function rankOnline(candidates: VideoCandidate[], query: string): VideoCandidate[] {
  const wanted = normalise(query);
  const words = wanted.split(" ").filter((w) => w.length > 1);

  return candidates
    .map((candidate) => {
      const title = normalise(candidate.title);
      let score = 0;

      if (title.includes(wanted)) score += 45;
      const hits = words.filter((w) => title.includes(w)).length;
      score += words.length ? Math.round((hits / words.length) * 40) : 0;

      if (POSITIVE.test(candidate.title)) score += 16;
      if (NEGATIVE.test(candidate.title)) score -= 70;

      if (candidate.durationSec > 0 && candidate.durationSec < 60) score -= 45; // shorts / clips
      if (candidate.durationSec > 1800) score -= 30; // albums / movies / mixes

      if (candidate.views > 0) score += Math.min(26, Math.round(Math.log10(candidate.views) * 3));

      return { candidate, score };
    })
    .filter((entry) => entry.score > -30)
    .sort((a, b) => b.score - a.score || b.candidate.views - a.candidate.views)
    .map((entry) => entry.candidate);
}

/** Split a "Artist - Title (Official...)" style YouTube title into song + artist. */
function splitTitle(raw: string, channel: string): { title: string; artist: string } {
  let cleaned = raw
    .replace(/\((?:official|full|audio|video|music|lyric|lyrical|hd|4k)[^)]*\)/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(official|full|audio|video|music video|lyric video|lyrics|hd|4k)\b/gi, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim();

  // Prefer the "Artist - Title" pattern.
  const dash = cleaned.split(/\s*[-–:]\s*/);
  if (dash.length >= 2 && dash[0].length <= 40) {
    return {
      artist: dash[0].replace(/\s*\|.*$/, "").trim() || channel || "Unknown",
      title: dash.slice(1).join(" - ").replace(/\s*\|.*$/, "").trim() || cleaned,
    };
  }

  cleaned = cleaned.replace(/\s*\|.*$/, "").trim();
  return { title: cleaned || raw, artist: channel || "Unknown" };
}

export async function searchOnline(query: string, limit = 18): Promise<OnlineTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queries = [`${trimmed} song`, trimmed];
  let candidates: VideoCandidate[] = [];

  for (const q of queries) {
    try {
      const html = await fetchSearch(q);
      candidates = rankOnline(extractCandidates(html), trimmed);
      if (candidates.length) break;
    } catch {
      /* try the next query shape */
    }
  }

  const seen = new Set<string>();
  const tracks: OnlineTrack[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.videoId)) continue;
    seen.add(candidate.videoId);
    const { title, artist } = splitTitle(candidate.title, candidate.channel);
    tracks.push({
      videoId: candidate.videoId,
      title,
      artist,
      durationSec: candidate.durationSec || 0,
      views: candidate.views,
    });
    if (tracks.length >= limit) break;
  }

  return tracks;
}
