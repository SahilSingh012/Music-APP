import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, likes, listeners, playEvents, playlistSongs, playlists, songs } from "@/db/schema";
import { ensureCatalog } from "@/server/seed";
import type { ArtistDTO, Language, PlaylistDTO, SongDTO, StatsDTO } from "@/lib/types";

function toSong(row: {
  id: number;
  title: string;
  language: string;
  genre: string;
  album: string | null;
  releaseYear: number;
  durationSec: number;
  audioUrl: string;
  videoId: string | null;
  altVideoIds: string | null;
  videoTitle: string | null;
  videoChannel: string | null;
  artworkSeed: string;
  moods: string;
  playCount: number;
  likeCount: number;
  isNew: boolean;
  isTrending: boolean;
  artistId: number;
  artistName: string;
  artistSlug: string;
}): SongDTO {
  return {
    id: row.id,
    title: row.title,
    artist: row.artistName,
    artistSlug: row.artistSlug,
    artistId: row.artistId,
    language: row.language as Language,
    genre: row.genre,
    album: row.album,
    releaseYear: row.releaseYear,
    durationSec: row.durationSec,
    audioUrl: row.audioUrl,
    videoId: row.videoId,
    altVideoIds: row.altVideoIds ? row.altVideoIds.split(",").filter(Boolean) : [],
    videoTitle: row.videoTitle,
    videoChannel: row.videoChannel,
    artworkSeed: Number(row.artworkSeed) || 0,
    moods: row.moods ? row.moods.split(",").map((m) => m.trim()).filter(Boolean) : [],
    playCount: row.playCount,
    likeCount: row.likeCount,
    isNew: row.isNew,
    isTrending: row.isTrending,
  };
}

const SONG_SELECT = {
  id: songs.id,
  title: songs.title,
  language: songs.language,
  genre: songs.genre,
  album: songs.album,
  releaseYear: songs.releaseYear,
  durationSec: songs.durationSec,
  audioUrl: songs.audioUrl,
  videoId: songs.videoId,
  altVideoIds: songs.altVideoIds,
  videoTitle: songs.videoTitle,
  videoChannel: songs.videoChannel,
  artworkSeed: songs.artworkSeed,
  moods: songs.moods,
  playCount: songs.playCount,
  likeCount: songs.likeCount,
  isNew: songs.isNew,
  isTrending: songs.isTrending,
  artistId: artists.id,
  artistName: artists.name,
  artistSlug: artists.slug,
} as const;

export async function listSongs(filter?: { language?: string; ids?: number[] }): Promise<SongDTO[]> {
  await ensureCatalog();
  const conditions = [];
  if (filter?.language) conditions.push(eq(songs.language, filter.language));
  if (filter?.ids?.length) conditions.push(inArray(songs.id, filter.ids));

  const rows = await db
    .select(SONG_SELECT)
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(conditions.length ? and(...conditions) : sql`true`)
    .orderBy(songs.id);

  return rows.map(toSong);
}

export async function getSong(id: number): Promise<SongDTO | null> {
  await ensureCatalog();
  const rows = await db
    .select(SONG_SELECT)
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(eq(songs.id, id))
    .limit(1);
  return rows.length ? toSong(rows[0]) : null;
}

export async function listArtists(): Promise<ArtistDTO[]> {
  await ensureCatalog();
  const rows = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      language: artists.language,
      bio: artists.bio,
      listenersMonthly: artists.listenersMonthly,
      artworkSeed: artists.artworkSeed,
      trackCount: sql<number>`count(${songs.id})::int`,
    })
    .from(artists)
    .leftJoin(songs, eq(songs.artistId, artists.id))
    .groupBy(artists.id)
    .orderBy(desc(sql`count(${songs.id})`));

  return rows.map((r) => ({ ...r, artworkSeed: Number(r.artworkSeed) || 0 }));
}

