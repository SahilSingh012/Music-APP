import { db } from "@/db";
import { artists, songs } from "@/db/schema";
import { CATALOG_SIZE, LANGUAGE_TRACKS, previewAudioUrl } from "@/lib/catalog";
import { hashCode, slugify } from "@/lib/format";
import { sql } from "drizzle-orm";

let seeding: Promise<void> | null = null;

/** Idempotent: seeds the catalogue the first time the app touches the DB. */
export function ensureCatalog(): Promise<void> {
  if (!seeding) {
    seeding = seedCatalog().catch((error) => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

const BIO_BY_LANGUAGE: Record<string, string> = {
  punjabi:
    "Punjab to the world — bhangra energy, 808s and lyrics that hit the pind and the playlist at the same time.",
  haryanvi:
    "Dholak-driven desi fire from Haryana. Village stories, attitude and hooks the whole state sings along to.",
  hindi:
    "From Bollywood playback to bedroom indie — the soundtracks of a billion commutes.",
};

async function seedCatalog(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(songs)
    .where(sql`true`);

  // Re-runs whenever the shipped catalogue grows (e.g. the 2026 batch) so new
  // releases land in an existing database without wiping listener data.
  if (count >= CATALOG_SIZE) return;

  // An artist may release in more than one language (Guru Randhawa, B Praak).
  // We label the artist with the language they sing in most.
  const artistRows = new Map<string, { name: string; counts: Record<string, number> }>();

  (Object.keys(LANGUAGE_TRACKS) as (keyof typeof LANGUAGE_TRACKS)[]).forEach((language) => {
    for (const track of LANGUAGE_TRACKS[language]) {
      const artistName = track[1];
      const slug = slugify(artistName);
      const entry = artistRows.get(slug) ?? { name: artistName, counts: {} };
      entry.counts[language] = (entry.counts[language] ?? 0) + 1;
      artistRows.set(slug, entry);
    }
  });

  const dominantLanguage = (counts: Record<string, number>): string =>
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "hindi";

  await db
    .insert(artists)
    .values(
      Array.from(artistRows.entries()).map(([slug, artist]) => {
        const seed = hashCode(slug);
        const language = dominantLanguage(artist.counts);
        return {
          name: artist.name,
          slug,
          language,
          bio: BIO_BY_LANGUAGE[language],
          artworkSeed: String(seed % 360),
          listenersMonthly: 120_000 + (seed % 4_800_000),
        };
      }),
    )
    .onConflictDoNothing();

  const artistRecords = await db.select({ id: artists.id, slug: artists.slug }).from(artists);
  const idBySlug = new Map(artistRecords.map((a) => [a.slug, a.id]));

  const songValues: (typeof songs.$inferInsert)[] = [];

  (Object.keys(LANGUAGE_TRACKS) as (keyof typeof LANGUAGE_TRACKS)[]).forEach((language) => {
    for (const [title, artistName, album, year, durationSec, genre, moods] of LANGUAGE_TRACKS[
      language
    ]) {
      const artistId = idBySlug.get(slugify(artistName));
      if (artistId == null) continue;
      // Stable per-song hash: artwork + preview clip never shift when the
      // catalogue grows, and already-saved rows keep their identity.
      const seed = hashCode(`${title}-${artistName}`);
      const recencyBoost = year >= 2026 ? 3_600_000 : year >= 2024 ? 1_200_000 : 0;
      songValues.push({
        title,
        artistId,
        language,
        genre,
        album,
        releaseYear: year,
        durationSec,
        audioUrl: previewAudioUrl(seed),
        artworkSeed: String(seed % 360),
        moods,
        playCount: 40_000 + (seed % 9_600_000) + recencyBoost,
        likeCount: 900 + (seed % 480_000),
        isNew: year >= 2025,
        isTrending: year >= 2026 || seed % 100 < 30,
      });
    }
  });

  if (songValues.length > 0) {
    await db.insert(songs).values(songValues).onConflictDoNothing();
  }

  // Keep the "new" badge honest for rows seeded by an older catalogue version.
  await db
    .update(songs)
    .set({ isNew: sql`${songs.releaseYear} >= 2025` })
    .where(sql`${songs.isNew} is distinct from (${songs.releaseYear} >= 2025)`);
}
