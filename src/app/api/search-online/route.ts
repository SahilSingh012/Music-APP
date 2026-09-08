import { NextRequest, NextResponse } from "next/server";
import { searchOnline } from "@/server/youtube";
import type { OnlineTrackDTO } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Small in-memory cache so repeated/debounced queries don't re-hit YouTube. */
const cache = new Map<string, { at: number; tracks: OnlineTrackDTO[] }>();
const TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (!query) return NextResponse.json({ tracks: [] });

  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ tracks: hit.tracks, cached: true });
  }

  try {
    const tracks = await searchOnline(query, 18);
    cache.set(key, { at: Date.now(), tracks });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json(
      { tracks: [], error: "Online search is unavailable right now." },
      { status: 502 },
    );
  }
}