export async function getStats(): Promise<StatsDTO> {
  await ensureCatalog();
  const totals = await db
    .select({
      totalSongs: sql<number>`count(*)::int`,
      totalPlays: sql<number>`coalesce(sum(${songs.playCount}), 0)::bigint`,
    })
    .from(songs);
  const perLanguage = await db
    .select({ language: songs.language, count: sql<number>`count(*)::int` })
    .from(songs)
    .groupBy(songs.language);
  const artistCount = await db.select({ count: sql<number>`count(*)::int` }).from(artists);

  return {
    totalSongs: totals[0]?.totalSongs ?? 0,
    totalPlays: Number(totals[0]?.totalPlays ?? 0),
    totalArtists: artistCount[0]?.count ?? 0,
    byLanguage: Object.fromEntries(perLanguage.map((r) => [r.language, r.count])),
  };
}

/** ---- anonymous listener helpers (no login, just a device id) ---- */

export async function touchListener(deviceId: string): Promise<void> {
  if (!deviceId) return;
  await db
    .insert(listeners)
    .values({ deviceId })
    .onConflictDoUpdate({ target: listeners.deviceId, set: { lastSeenAt: new Date() } });
}

export async function getLikedSongIds(deviceId: string): Promise<number[]> {
  if (!deviceId) return [];
  await ensureCatalog();
  const rows = await db
    .select({ songId: likes.songId })
    .from(likes)
    .where(eq(likes.deviceId, deviceId));
  return rows.map((r) => r.songId);
}

export async function toggleLike(
  deviceId: string,
  songId: number,
): Promise<{ liked: boolean; likeCount: number }> {
  await ensureCatalog();
  await touchListener(deviceId);
  const existing = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.deviceId, deviceId), eq(likes.songId, songId)))
    .limit(1);

  if (existing.length) {
    await db.delete(likes).where(eq(likes.id, existing[0].id));
    await db
      .update(songs)
      .set({ likeCount: sql`greatest(0, ${songs.likeCount} - 1)` })
      .where(eq(songs.id, songId));
    const song = await db.select({ likeCount: songs.likeCount }).from(songs).where(eq(songs.id, songId));
    return { liked: false, likeCount: song[0]?.likeCount ?? 0 };
  }

  await db.insert(likes).values({ deviceId, songId }).onConflictDoNothing();
  await db
    .update(songs)
    .set({ likeCount: sql`${songs.likeCount} + 1` })
    .where(eq(songs.id, songId));
  const song = await db.select({ likeCount: songs.likeCount }).from(songs).where(eq(songs.id, songId));
  return { liked: true, likeCount: song[0]?.likeCount ?? 0 };
}

export async function recordPlay(
  deviceId: string,
  songId: number,
  seconds: number,
): Promise<void> {
  await ensureCatalog();
  await touchListener(deviceId);
  await db.insert(playEvents).values({ deviceId, songId, seconds: Math.max(0, Math.floor(seconds)) });
  await db
    .update(songs)
    .set({ playCount: sql`${songs.playCount} + 1` })
    .where(eq(songs.id, songId));
}

export async function getRecentlyPlayed(deviceId: string, limit = 12): Promise<SongDTO[]> {
  if (!deviceId) return [];
  await ensureCatalog();
  const rows = await db
    .selectDistinctOn([playEvents.songId], SONG_SELECT)
    .from(playEvents)
    .innerJoin(songs, eq(playEvents.songId, songs.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(eq(playEvents.deviceId, deviceId))
    .orderBy(playEvents.songId, desc(playEvents.playedAt))
    .limit(limit);

  return rows.map((r) => toSong(r));
}

/** ---- playlists ---- */

export async function listPlaylists(deviceId: string): Promise<PlaylistDTO[]> {
  if (!deviceId) return [];
  await ensureCatalog();
  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      artworkSeed: playlists.artworkSeed,
      isPublic: playlists.isPublic,
      createdAt: playlists.createdAt,
    })
    .from(playlists)
    .where(eq(playlists.deviceId, deviceId))
    .orderBy(desc(playlists.createdAt));

  if (!rows.length) return [];

  const items = await db
    .select({
      playlistId: playlistSongs.playlistId,
      songId: playlistSongs.songId,
      position: playlistSongs.position,
    })
    .from(playlistSongs)
    .where(inArray(playlistSongs.playlistId, rows.map((r) => r.id)))
    .orderBy(playlistSongs.position);

  const grouped = new Map<number, number[]>();
  for (const item of items) {
    const list = grouped.get(item.playlistId) ?? [];
    list.push(item.songId);
    grouped.set(item.playlistId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    artworkSeed: Number(r.artworkSeed) || 0,
    isPublic: r.isPublic,
    createdAt: r.createdAt.toISOString(),
    songIds: grouped.get(r.id) ?? [],
  }));
}

