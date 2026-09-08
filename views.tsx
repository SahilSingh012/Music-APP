"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OnlineTrackDTO, SongDTO } from "@/lib/types";
import { CURATED_PLAYLISTS, LANGUAGE_TRACKS, NEWEST_RELEASE_YEAR } from "@/lib/catalog";
import { formatCount, formatTime, hashCode, LANGUAGE_LABEL, LANGUAGE_THEME } from "@/lib/format";
import { usePlayer, type Route } from "@/components/player-context";
import { Artwork, Equalizer, Icon, LanguageChip, SectionHead } from "@/components/ui";
import { CardRail, LikeButton, PlaylistMenu, TrackCard, TrackTable } from "@/components/track-list";

/* ------------------------------------------------------------------ shared */

function PlaylistTile({
  name,
  description,
  songs,
  accent,
}: {
  name: string;
  description: string;
  songs: SongDTO[];
  accent: { from: string; via: string; to: string };
}) {
  const { playQueue } = usePlayer();
  if (!songs.length) return null;
  return (
    <button
      type="button"
      onClick={() => playQueue(songs, 0)}
      className="group relative w-[230px] shrink-0 overflow-hidden rounded-3xl border border-white/10 p-4 text-left transition hover:border-white/25"
      style={{ backgroundImage: `linear-gradient(150deg, ${accent.from}22, ${accent.via}18 45%, ${accent.to}33)` }}
    >
      <div className="flex -space-x-4">
        {songs.slice(0, 3).map((song, i) => (
          <Artwork
            key={song.id}
            seed={song.artworkSeed}
            language={song.language}
            title={song.title}
            size={62}
            rounded="rounded-xl"
            className={`ring-2 ring-black/40 transition duration-300 ${
              i === 1 ? "-rotate-6 group-hover:-rotate-12" : i === 2 ? "rotate-6 group-hover:rotate-12" : ""
            }`}
          />
        ))}
      </div>
      <p className="mt-4 font-display text-lg font-extrabold leading-tight text-white">{name}</p>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{description}</p>
      <p className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {songs.length} tracks
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-black opacity-0 transition group-hover:opacity-100">
          <Icon name="play" size={13} />
        </span>
      </p>
    </button>
  );
}

