"use client";

import { useEffect, useRef, useState } from "react";
import type { SongDTO } from "@/lib/types";
import { formatCount, formatTime, LANGUAGE_THEME } from "@/lib/format";
import { usePlayer } from "@/components/player-context";
import { Artwork, Equalizer, Icon, LanguageChip } from "@/components/ui";

function useOutsideClick<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export function PlaylistMenu({ song, align = "right" }: { song: SongDTO; align?: "right" | "left" }) {
  const { playlists, addToPlaylist, createPlaylist } = usePlayer();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Add to playlist"
        className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="plus" size={16} />
      </button>

      {open ? (
        <div
          className={`absolute bottom-full z-40 mb-2 w-60 overflow-hidden rounded-2xl border border-edge bg-panel-2/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Add to playlist
          </p>
          <div className="max-h-40 overflow-y-auto scroll-thin">
            {playlists.length === 0 ? (
              <p className="px-2 py-3 text-xs text-zinc-500">No playlists yet — make one below.</p>
            ) : (
              playlists.map((playlist) => {
                const inside = playlist.songIds.includes(song.id);
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={inside}
                    onClick={async () => {
                      await addToPlaylist(playlist.id, song);
                      setFlash(`Added to ${playlist.name}`);
                      window.setTimeout(() => setFlash(null), 1600);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <span className="truncate">{playlist.name}</span>
                    {inside ? <Icon name="check" size={14} className="text-emerald-400" /> : null}
                  </button>
                );
              })
            )}
          </div>
          <form
            className="mt-1 flex gap-1 border-t border-edge pt-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const name = newName.trim();
              if (!name) return;
              await createPlaylist(name);
              setNewName("");
              setFlash(`Created ${name}`);
              window.setTimeout(() => setFlash(null), 1600);
            }}
          >
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New playlist name"
              className="min-w-0 flex-1 rounded-lg border border-edge bg-black/40 px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-saffron/70"
            />
            <button
              type="submit"
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              Create
            </button>
          </form>
          {flash ? (
            <p className="mt-2 flex items-center gap-1 px-2 text-[11px] font-semibold text-emerald-300">
              <Icon name="check" size={12} /> {flash}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LikeButton({ song, size = 18 }: { song: SongDTO; size?: number }) {
  const { isLiked, toggleLike } = usePlayer();
  const liked = isLiked(song.id);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggleLike(song);
      }}
      title={liked ? "Remove from liked songs" : "Like — saved on this device, no login"}
      className={`grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10 ${
        liked ? "text-rose-400" : "text-zinc-500 hover:text-white"
      }`}
    >
      <Icon name={liked ? "heartFilled" : "heart"} size={size} />
    </button>
  );
}

export function TrackRow({
  song,
  index,
  list,
  showRank = true,
}: {
  song: SongDTO;
  index: number;
  list: SongDTO[];
  showRank?: boolean;
}) {
  const { playQueue, current, isPlaying, navigate } = usePlayer();
  const isCurrent = current?.id === song.id;
  const theme = LANGUAGE_THEME[song.language] ?? LANGUAGE_THEME.hindi;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => playQueue(list, index)}
      onKeyDown={(event) => {
        if (event.key === "Enter") playQueue(list, index);
      }}
      className={`group grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 transition sm:grid-cols-[2.5rem_minmax(0,2.2fr)_minmax(0,1fr)_5rem_6rem] ${
        isCurrent ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
      }`}
    >
      <div className="relative flex h-9 items-center justify-center">
        {isCurrent && isPlaying ? (
          <Equalizer playing className={theme.text} />
        ) : (
          <>
            <span
              className={`font-display text-sm tabular-nums ${
                showRank ? "text-zinc-600 group-hover:opacity-0" : "hidden"
              } transition`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="absolute hidden text-white group-hover:block">
              <Icon name="play" size={15} />
            </span>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Artwork
          seed={song.artworkSeed}
          language={song.language}
          title={song.title}
          videoId={song.videoId}
          size={42}
        />
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-bold ${isCurrent ? theme.text : "text-white"}`}
            title={song.title}
          >
            {song.title}
            {song.isNew ? (
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-wider text-zinc-200">
                new
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate({ name: "artist", slug: song.artistSlug });
            }}
            className="truncate text-xs text-zinc-400 transition hover:text-white hover:underline"
          >
            {song.artist}
          </button>
        </div>
      </div>

      <p className="hidden truncate text-xs text-zinc-500 sm:block" title={song.album ?? ""}>
        {song.album ?? "—"}
      </p>

      <p className="hidden justify-self-start text-xs tabular-nums text-zinc-500 sm:block">
        {formatCount(song.playCount)}
      </p>

      <div className="flex items-center justify-end gap-1">
        <LikeButton song={song} size={16} />
        <span className="hidden md:block">
          <PlaylistMenu song={song} />
        </span>
        <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
          {formatTime(song.durationSec)}
        </span>
      </div>
    </div>
  );
}

export function TrackTable({
  songs,
  heading,
  emptyLabel = "Nothing here yet.",
}: {
  songs: SongDTO[];
  heading?: React.ReactNode;
  emptyLabel?: string;
}) {
  const { playQueue } = usePlayer();
  if (!songs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-edge bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <section>
      {heading}
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 sm:grid sm:grid-cols-[2.5rem_minmax(0,2.2fr)_minmax(0,1fr)_5rem_6rem] sm:gap-3">
          <span className="text-center">#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Plays</span>
          <span className="text-right">Time</span>
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => playQueue(songs, 0)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black transition hover:bg-zinc-200"
          >
            Play all
          </button>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-[11px] text-zinc-500">{songs.length} tracks</span>
          <button
            type="button"
            onClick={() => playQueue(songs, 0)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            <Icon name="play" size={12} /> Play all
          </button>
        </div>
      </div>
      <div className="relative">
        {songs.map((song, index) => (
          <TrackRow key={`${song.id}-${index}`} song={song} index={index} list={songs} />
        ))}
      </div>
    </section>
  );
}

export function TrackCard({ song, list }: { song: SongDTO; list: SongDTO[] }) {
  const { playQueue, current, isPlaying, toggle, navigate } = usePlayer();
  const isCurrent = current?.id === song.id;
  const theme = LANGUAGE_THEME[song.language] ?? LANGUAGE_THEME.hindi;

  return (
    <div
      className="group relative w-[168px] shrink-0 cursor-pointer sm:w-[184px]"
      onClick={() => (isCurrent ? toggle() : playQueue(list, list.findIndex((s) => s.id === song.id)))}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-panel transition duration-300 group-hover:border-white/25 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
        <Artwork
          seed={song.artworkSeed}
          language={song.language}
          title={song.title}
          videoId={song.videoId}
          size={184}
          rounded="rounded-none"
          className="h-[168px] w-full sm:h-[184px]"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (isCurrent) toggle();
            else playQueue(list, list.findIndex((s) => s.id === song.id));
          }}
          className="absolute bottom-3 right-3 grid h-11 w-11 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 shadow-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105"
          title={isCurrent && isPlaying ? "Pause" : "Play"}
        >
          <Icon name={isCurrent && isPlaying ? "pause" : "play"} size={20} />
        </button>
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <LanguageChip language={song.language} className="bg-black/50 backdrop-blur" />
          {isCurrent && isPlaying ? (
            <span className={`rounded-full bg-black/60 px-2 py-1 ${theme.text} backdrop-blur`}>
              <Equalizer playing />
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2.5 truncate text-sm font-bold text-white" title={song.title}>
        {song.title}
      </p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          navigate({ name: "artist", slug: song.artistSlug });
        }}
        className="block w-full truncate text-left text-xs text-zinc-400 transition hover:text-white hover:underline"
      >
        {song.artist} · {song.releaseYear}
      </button>
    </div>
  );
}

export function CardRail({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const scrollBy = (delta: number) => scroller.current?.scrollBy({ left: delta, behavior: "smooth" });

  return (
    <div className="group/rail relative">
      <div
        ref={scroller}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-2 [scroll-snap-type:x_proximity]"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-680)}
        className="absolute -left-2 top-[76px] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-edge bg-panel/90 text-white opacity-0 shadow-lg backdrop-blur transition hover:bg-white/15 group-hover/rail:opacity-100 lg:grid"
        aria-label="Scroll left"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(680)}
        className="absolute -right-2 top-[76px] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-edge bg-panel/90 text-white opacity-0 shadow-lg backdrop-blur transition hover:bg-white/15 group-hover/rail:opacity-100 lg:grid"
        aria-label="Scroll right"
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );
}