export async function createPlaylist(
  deviceId: string,
  name: string,
): Promise<PlaylistDTO | null> {
  await ensureCatalog();
  await touchListener(deviceId);
  const [row] = await db
    .insert(playlists)
    .values({
      deviceId,
      name: name.slice(0, 120) || "My Mix",
      artworkSeed: String(Math.floor(Math.random() * 360)),
    })
    .returning({ id: playlists.id, name: playlists.name, artworkSeed: playlists.artworkSeed });

  return {
    id: row.id,
    name: row.name,
    artworkSeed: Number(row.artworkSeed) || 0,
    isPublic: false,
    createdAt: new Date().toISOString(),
    songIds: [],
  };
}

export async function renamePlaylist(
  deviceId: string,
  playlistId: number,
  name: string,
): Promise<boolean> {
  const result = await db
    .update(playlists)
    .set({ name: name.slice(0, 120) })
    .where(and(eq(playlists.id, playlistId), eq(playlists.deviceId, deviceId)));
  return (result.rowCount ?? 0) > 0;
}

export async function deletePlaylist(deviceId: string, playlistId: number): Promise<boolean> {
  const result = await db
    .delete(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.deviceId, deviceId)));
  return (result.rowCount ?? 0) > 0;
}

export async function addSongToPlaylist(
  deviceId: string,
  playlistId: number,
  songId: number,
): Promise<boolean> {
  const owned = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.deviceId, deviceId)))
    .limit(1);
  if (!owned.length) return false;

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${playlistSongs.position}), -1)::int` })
    .from(playlistSongs)
    .where(eq(playlistSongs.playlistId, playlistId));

  await db
    .insert(playlistSongs)
    .values({ playlistId, songId, position: (maxRow?.max ?? -1) + 1 })
    .onConflictDoNothing();
  return true;
}

export async function removeSongFromPlaylist(
  deviceId: string,
  playlistId: number,
  songId: number,
): Promise<boolean> {
  const owned = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.deviceId, deviceId)))
    .limit(1);
  if (!owned.length) return false;
  await db
    .delete(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)));
  return true;
}

/** ---- real-song (YouTube) resolution cache ---- */

export interface SongLookup {
  id: number;
  title: string;
  artistName: string;
  durationSec: number;
  videoId: string | null;
  altVideoIds: string | null;
  videoTitle: string | null;
  videoChannel: string | null;
}

export async function getSongForResolve(id: number): Promise<SongLookup | null> {
  await ensureCatalog();
  const rows = await db
    .select({
      id: songs.id,
      title: songs.title,
      artistName: artists.name,
      durationSec: songs.durationSec,
      videoId: songs.videoId,
      altVideoIds: songs.altVideoIds,
      videoTitle: songs.videoTitle,
      videoChannel: songs.videoChannel,
    })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(eq(songs.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveResolution(
  id: number,
  data: {
    videoId: string;
    altVideoIds: string[];
    videoTitle?: string | null;
    videoChannel?: string | null;
    durationSec?: number;
  },
): Promise<void> {
  await db
    .update(songs)
    .set({
      videoId: data.videoId,
      altVideoIds: data.altVideoIds.filter(Boolean).join(","),
      videoTitle: data.videoTitle ? data.videoTitle.slice(0, 240) : null,
      videoChannel: data.videoChannel ? data.videoChannel.slice(0, 160) : null,
      durationSec:
        data.durationSec && data.durationSec > 30 ? Math.round(data.durationSec) : undefined,
      resolvedAt: new Date(),
    })
    .where(eq(songs.id, id));
}

export async function clearResolution(id: number): Promise<void> {
  await db
    .update(songs)
    .set({ videoId: null, altVideoIds: null, videoTitle: null, videoChannel: null, resolvedAt: null })
    .where(eq(songs.id, id));
}

export async function getTrending(limit = 10): Promise<SongDTO[]> {
  await ensureCatalog();
  const rows = await db
    .select(SONG_SELECT)
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .orderBy(desc(songs.playCount))
    .limit(limit);
  return rows.map(toSong);
}
