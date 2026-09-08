import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export type LanguageCode = "punjabi" | "haryanvi" | "hindi";

/**
 * Anonymous listeners. Nobody signs up, nobody signs in — the browser keeps a
 * device id in localStorage and we track taste against that id.
 */
export const listeners = pgTable(
  "listeners",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    handle: varchar("handle", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("listeners_device_id_key").on(t.deviceId)],
);

export const artists = pgTable(
  "artists",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    language: varchar("language", { length: 24 }).notNull(),
    bio: text("bio"),
    listenersMonthly: integer("listeners_monthly").notNull().default(0),
    artworkSeed: varchar("artwork_seed", { length: 40 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("artists_slug_key").on(t.slug)],
);

export const songs = pgTable(
  "songs",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    artistId: integer("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 24 }).notNull(),
    genre: varchar("genre", { length: 60 }).notNull().default("pop"),
    album: varchar("album", { length: 200 }),
    releaseYear: integer("release_year").notNull().default(2024),
    durationSec: integer("duration_sec").notNull().default(210),
    audioUrl: text("audio_url").notNull(),
    /** Real, complete song: resolved YouTube video (official audio / music video). */
    videoId: varchar("video_id", { length: 32 }),
    altVideoIds: text("alt_video_ids"),
    videoTitle: varchar("video_title", { length: 240 }),
    videoChannel: varchar("video_channel", { length: 160 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    artworkSeed: varchar("artwork_seed", { length: 40 }).notNull().default("0"),
    moods: text("moods").notNull().default(""),
    playCount: integer("play_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    isNew: boolean("is_new").notNull().default(false),
    isTrending: boolean("is_trending").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("songs_language_idx").on(t.language),
    index("songs_artist_idx").on(t.artistId),
    index("songs_release_year_idx").on(t.releaseYear),
    uniqueIndex("songs_title_artist_key").on(t.title, t.artistId),
  ],
);

export const likes = pgTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    songId: integer("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("likes_device_song_key").on(t.deviceId, t.songId)],
);

export const playEvents = pgTable(
  "play_events",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    songId: integer("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    seconds: integer("seconds").notNull().default(0),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("play_events_device_idx").on(t.deviceId), index("play_events_song_idx").on(t.songId)],
);

export const playlists = pgTable(
  "playlists",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    artworkSeed: varchar("artwork_seed", { length: 40 }).notNull().default("0"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("playlists_device_idx").on(t.deviceId)],
);

export const playlistSongs = pgTable(
  "playlist_songs",
  {
    id: serial("id").primaryKey(),
    playlistId: integer("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    songId: integer("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("playlist_songs_unique_key").on(t.playlistId, t.songId)],
);

export type SongRow = typeof songs.$inferSelect;
export type ArtistRow = typeof artists.$inferSelect;
export type PlaylistRow = typeof playlists.$inferSelect;