function ArtistBubble({ slug }: { slug: string }) {
  const { artistBySlug, navigate } = usePlayer();
  const artist = artistBySlug(slug);
  if (!artist) return null;
  const theme = LANGUAGE_THEME[artist.language] ?? LANGUAGE_THEME.hindi;
  return (
    <button
      type="button"
      onClick={() => navigate({ name: "artist", slug })}
      className="group flex w-[132px] shrink-0 flex-col items-center gap-2 text-center"
    >
      <span
        className="grid h-[104px] w-[104px] place-items-center rounded-full font-display text-2xl font-extrabold text-white ring-2 ring-white/10 transition duration-300 group-hover:scale-[1.04] group-hover:ring-white/40"
        style={{
          backgroundImage: `linear-gradient(${135 + (artist.artworkSeed % 80)}deg, ${theme.from}, ${theme.via} 55%, ${theme.to})`,
        }}
      >
        {artist.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")}
      </span>
      <span className="w-full truncate text-xs font-bold text-white">{artist.name}</span>
      <span className="-mt-2 w-full truncate text-[10px] text-zinc-500">
        {formatCount(artist.listenersMonthly)} listeners
      </span>
    </button>
  );
}

function useCurated() {
  const { catalog } = usePlayer();
  return useMemo(
    () =>
      CURATED_PLAYLISTS.map((playlist, index) => {
        const matched = catalog.filter((song) =>
          playlist.match(song.language, song.moods.join(","), song.releaseYear),
        );
        const seeds = [
          LANGUAGE_THEME.punjabi,
          LANGUAGE_THEME.haryanvi,
          LANGUAGE_THEME.hindi,
          LANGUAGE_THEME.punjabi,
        ];
        return {
          ...playlist,
          songs: matched.sort((a, b) => b.playCount - a.playCount).slice(0, 24),
          accent: seeds[index % seeds.length],
        };
      }).filter((playlist) => playlist.songs.length > 2),
    [catalog],
  );
}

/* -------------------------------------------------------------------- home */

export function HomeView() {
  const { catalog, stats, navigate, recent, playQueue, artists } = usePlayer();
  const curated = useCurated();

  const newPunjabi = useMemo(
    () =>
      catalog
        .filter((s) => s.language === "punjabi")
        .sort((a, b) => b.releaseYear - a.releaseYear || b.playCount - a.playCount)
        .slice(0, 16),
    [catalog],
  );
  const haryanvi = useMemo(
    () =>
      catalog
        .filter((s) => s.language === "haryanvi")
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 16),
    [catalog],
  );
  const hindi = useMemo(
    () =>
      catalog
        .filter((s) => s.language === "hindi")
        .sort((a, b) => b.releaseYear - a.releaseYear || b.playCount - a.playCount)
        .slice(0, 16),
    [catalog],
  );
  const trending = useMemo(
    () => [...catalog].sort((a, b) => b.playCount - a.playCount).slice(0, 20),
    [catalog],
  );
  const fresh2026 = useMemo(
    () =>
      catalog
        .filter((s) => s.releaseYear >= NEWEST_RELEASE_YEAR)
        .sort((a, b) => b.playCount - a.playCount),
    [catalog],
  );
  const ticker = useMemo(
    () =>
      catalog
        .filter((s) => s.isNew)
        .sort((a, b) => b.releaseYear - a.releaseYear || b.playCount - a.playCount)
        .slice(0, 16),
    [catalog],
  );

  const languageCounts = [
    { language: "punjabi", songs: catalog.filter((s) => s.language === "punjabi") },
    { language: "haryanvi", songs: catalog.filter((s) => s.language === "haryanvi") },
    { language: "hindi", songs: catalog.filter((s) => s.language === "hindi") },
  ];

  return (
    <div className="animate-fade-up space-y-14 pb-6">
      {/* hero */}
      <section className="grain relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-panel-2 via-panel to-black p-6 sm:p-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              streaming now · no login · no paywall
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-white">
              Press play on
              <span className="block bg-gradient-to-r from-saffron via-magenta to-royal bg-clip-text text-transparent">
                Punjab, Haryana &amp; Bollywood
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {stats.totalSongs} songs across {stats.totalArtists} artists — including{" "}
              <span className="font-bold text-white">
                {fresh2026.length} brand-new {NEWEST_RELEASE_YEAR} releases
              </span>{" "}
              from Punjab, Haryana and Bollywood. Nothing to sign up for, nothing to unlock. Every
              track starts the second you click it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => playQueue(trending, 0)}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-[1.03] hover:bg-zinc-200"
              >
                <Icon name="play" size={16} /> Play top {trending.length}
              </button>
              <button
                type="button"
                onClick={() => navigate({ name: "search" })}
                className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10"
              >
                <Icon name="search" size={16} /> Search the library
              </button>
              <span className="flex items-center gap-2 text-xs text-zinc-500">
                <Icon name="spark" size={14} className="text-saffron" /> space bar = play / pause
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {languageCounts.map(({ language, songs }) => {
              const theme = LANGUAGE_THEME[language];
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => navigate({ name: "language", language })}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left backdrop-blur transition hover:border-white/30"
                  style={{ boxShadow: `inset 3px 0 0 ${theme.from}` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`font-display text-xl font-extrabold ${theme.text}`}>
                      {LANGUAGE_LABEL[language]}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {songs.length} songs · {new Set(songs.map((s) => s.artist)).size} artists
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition group-hover:translate-x-1 group-hover:bg-white group-hover:text-black">
                    <Icon name="chevronRight" size={16} />
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate({ name: "year", year: NEWEST_RELEASE_YEAR })}
              className="group flex items-center gap-4 rounded-2xl border border-saffron/40 bg-gradient-to-r from-saffron/25 via-magenta/15 to-transparent p-4 text-left backdrop-blur transition hover:border-saffron"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-saffron">
                  just added
                </p>
                <p className="font-display text-2xl font-extrabold leading-tight text-white">
                  New {NEWEST_RELEASE_YEAR} songs
                </p>
                <p className="text-xs text-zinc-300">{fresh2026.length} fresh tracks this year</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black transition group-hover:scale-110">
                <Icon name="spark" size={16} />
              </span>
            </button>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                lifetime plays on RanaSongs
              </p>
              <p className="font-display text-3xl font-extrabold tabular-nums text-white">
                {formatCount(stats.totalPlays)}
              </p>
            </div>
          </div>
        </div>

        {/* new release ticker */}
        <div className="relative z-10 mt-9 overflow-hidden border-t border-white/10 pt-5">
          <div className="flex w-max animate-marquee gap-3">
            {[...ticker, ...ticker].map((song, index) => (
              <button
                key={`${song.id}-${index}`}
                type="button"
                onClick={() => playQueue([song], 0)}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <span className="text-saffron">
                  <Icon name="spark" size={12} />
                </span>
                <span className="font-bold text-white">{song.title}</span>
                <span className="text-zinc-500">{song.artist}</span>
                <span className="text-zinc-600">{song.releaseYear}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHead
          eyebrow={`${fresh2026.length} tracks released this year`}
          title={`New in ${NEWEST_RELEASE_YEAR}`}
          action={
            <button
              type="button"
              onClick={() => navigate({ name: "year", year: NEWEST_RELEASE_YEAR })}
              className="text-xs font-bold text-saffron transition hover:text-orange-200"
            >
              Open {NEWEST_RELEASE_YEAR} →
            </button>
          }
        />
        <CardRail>
          {fresh2026.slice(0, 18).map((song) => (
            <TrackCard key={song.id} song={song} list={fresh2026} />
          ))}
        </CardRail>
      </section>

      {recent.length > 0 ? (
        <section>
          <SectionHead
            eyebrow="picked up where you left off"
            title="Recently played"
            action={
              <button
                type="button"
                onClick={() => navigate({ name: "recent" })}
                className="text-xs font-bold text-zinc-400 transition hover:text-white"
              >
                See all
              </button>
            }
          />
          <CardRail>
            {recent.slice(0, 12).map((song) => (
              <TrackCard key={song.id} song={song} list={recent} />
            ))}
          </CardRail>
        </section>
      ) : null}

      <section>
        <SectionHead
          eyebrow="just landed"
          title="New Punjabi drops"
          action={
            <button
              type="button"
              onClick={() => navigate({ name: "language", language: "punjabi" })}
              className="text-xs font-bold text-orange-300 transition hover:text-orange-200"
            >
              All Punjabi →
            </button>
          }
        />
        <CardRail>
          {newPunjabi.map((song) => (
            <TrackCard key={song.id} song={song} list={newPunjabi} />
          ))}
        </CardRail>
      </section>

      <section>
        <SectionHead
          eyebrow="desi dhamaka"
          title="Haryanvi hitlist"
          action={
            <button
              type="button"
              onClick={() => navigate({ name: "language", language: "haryanvi" })}
              className="text-xs font-bold text-emerald-300 transition hover:text-emerald-200"
            >
              All Haryanvi →
            </button>
          }
        />
        <CardRail>
          {haryanvi.map((song) => (
            <TrackCard key={song.id} song={song} list={haryanvi} />
          ))}
        </CardRail>
      </section>

      <section>
        <SectionHead
          eyebrow="filmi + indie"
          title="Hindi right now"
          action={
            <button
              type="button"
              onClick={() => navigate({ name: "language", language: "hindi" })}
              className="text-xs font-bold text-violet-300 transition hover:text-violet-200"
            >
              All Hindi →
            </button>
          }
        />
        <CardRail>
          {hindi.map((song) => (
            <TrackCard key={song.id} song={song} list={hindi} />
          ))}
        </CardRail>
      </section>

      <section>
        <SectionHead eyebrow="made for you" title="Mood mixes" />
        <CardRail>
          {curated.map((playlist) => (
            <PlaylistTile
              key={playlist.name}
              name={playlist.name}
              description={playlist.description}
              songs={playlist.songs}
              accent={playlist.accent}
            />
          ))}
        </CardRail>
      </section>

      <TrackTable
        songs={trending}
        heading={<SectionHead eyebrow="the chart" title="Trending across all languages" />}
      />

      <section>
        <SectionHead eyebrow="who's loud" title="Artists on rotation" />
        <CardRail>
          {artists.slice(0, 22).map((artist) => (
            <ArtistBubble key={artist.id} slug={artist.slug} />
          ))}
        </CardRail>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- language */

export function LanguageView({ language }: { language: string }) {
  const { catalog, playQueue } = usePlayer();
  const theme = LANGUAGE_THEME[language] ?? LANGUAGE_THEME.hindi;
  const [sort, setSort] = useState<"new" | "popular" | "az">("new");

  const songs = useMemo(() => {
    const rows = catalog.filter((s) => s.language === language);
    if (sort === "popular") return [...rows].sort((a, b) => b.playCount - a.playCount);
    if (sort === "az") return [...rows].sort((a, b) => a.title.localeCompare(b.title));
    return [...rows].sort((a, b) => b.releaseYear - a.releaseYear || b.playCount - a.playCount);
  }, [catalog, language, sort]);

  const moods = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach((s) => s.moods.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [songs]);

  const [mood, setMood] = useState<string | null>(null);
  const filtered = mood ? songs.filter((s) => s.moods.includes(mood)) : songs;
  const artistsHere = [...new Set(songs.map((s) => s.artistSlug))].length;

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <header
        className="grain relative overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-9"
        style={{ backgroundImage: `linear-gradient(140deg, ${theme.from}33, ${theme.via}22 45%, #05050a)` }}
      >
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-400">
              language station
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.2rem)] font-extrabold leading-none tracking-tight text-white">
              {LANGUAGE_LABEL[language]}
            </h1>
            <p className="mt-3 max-w-lg text-sm text-zinc-300">
              {songs.length} tracks from {artistsHere} artists, updated with the newest releases first.
              Instant playback, zero login.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {moods.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setMood((m) => (m === name ? null : name))}
                  className={`rounded-full border px-3 py-1 text-xs font-bold capitalize transition ${
                    mood === name
                      ? "border-white bg-white text-black"
                      : "border-white/15 bg-black/30 text-zinc-300 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {name} <span className="opacity-50">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              type="button"
              onClick={() => playQueue(filtered, 0)}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:scale-[1.03]"
            >
              <Icon name="play" size={15} /> Play station
            </button>
            <div className="flex gap-1 rounded-full border border-white/15 bg-black/40 p-1">
              {(["new", "popular", "az"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSort(option)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                    sort === option ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {option === "az" ? "A–Z" : option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <TrackTable
        songs={filtered}
        heading={
          mood ? (
            <div className="flex items-center gap-3">
              <h3 className="font-display text-xl font-extrabold text-white capitalize">{mood}</h3>
              <button
                type="button"
                onClick={() => setMood(null)}
                className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold text-zinc-300 transition hover:border-white/40 hover:text-white"
              >
                <Icon name="close" size={11} /> clear
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------- year */

export function YearView({ year }: { year: number }) {
  const { catalog, playQueue, navigate } = usePlayer();
  const [language, setLanguage] = useState<string | null>(null);

  const all = useMemo(
    () => catalog.filter((song) => song.releaseYear === year),
    [catalog, year],
  );
  const songs = useMemo(() => {
    const rows = language ? all.filter((s) => s.language === language) : all;
    return [...rows].sort((a, b) => b.playCount - a.playCount);
  }, [all, language]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { punjabi: 0, haryanvi: 0, hindi: 0 };
    all.forEach((song) => {
      map[song.language] = (map[song.language] ?? 0) + 1;
    });
    return map;
  }, [all]);

  const totalSeconds = songs.reduce((sum, song) => sum + song.durationSec, 0);

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <header className="grain relative overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(255,122,24,0.42), rgba(224,17,95,0.32) 38%, rgba(127,91,255,0.35) 68%, #06060a 100%)",
          }}
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
              fresh this year · {all.length} new tracks
            </p>
            <h1 className="font-display text-[clamp(4rem,14vw,9rem)] font-extrabold leading-[0.82] tracking-[-0.04em] text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.5)]">
              {year}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/80">
              Every {year} release on RanaSongs — new Punjabi singles, this season&apos;s Haryanvi hits and
              the {year} Bollywood run. Streaming instantly, no login, no limits.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => playQueue(songs, 0)}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-[1.03]"
              >
                <Icon name="play" size={16} /> Play all {songs.length}
              </button>
              <button
                type="button"
                onClick={() => playQueue([...songs].sort(() => Math.random() - 0.5), 0)}
                className="flex items-center gap-2 rounded-full border border-white/40 bg-black/30 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-black/50"
              >
                <Icon name="shuffle" size={15} /> Shuffle {year}
              </button>
              <span className="text-xs font-bold text-white/70">
                {formatTime(totalSeconds)} of new music
              </span>
            </div>
          </div>

          <div className="grid w-full max-w-xs gap-2">
            {(
              [
                { key: null, label: `All languages`, count: all.length },
                { key: "punjabi", label: LANGUAGE_LABEL.punjabi, count: counts.punjabi ?? 0 },
                { key: "haryanvi", label: LANGUAGE_LABEL.haryanvi, count: counts.haryanvi ?? 0 },
                { key: "hindi", label: LANGUAGE_LABEL.hindi, count: counts.hindi ?? 0 },
              ] as const
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setLanguage(option.key)}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-bold backdrop-blur transition ${
                  language === option.key
                    ? "border-white bg-white text-black"
                    : "border-white/25 bg-black/30 text-white hover:border-white/60"
                }`}
              >
                <span>{option.label}</span>
                <span className="tabular-nums opacity-70">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          also new recently
        </p>
        <div className="flex flex-wrap gap-2">
          {[...new Set(catalog.map((s) => s.releaseYear))]
            .filter((y) => y !== year && y >= year - 4)
            .sort((a, b) => b - a)
            .map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => navigate({ name: "year", year: y })}
                className="rounded-full border border-edge bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-white/40 hover:text-white"
              >
                {y}
              </button>
            ))}
        </div>
      </div>

      <TrackTable
        songs={songs}
        heading={
          <SectionHead
            eyebrow={`${year} · sorted by plays`}
            title={language ? `${LANGUAGE_LABEL[language]} releases` : "All new releases"}
          />
        }
        emptyLabel={`No ${year} releases for this filter yet.`}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- trending */

export function TrendingView() {
  const { catalog } = usePlayer();
  const songs = useMemo(() => [...catalog].sort((a, b) => b.playCount - a.playCount), [catalog]);
  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <PageHeader
        eyebrow="real-time"
        title="Global desi chart"
        description="Ranked by plays from every guest session on RanaSongs — no accounts, no gates."
      />
      <TrackTable songs={songs} />
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-edge pb-6">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-none tracking-tight text-white">
          {title}
        </h1>
        {children}
      </div>
      {description ? <p className="mt-3 max-w-2xl text-sm text-zinc-400">{description}</p> : null}
    </header>
  );
}

/* -------------------------------------------------------------------- liked */

export function LikedView() {
  const { catalog, likedIds, deviceId, playQueue } = usePlayer();
  const songs = useMemo(
    () => likedIds.map((id) => catalog.find((s) => s.id === id)).filter((s): s is SongDTO => Boolean(s)),
    [likedIds, catalog],
  );

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <header className="grain relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-rose-600/35 via-panel to-black p-6 sm:p-9">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-200">
              your collection
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold leading-none text-white">
              Liked songs
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              {songs.length} saved · stored against this device
              {deviceId ? ` (${deviceId.slice(0, 12)}…)` : ""} — still no login.
            </p>
          </div>
          {songs.length > 0 ? (
            <button
              type="button"
              onClick={() => playQueue(songs, 0)}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:scale-[1.03]"
            >
              <Icon name="play" size={15} /> Play {songs.length}
            </button>
          ) : null}
        </div>
      </header>

      <TrackTable
        songs={songs}
        emptyLabel="No likes yet. Tap the heart on any song — it is saved to this browser instantly."
      />
    </div>
  );
}

