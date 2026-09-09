"use client";

/**
 * Thin wrapper around the YouTube IFrame Player API.
 *
 * Every song in the catalogue is resolved to a real YouTube video (official
 * audio / music video), so playback is the complete song with real vocals —
 * streamed through YouTube's own embed, no login and no API key.
 */

declare global {
  interface Window {
    _iosAudioBridge?: HTMLAudioElement;
  }
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        apiPromise = null;
        if (!settled) {
          settled = true;
          reject(new Error("YouTube player script blocked"));
        }
      };
      document.head.appendChild(tag);
    }

    window.setTimeout(() => {
      if (window.YT?.Player) finish();
      else if (!settled) {
        settled = true;
        apiPromise = null;
        reject(new Error("YouTube player timed out"));
      }
    }, 10_000);
  });

  return apiPromise;
}

export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface YtHandlers {
  onReady: () => void;
  onState: (state: number) => void;
  onError: (code: number) => void;
  onDuration: (seconds: number) => void;
}

export interface YtHandles {
  load: (videoId: string, autoplay: boolean) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (zeroToOne: number) => void;
  setMuted: (muted: boolean) => void;
  getTime: () => number;
  getDuration: () => number;
  getState: () => number;
  destroy: () => void;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function createYtPlayer(
  host: HTMLElement,
  handlers: YtHandlers,
): Promise<YtHandles> {
  await loadYouTubeApi();
  const YT = window.YT;
  if (!YT?.Player) throw new Error("YouTube API unavailable");
// Native Audio Bridge to trick iOS MediaSession
  if (typeof window !== "undefined" && !window._iosAudioBridge) {
    const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
    audio.loop = true;
    window._iosAudioBridge = audio;
  }
  const player = new YT.Player(host, {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      iv_load_policy: 3,
      fs: 0,
      origin: window.location.origin,
    },
    events: {
      onReady: () => {
        handlers.onReady();
        handlers.onDuration(safe(() => player.getDuration(), 0));
      },
      onStateChange: (event) => {
        handlers.onState(event.data);
        if (event.data === YT_STATE.PLAYING || event.data === YT_STATE.CUED) {
          handlers.onDuration(safe(() => player.getDuration(), 0));
        }
      },
      onError: (event) => handlers.onError(event.data),
    },
  });

  return {
    load: (videoId, autoplay) => {
      safe(() => {
        if (autoplay) player.loadVideoById(videoId);
        else player.cueVideoById(videoId);
      }, undefined);
    },
    play: () => safe(() => {
      if (window._iosAudioBridge) {
        window._iosAudioBridge.play().catch(() => {});
      }
      return player.playVideo();
    }, undefined),
    pause: () => safe(() => player.pauseVideo(), undefined),
    seek: (seconds) => safe(() => player.seekTo(seconds, true), undefined),
    setVolume: (zeroToOne) =>
      safe(() => player.setVolume(Math.round(Math.max(0, Math.min(1, zeroToOne)) * 100)), undefined),
    setMuted: (muted) => safe(() => (muted ? player.mute() : player.unMute()), undefined),
    getTime: () => safe(() => player.getCurrentTime(), 0),
    getDuration: () => safe(() => player.getDuration(), 0),
    getState: () => safe(() => player.getPlayerState(), -1),
    destroy: () => safe(() => player.destroy(), undefined),
  };
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeSearchUrl(title: string, artist: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title} song`)}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
