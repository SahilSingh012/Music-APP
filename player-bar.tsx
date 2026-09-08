"use client";

import { useState, type CSSProperties } from "react";
import { formatTime, LANGUAGE_THEME } from "@/lib/format";
import { usePlayer } from "@/components/player-context";
import { Artwork, Equalizer, Icon } from "@/components/ui";

function sliderStyle(percent: number, color: string): CSSProperties {
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    ["--seek-track" as string]: `linear-gradient(90deg, ${color} ${clamped}%, #26262f ${clamped}%)`,
  } as CSSProperties;
}

export function QueuePanel({ onClose }: { onClose: () => void }) {
  const { queue, currentIndex, playQueue, current } = usePlayer();
  const upNext = queue.slice(currentIndex + 1);

  return (
    <aside className="fixed bottom-[92px] left-3 right-3 top-3 z-50 mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-edge bg-panel/95 shadow-2xl shadow-black/70 backdrop-blur-2xl sm:right-auto sm:left-[280px] sm:max-w-sm">
      <header className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Up next in the queue
          </p>
          <p className="font-display text-lg font-extrabold text-white">
            {queue.length} track{queue.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close queue"
        >
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-2">
        {current ? (
          <div className="mb-3 rounded-2xl bg-white/[0.06] p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              On the speakers
            </p>
            <div className="flex items-center gap-3">
              <Artwork
                seed={current.artworkSeed}
                language={current.language}
                title={current.title}
                videoId={current.videoId}
                size={44}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{current.title}</p>
                <p className="truncate text-xs text-zinc-400">{current.artist}</p>
              </div>
              <span className="ml-auto text-orange-300">
                <Equalizer playing />
              </span>
            </div>
          </div>
        ) : null}

        {upNext.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-500">
            End of the queue — start a station or hit repeat.
          </p>
        ) : (
          upNext.map((song, offset) => {
            const absoluteIndex = currentIndex + 1 + offset;
            return (
              <button
                key={`${song.id}-${absoluteIndex}`}
                type="button"
                onClick={() => playQueue(queue, absoluteIndex)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/10"
              >
                <span className="w-5 text-center text-[11px] tabular-nums text-zinc-600">
                  {offset + 1}
                </span>
                <Artwork
                  seed={song.artworkSeed}
                  language={song.language}
                  title={song.title}
                  videoId={song.videoId}
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{song.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{song.artist}</span>
                </span>
                <span className="text-[11px] tabular-nums text-zinc-500">
                  {formatTime(song.durationSec)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export function PlayerBar() {
  const {
    current,
    isPlaying,
    progress,
    duration,
    toggle,
    next,
    prev,
    seek,
    volume,
    muted,
    setVolume,
    toggleMute,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    audioError,
    status,
    watchUrl,
    retryResolve,
    toggleVideo,
    videoOpen,
    videoTitle,
    videoChannel,
  } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const theme = LANGUAGE_THEME[current?.language ?? "punjabi"] ?? LANGUAGE_THEME.punjabi;
  const percent = duration > 0 ? (progress / duration) * 100 : 0;
  const busy = status === "resolving" || status === "loading" || status === "starting";

  return (
    <>
      {queueOpen ? <QueuePanel onClose={() => setQueueOpen(false)} /> : null}

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-panel/85 backdrop-blur-2xl">
        <div
          className="pointer-events-none absolute inset-x-0 -top-px h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${theme.ring}, transparent)` }}
        />

        {audioError ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-rose-400/20 bg-rose-500/15 px-4 py-1.5 text-[11px] text-rose-100">
            <span className="font-semibold">{audioError}</span>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={retryResolve}
                className="rounded-full bg-white/15 px-2.5 py-1 font-bold text-white transition hover:bg-white/25"
              >
                Try another source
              </button>
              {watchUrl ? (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full bg-white px-2.5 py-1 font-bold text-black transition hover:bg-zinc-200"
                >
                  Open on YouTube
                </a>
              ) : null}
            </span>
          </div>
        ) : null}

        <div className="mx-auto flex h-[92px] max-w-[1800px] items-center gap-3 px-3 sm:gap-5 sm:px-5">
          {/* now playing */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-[26%] sm:flex-none">
            {current ? (
              <>
                <Artwork
                  seed={current.artworkSeed}
                  language={current.language}
                  title={current.title}
                  videoId={current.videoId}
                  size={56}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{current.title}</p>
                  <p className="truncate text-xs text-zinc-400">{current.artist}</p>
                  {busy ? (
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                      {status === "resolving" ? "loading full song…" : "buffering…"}
                    </p>
                  ) : videoChannel ? (
                    <p className="truncate text-[10px] text-zinc-600" title={videoTitle ?? undefined}>
                      full song · {videoChannel}
                    </p>
                  ) : null}
                </div>
                <span className="hidden sm:block">
                  <LikeControl />
                </span>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-xl border border-edge bg-white/5 text-zinc-600">
                  <Icon name="disc" size={22} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-300">Nothing playing</p>
                  <p className="truncate text-xs text-zinc-500">
                    Pick any song — full track, no login
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* transport */}
          <div className="flex flex-[1.4] flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={toggleShuffle}
                title="Shuffle"
                className={`hidden h-8 w-8 place-items-center rounded-full transition hover:bg-white/10 sm:grid ${
                  shuffle ? "text-orange-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon name="shuffle" size={16} />
              </button>
              <button
                type="button"
                onClick={prev}
                title="Previous"
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-200 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="prev" size={18} />
              </button>
              <button
                type="button"
                onClick={toggle}
                title={isPlaying ? "Pause (space)" : "Play (space)"}
                className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.22)] transition hover:scale-[1.06] active:scale-95"
              >
                {busy && !isPlaying ? (
                  <span className="absolute inset-0 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : null}
                <Icon name={isPlaying ? "pause" : "play"} size={22} />
              </button>
              <button
                type="button"
                onClick={next}
                title="Next"
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-200 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="next" size={18} />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                title={`Repeat: ${repeat}`}
                className={`relative hidden h-8 w-8 place-items-center rounded-full transition hover:bg-white/10 sm:grid ${
                  repeat === "off" ? "text-zinc-400 hover:text-white" : "text-orange-300"
                }`}
              >
                <Icon name={repeat === "one" ? "repeatOne" : "repeat"} size={16} />
              </button>
            </div>

            <div className="flex w-full items-center gap-2">
              <span className="w-9 text-right text-[10px] tabular-nums text-zinc-500">
                {formatTime(progress)}
              </span>
              <input
                className="seek h-5 flex-1"
                type="range"
                min={0}
                max={duration || 1}
                step={0.5}
                value={Math.min(progress, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                style={sliderStyle(percent, theme.from)}
                aria-label="Seek"
                disabled={!current}
              />
              <span className="w-9 text-[10px] tabular-nums text-zinc-500">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* right controls */}
          <div className="hidden w-[26%] items-center justify-end gap-2 sm:flex">
            <span
              className="mr-1 hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300 lg:flex"
              title="Streaming as a guest — nothing to sign into"
            >
              <Icon name="user" size={12} /> guest · full songs
            </span>
            <button
              type="button"
              onClick={toggleVideo}
              title={videoOpen ? "Shrink video" : "Show video"}
              className={`grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10 ${
                videoOpen ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon name="grid" size={16} />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              title="Mute (m)"
              className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <Icon
                name={muted || volume === 0 ? "volumeMute" : volume < 0.45 ? "volumeLow" : "volume"}
                size={17}
              />
            </button>
            <input
              className="seek h-5 w-24"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              style={sliderStyle((muted ? 0 : volume) * 100, "#e4e4e7")}
              aria-label="Volume"
            />
            <button
              type="button"
              onClick={() => setQueueOpen((open) => !open)}
              title="Queue"
              className={`grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10 ${
                queueOpen ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon name="queue" size={17} />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}

function LikeControl() {
  const { current, isLiked, toggleLike } = usePlayer();
  if (!current) return null;
  const liked = isLiked(current.id);
  return (
    <button
      type="button"
      onClick={() => toggleLike(current)}
      title={liked ? "Unlike" : "Like"}
      className={`grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/10 ${
        liked ? "text-rose-400" : "text-zinc-400 hover:text-white"
      }`}
    >
      <Icon name={liked ? "heartFilled" : "heart"} size={18} />
    </button>
  );
}