/* ------------------------------------------------------------------- recent */

export function RecentView() {
  const { recent } = usePlayer();
  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <PageHeader
        eyebrow="listening history"
        title="Recently played"
        description="Every play is logged against your anonymous device id so your history survives a refresh."
      />
      <TrackTable
        songs={recent}
        emptyLabel="Play something and it will show up here."
      />
    </div>
  );
}

/* ------------------------------------------------------------------- artist */

export function ArtistView({ slug }: { slug: string }) {
  const { byArtist, artistBySlug, playQueue } = usePlayer();
  const artist = artistBySlug(slug);
  const songs = useMemo(
    () => byArtist(slug).sort((a, b) => b.playCount - a.playCount),
    [byArtist, slug],
  );

  if (!artist) {
    return (
      <div className="animate-fade-up rounded-3xl border border-edge bg-panel p-10 text-center text-sm text-zinc-400">
        Artist not found.
      </div>
    );
  }

  const theme = LANGUAGE_THEME[artist.language] ?? LANGUAGE_THEME.hindi;
  const totalPlays = songs.reduce((sum, s) => sum + s.playCount, 0);

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <header
        className="grain relative overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-10"
        style={{ backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.via} 48%, #07070b 92%)` }}
      >
        <div className="relative z-10 flex flex-wrap items-end gap-6">
          <div
            className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-black/30 font-display text-4xl font-extrabold text-white shadow-2xl sm:h-36 sm:w-36 sm:text-5xl"
            style={{ backgroundImage: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
          >
            {artist.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
              artist · {LANGUAGE_LABEL[artist.language]}
            </p>
            <h1 className="mt-1 font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-none tracking-tight text-white drop-shadow">
              {artist.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75">{artist.bio}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-white/85">
              <span>{formatCount(artist.listenersMonthly)} monthly listeners</span>
              <span className="h-3 w-px bg-white/30" />
              <span>{songs.length} tracks on RanaSongs</span>
              <span className="h-3 w-px bg-white/30" />
              <span>{formatCount(totalPlays)} plays</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => playQueue(songs, 0)}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:scale-[1.03]"
              >
                <Icon name="play" size={15} /> Play all
              </button>
              <button
                type="button"
                onClick={() =>
                  playQueue([...songs].sort(() => Math.random() - 0.5), 0)
                }
                className="flex items-center gap-2 rounded-full border border-white/40 bg-black/25 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-black/45"
              >
                <Icon name="shuffle" size={15} /> Shuffle
              </button>
            </div>
          </div>
        </div>
      </header>

      <TrackTable songs={songs} heading={<SectionHead eyebrow="discography" title={`Tracks by ${artist.name}`} />} />
    </div>
  );
}

/* ----------------------------------------------------------------- playlist */

export function PlaylistView({ id }: { id: number }) {
  const { playlists, songsByIds, playQueue, deletePlaylist, removeFromPlaylist, renamePlaylist, navigate } =
    usePlayer();
  const playlist = playlists.find((p) => p.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const songs = playlist ? songsByIds(playlist.songIds) : [];

  if (!playlist) {
    return (
      <div className="animate-fade-up rounded-3xl border border-edge bg-panel p-10 text-center text-sm text-zinc-400">
        Playlist not found — it may have been deleted.
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-edge pb-6">
        <div className="flex items-end gap-4">
          <div className="flex -space-x-3">
            {songs.slice(0, 3).map((song) => (
              <Artwork
                key={song.id}
                seed={song.artworkSeed}
                language={song.language}
                title={song.title}
                size={62}
                className="ring-2 ring-black"
              />
            ))}
            {songs.length === 0 ? (
              <div className="grid h-[62px] w-[62px] place-items-center rounded-xl border border-edge bg-white/5 text-zinc-600">
                <Icon name="queue" size={20} />
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500">
              your playlist
            </p>
            {editing ? (
              <form
                className="mt-1 flex items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (draft.trim()) await renamePlaylist(playlist.id, draft.trim());
                  setEditing(false);
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="w-64 rounded-lg border border-edge bg-black/50 px-2 py-1 font-display text-2xl font-extrabold text-white outline-none focus:border-saffron"
                />
                <button type="submit" className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">
                  Save
                </button>
              </form>
            ) : (
              <h1
                className="mt-1 cursor-text font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-none text-white"
                onClick={() => {
                  setDraft(playlist.name);
                  setEditing(true);
                }}
                title="Click to rename"
              >
                {playlist.name}
              </h1>
            )}
            <p className="mt-2 text-sm text-zinc-400">
              {songs.length} tracks ·{" "}
              {formatTime(songs.reduce((sum, s) => sum + s.durationSec, 0))} total
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {songs.length > 0 ? (
            <button
              type="button"
              onClick={() => playQueue(songs, 0)}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:scale-[1.03]"
            >
              <Icon name="play" size={15} /> Play
            </button>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await deletePlaylist(playlist.id);
              navigate({ name: "home" });
            }}
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-rose-400/60 hover:text-rose-300"
          >
            <Icon name="trash" size={15} /> Delete
          </button>
        </div>
      </header>

      {songs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-edge bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-zinc-400">
            Empty for now. Use the <span className="text-white">+</span> button on any track to add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, index) => (
            <div key={`${song.id}-${index}`} className="group flex items-center gap-2">
              <div className="flex-1">
                <CompactRow song={song} index={index} list={songs} />
              </div>
              <button
                type="button"
                onClick={() => removeFromPlaylist(playlist.id, song.id)}
                title="Remove from playlist"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-600 opacity-0 transition hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompactRow({ song, index, list }: { song: SongDTO; index: number; list: SongDTO[] }) {
  const { playQueue, current, isPlaying } = usePlayer();
  const isCurrent = current?.id === song.id;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => playQueue(list, index)}
      onKeyDown={(event) => {
        if (event.key === "Enter") playQueue(list, index);
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition ${
        isCurrent ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
      }`}
    >
      {isCurrent && isPlaying ? (
        <Equalizer playing className="text-orange-300" />
      ) : (
        <span className="w-4 text-center text-[11px] tabular-nums text-zinc-600">{index + 1}</span>
      )}
      <Artwork seed={song.artworkSeed} language={song.language} title={song.title} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{song.title}</p>
        <p className="truncate text-xs text-zinc-400">{song.artist}</p>
      </div>
      <LanguageChip language={song.language} />
      <LikeButton song={song} size={16} />
      <PlaylistMenu song={song} />
      <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
        {formatTime(song.durationSec)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------- search */

function OnlineTrackRow({
  track,
  index,
  onPlay,
}: {
  track: OnlineTrackDTO;
  index: number;
  onPlay: (index: number) => void;
}) {
  const { current } = usePlayer();
  const isCurrent = current?.videoId === track.videoId;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPlay(index)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onPlay(index);
      }}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition ${
        isCurrent ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center text-zinc-600">
        {isCurrent ? (
          <Equalizer playing className="text-rose-400" />
        ) : (
          <>
            <span className="text-sm tabular-nums group-hover:opacity-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="absolute hidden text-white group-hover:block">
              <Icon name="play" size={15} />
            </span>
          </>
        )}
      </span>
      <div className="relative shrink-0">
        <Artwork
          seed={index * 40}
          language="hindi"
          title={track.title}
          videoId={track.videoId}
          size={42}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${isCurrent ? "text-rose-300" : "text-white"}`}>
          {track.title}
        </p>
        <p className="truncate text-xs text-zinc-400">{track.artist}</p>
      </div>
      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
        online
      </span>
      {track.views > 0 ? (
        <span className="hidden w-16 text-right text-xs tabular-nums text-zinc-500 sm:block">
          {formatCount(track.views)}
        </span>
      ) : null}
      <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
        {track.durationSec > 0 ? formatTime(track.durationSec) : "—"}
      </span>
    </div>
  );
}

function OnlineResults({
  query,
  tracks,
  state,
  onPlay,
}: {
  query: string;
  tracks: OnlineTrackDTO[];
  state: "idle" | "loading" | "done" | "error";
  onPlay: (index: number) => void;
}) {
  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-edge bg-white/[0.02] p-8 text-center">
        <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
        <p className="text-sm text-zinc-300">
          Not in your library — searching online for{" "}
          <span className="font-bold text-white">“{query}”</span>…
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-edge bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
        Online search is unavailable right now. Please try again in a moment.
      </div>
    );
  }

  if (state === "done" && tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
        No matches in your library or online for “{query}”. Try a different spelling or an artist name.
      </div>
    );
  }

  if (!tracks.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/20 text-rose-300">
          <Icon name="search" size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Not in your library — playing from online search</p>
          <p className="text-xs text-zinc-400">
            {tracks.length} full songs found for “{query}”. Click any to play instantly — no login.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPlay(0)}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:scale-[1.03]"
        >
          <Icon name="play" size={13} /> Play all
        </button>
      </div>
      <div>
        {tracks.map((track, index) => (
          <OnlineTrackRow key={track.videoId} track={track} index={index} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}

export function SearchView({ initialQuery }: { initialQuery?: string }) {
  const { catalog, navigate, playOnline } = usePlayer();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);

  const [online, setOnline] = useState<OnlineTrackDTO[]>([]);
  const [onlineState, setOnlineState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const onlineTokenRef = useRef(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((song) => {
      if (languageFilter && song.language !== languageFilter) return false;
      if (!q) return languageFilter ? true : false;
      return [song.title, song.artist, song.album ?? "", song.genre, song.moods.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [catalog, query, languageFilter]);

  const trimmedQuery = query.trim();

  const hasLocalMatches = results.length > 0;

  // When there are no local matches, fetch real songs from YouTube (debounced).
  // All state changes happen asynchronously (inside the timer / fetch) so we
  // never call setState synchronously during the effect body.
  useEffect(() => {
    const token = ++onlineTokenRef.current;

    if (trimmedQuery.length < 2 || hasLocalMatches) {
      const reset = window.setTimeout(() => {
        if (onlineTokenRef.current !== token) return;
        setOnline([]);
        setOnlineState("idle");
      }, 0);
      return () => window.clearTimeout(reset);
    }

    const loadingTimer = window.setTimeout(() => {
      if (onlineTokenRef.current !== token) return;
      setOnline([]);
      setOnlineState("loading");
    }, 0);

    const searchTimer = window.setTimeout(() => {
      fetch(`/api/search-online?q=${encodeURIComponent(trimmedQuery)}`)
        .then((response) => response.json())
        .then((data: { tracks?: OnlineTrackDTO[] }) => {
          if (onlineTokenRef.current !== token) return;
          setOnline(Array.isArray(data.tracks) ? data.tracks : []);
          setOnlineState("done");
        })
        .catch(() => {
          if (onlineTokenRef.current !== token) return;
          setOnlineState("error");
        });
    }, 550);

    return () => {
      window.clearTimeout(loadingTimer);
      window.clearTimeout(searchTimer);
    };
  }, [trimmedQuery, hasLocalMatches]);

  const suggestions = useMemo(() => {
    const pool = new Map<string, number>();
    catalog.forEach((song) => {
      song.moods.forEach((mood) => pool.set(mood, (pool.get(mood) ?? 0) + 1));
      pool.set(song.artist, (pool.get(song.artist) ?? 0) + 2);
    });
    return [...pool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([name]) => name);
  }, [catalog]);

  return (
    <div className="animate-fade-up space-y-7 pb-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500">search</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-none text-white">
          Search any song — library or online
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Not in the RanaSongs library? We search online and play the full song instantly — no login.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <Icon name="search" size={18} />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search any song or artist — plays online if not in the library…"
              className="w-full rounded-full border border-edge bg-black/50 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-saffron/70 focus:bg-black/70"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-edge bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setLanguageFilter(null)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                languageFilter === null ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              all
            </button>
            {Object.keys(LANGUAGE_TRACKS).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setLanguageFilter(language)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  languageFilter === language ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {LANGUAGE_LABEL[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!query.trim() && !languageFilter ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((term) => {
            const seed = hashCode(term);
            const theme = LANGUAGE_THEME[seed % 3 === 0 ? "punjabi" : seed % 3 === 1 ? "haryanvi" : "hindi"];
            return (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-panel p-3 text-left transition hover:border-white/30"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold text-white"
                  style={{ backgroundImage: `linear-gradient(140deg, ${theme.from}, ${theme.to})` }}
                >
                  {term.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-white">
                  {term.replace(/-/g, " ")}
                </span>
                <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white">
                  <Icon name="chevronRight" size={16} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            {results.length} result{results.length === 1 ? "" : "s"} in your library
            {query ? ` for “${query}”` : ""}
          </p>

          {results.length > 0 ? (
            <TrackTable songs={results} />
          ) : (
            <OnlineResults
              query={trimmedQuery}
              tracks={online}
              state={onlineState}
              onPlay={(index) => playOnline(online, index)}
            />
          )}
        </>
      )}
      <button type="button" onClick={() => navigate({ name: "home" } as Route)} className="sr-only">
        back home
      </button>
    </div>
  );
}
