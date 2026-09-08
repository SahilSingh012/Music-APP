export type Language = "punjabi" | "haryanvi" | "hindi";

export interface ArtistDTO {
  id: number;
  name: string;
  slug: string;
  language: string;
  bio: string | null;
  listenersMonthly: number;
  artworkSeed: number;
  trackCount: number;
}

export interface SongDTO {
  id: number;
  title: string;
  artist: string;
  artistSlug: string;
  artistId: number;
  language: Language;
  genre: string;
  album: string | null;
  releaseYear: number;
  durationSec: number;
  audioUrl: string;
  videoId: string | null;
  altVideoIds: string[];
  videoTitle: string | null;
  videoChannel: string | null;
  artworkSeed: number;
  moods: string[];
  playCount: number;
  likeCount: number;
  isNew: boolean;
  isTrending: boolean;
}

export interface PlaylistDTO {
  id: number;
  name: string;
  artworkSeed: number;
  isPublic: boolean;
  songIds: number[];
  createdAt: string;
}

/** A song found via live online search (not in the local catalogue). */
export interface OnlineTrackDTO {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  views: number;
}

export interface StatsDTO {
  totalSongs: number;
  totalArtists: number;
  byLanguage: Record<string, number>;
  totalPlays: number;
}
