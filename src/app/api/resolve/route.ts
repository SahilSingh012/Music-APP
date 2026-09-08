import { NextRequest, NextResponse } from "next/server";
import { clearResolution, getSongForResolve, saveResolution } from "@/server/queries";
import { resolveSongVideo, youtubeSearchUrl, youtubeWatchUrl } from "@/server/youtube";

export const dynamic = "force-dynamic";
// YouTube scraping can be slow; give it room before the platform kills us.
export const maxDuration = 60;

interface ResolvedPayload {
  songId: number;
  videoId?: string;
  altVideoIds?: string[];
  videoTitle?: string | null;
  videoChannel?: string | null;
  durationSec?: number;
  watchUrl?: string;
  error?: string;
}

/** In-flight de-duplication so a burst of prefetches hits YouTube once per song. */
const inFlight = new Map<number, Promise<ResolvedPayload>>();

async function resolveOne(songId: number, force: boolean): Promise<ResolvedPayload> {
  const song = await getSongForResolve(songId);
  if (!song) return { songId, error: "Song not found" };

  // Serve the cached resolution unless the client explicitly asked to re-resolve
  // (which happens when an embed turns out to be blocked).
  if (song.videoId && !force) {
    return {
      songId,
      videoId: song.videoId,
      altVideoIds: song.altVideoIds ? song.altVideoIds.split(",").filter(Boolean) : [],
      videoTitle: song.videoTitle,
      videoChannel: song.videoChannel,
      durationSec: song.durationSec,
      watchUrl: youtubeWatchUrl(song.videoId),
    };
  }

  if (force) await clearResolution(songId);

  const existing = inFlight.get(songId);
  if (existing) return existing;

  const task = (async (): Promise<ResolvedPayload> => {
    const resolution = await resolveSongVideo({
      title: song.title,
      artist: song.artistName,
      durationSec: song.durationSec,
    });

    const chosen = resolution.chosen;
    if (!chosen) {
      return {
        songId,
        error: "Could not find a full-length stream for this track yet.",
        watchUrl: youtubeSearchUrl({ title: song.title, artist: song.artistName }),
      };
    }

    const altVideoIds = resolution.candidates
      .map((candidate) => candidate.videoId)
      .filter((id) => id !== chosen.videoId)
      .slice(0, 5);

    await saveResolution(songId, {
      videoId: chosen.videoId,
      altVideoIds,
      videoTitle: chosen.title,
      videoChannel: chosen.channel,
      durationSec: chosen.durationSec,
    }).catch(() => undefined);

    return {
      songId,
      videoId: chosen.videoId,
      altVideoIds,
      videoTitle: chosen.title,
      videoChannel: chosen.channel,
      durationSec: chosen.durationSec > 30 ? chosen.durationSec : song.durationSec,
      watchUrl: youtubeWatchUrl(chosen.videoId),
    };
  })().finally(() => {
    inFlight.delete(songId);
  });

  inFlight.set(songId, task);
  return task;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { songId?: unknown; songIds?: unknown; force?: unknown }
    | null;

  const force = body?.force === true;

  // Batch mode — used by the player to warm up the next few queue entries.
  if (Array.isArray(body?.songIds)) {
    const ids = body.songIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 5);

    const results = await Promise.all(
      ids.map((id) =>
        resolveOne(id, false).catch(
          (): ResolvedPayload => ({ songId: id, error: "Resolution failed" }),
        ),
      ),
    );
    return NextResponse.json({ results });
  }

  const songId = Number(body?.songId);
  if (!Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await resolveOne(songId, force));
  } catch {
    return NextResponse.json(
      { songId, error: "Could not reach YouTube. Check the connection and retry." },
      { status: 502 },
    );
  }
}
