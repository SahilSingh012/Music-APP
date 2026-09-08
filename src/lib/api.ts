export function readDeviceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length >= 8 && id.length <= 64 ? id : null;
}

export function makeDeviceId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2).repeat(3);
  return `anon-${random.slice(0, 28)}`;
}

import type { OnlineTrackDTO, SongDTO } from "@/lib/types";

/** Deterministic small hash used to derive artwork gradients for online tracks. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) h = (h * 33) ^ input.charCodeAt(i);
  return Math.abs(h);
}

/**
 * Turn a live online-search result into a playable SongDTO.
 * Online songs use a negative id (derived from the videoId) so they never
 * collide with catalogue rows and the player skips DB resolution.
 */
export function onlineTrackToSong(track: OnlineTrackDTO): SongDTO {
  const seed = hashString(track.videoId);
  return {
    id: -Math.abs(seed) - 1,
    title: track.title,
    artist: track.artist || "Online result",
    artistSlug: "",
    artistId: -1,
    language: "hindi",
    genre: "online",
    album: null,
    releaseYear: new Date().getFullYear(),
    durationSec: track.durationSec > 0 ? track.durationSec : 210,
    audioUrl: "",
    videoId: track.videoId,
    altVideoIds: [],
    videoTitle: track.title,
    videoChannel: track.artist,
    artworkSeed: seed % 360,
    moods: ["online"],
    playCount: track.views,
    likeCount: 0,
    isNew: false,
    isTrending: false,
  };
}
