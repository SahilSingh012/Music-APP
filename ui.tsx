"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { LANGUAGE_LABEL, LANGUAGE_THEME } from "@/lib/format";

export type IconName =
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "shuffle"
  | "repeat"
  | "repeatOne"
  | "heart"
  | "heartFilled"
  | "search"
  | "plus"
  | "queue"
  | "volume"
  | "volumeLow"
  | "volumeMute"
  | "home"
  | "trending"
  | "clock"
  | "disc"
  | "trash"
  | "dots"
  | "chevronLeft"
  | "chevronRight"
  | "check"
  | "close"
  | "spark"
  | "lock"
  | "user"
  | "grid";

const PATHS: Record<IconName, ReactNode> = {
  play: <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />,
  pause: <path d="M7 4h3.2v16H7zm6.8 0H17v16h-3.2z" />,
  next: <path d="M6 5.2v13.6a1 1 0 0 0 1.53.85l9.1-5.42V19a1 1 0 0 0 2 0V5a1 1 0 0 0-2 0v4.77L7.53 4.35A1 1 0 0 0 6 5.2Z" />,
  prev: <path d="M18 5.2v13.6a1 1 0 0 1-1.53.85l-9.1-5.42V19a1 1 0 0 1-2 0V5a1 1 0 0 1 2 0v4.77l9.1-5.42A1 1 0 0 1 18 5.2Z" />,
  shuffle: (
    <path d="M17 4h4v4h-2V7.41l-3.3 3.3-1.41-1.42L17.59 6H17V4ZM4 6h4.5l6.2 6.2-1.41 1.42L8.91 9.24V10H7V8H4V6Zm14.71 8.29L17.59 15.4 16 13.82l-1.41 1.41L16.17 16.8 13 20h4v-4h-.59l-.7-.71ZM4 16h3v-2h2v.76l3.29-3.29 1.42 1.42L9.5 17.09V18H7v2H4v-4Z" />
  ),
  repeat: (
    <path d="M7 7h9v2.5L20 6l-4-3.5V5H5v6h2V7Zm10 10H8v-2.5L4 18l4 3.5V19h11v-6h-2v4Z" />
  ),
  repeatOne: (
    <path d="M7 7h9v2.5L20 6l-4-3.5V5H5v6h2V7Zm10 10H8v-2.5L4 18l4 3.5V19h11v-6h-2v4Zm-5-8h1.6v6H12v-4.3l-1.2.8V10.2l1.2-.7Z" />
  ),
  heart: (
    <path
      d="M12 20.5 4.6 13.4a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 1 1 6.5 6.5L12 20.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  ),
  heartFilled: <path d="M12 20.7 4.5 13.5a4.7 4.7 0 0 1 6.6-6.7l.9.9.9-.9a4.7 4.7 0 1 1 6.6 6.7L12 20.7Z" />,
  search: (
    <path
      d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5.2 12.6L20 20.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />,
  queue: <path d="M4 6h12v2H4V6Zm0 5h12v2H4v-2Zm0 5h8v2H4v-2Zm13-9h3v2h-3V7Zm0 4h3v2h-3v-2Zm0 4h3v2h-3v-2Z" />,
  volume: (
    <path d="M4 9v6h3.5L13 20V4L7.5 9H4Zm11.5-.5a5.5 5.5 0 0 1 0 7M18 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  volumeLow: (
    <path d="M4 9v6h3.5L13 20V4L7.5 9H4Zm11.5-.5a5.5 5.5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  volumeMute: (
    <path d="M4 9v6h3.5L13 20V4L7.5 9H4Zm13 .5 3 3m0-3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  home: <path d="M12 3.6 4 10v10h5v-6h6v6h5V10l-8-6.4Z" />,
  trending: (
    <path d="M4 16.5 9.2 11l3.1 3.1L20 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  clock: (
    <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.9 4v4.4l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  ),
  disc: (
    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
  ),
  trash: (
    <path d="M9 4h6l1 2h3v2H5V6h3l1-2Zm-2 5h10l-.8 11H7.8L7 9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  dots: <path d="M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />,
  chevronLeft: <path d="M14.5 5 8 12l6.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="M9.5 5 16 12l-6.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  check: <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  spark: <path d="M12 3.2 13.9 9 20 11l-6.1 2L12 18.8 10.1 13 4 11l6.1-2L12 3.2Z" />,
  lock: (
    <path d="M7 10V8a5 5 0 0 1 10 0v2M5.5 10h13v10h-13V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  ),
  user: (
    <path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 16c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  ),
  grid: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
};

export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

function monogram(title: string): string {
  const words = title.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "♪";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Cover art: the real YouTube thumbnail of the resolved song when we have one,
 * otherwise a deterministic generated gradient tile (never a broken image).
 */
export function Artwork({
  seed,
  language,
  title,
  size = 56,
  rounded = "rounded-xl",
  className = "",
  playing = false,
  variant = "tile",
  videoId = null,
}: {
  seed: number;
  language: string;
  title: string;
  size?: number;
  rounded?: string;
  className?: string;
  playing?: boolean;
  variant?: "tile" | "disc";
  videoId?: string | null;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumbnail =
    variant === "tile" && videoId && !thumbFailed
      ? `https://i.ytimg.com/vi/${videoId}/${size >= 140 ? "hqdefault" : "mqdefault"}.jpg`
      : null;
  const theme = LANGUAGE_THEME[language] ?? LANGUAGE_THEME.hindi;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `linear-gradient(${135 + (seed % 60)}deg, ${theme.from}, ${theme.via} 52%, ${theme.to})`,
    filter: `hue-rotate(${(seed % 70) - 35}deg) saturate(${1 + (seed % 30) / 100})`,
  };

  if (variant === "disc") {
    return (
      <div
        className={`relative shrink-0 overflow-hidden ${rounded} ${className}`}
        style={style}
        aria-hidden="true"
      >
        <div
          className="absolute inset-[14%] rounded-full border border-white/25"
          style={{
            background:
              "repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.55) 0 2px, rgba(0,0,0,0.2) 2px 4px)",
          }}
        />
        <div
          className={`absolute inset-[38%] rounded-full bg-white/85 ${playing ? "animate-spin-slow" : ""}`}
          style={{ animationPlayState: playing ? "running" : "paused" }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden ${rounded} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setThumbFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                "radial-gradient(circle at 22% 18%, rgba(255,255,255,0.55), transparent 42%), radial-gradient(circle at 82% 88%, rgba(0,0,0,0.5), transparent 48%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 7px)",
            }}
          />
          <span
            className="relative font-display font-extrabold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            style={{ fontSize: Math.max(11, size * 0.3) }}
          >
            {monogram(title)}
          </span>
        </>
      )}
    </div>
  );
}

export function Equalizer({ playing, className = "" }: { playing: boolean; className?: string }) {
  const delays = ["0ms", "180ms", "340ms", "120ms"];
  return (
    <span className={`flex h-4 items-end gap-[2px] ${className}`} aria-hidden="true">
      {delays.map((delay, i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom rounded-full bg-current ${playing ? "animate-eq" : ""}`}
          style={{
            height: "100%",
            animationDelay: delay,
            animationPlayState: playing ? "running" : "paused",
            transform: playing ? undefined : "scaleY(0.3)",
          }}
        />
      ))}
    </span>
  );
}

export function LanguageChip({
  language,
  className = "",
}: {
  language: string;
  className?: string;
}) {
  const theme = LANGUAGE_THEME[language] ?? LANGUAGE_THEME.hindi;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.chip} ${className}`}
    >
      {LANGUAGE_LABEL[language] ?? language}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
