"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ArtistDTO, OnlineTrackDTO, PlaylistDTO, SongDTO, StatsDTO } from "@/lib/types";
import { makeDeviceId, onlineTrackToSong } from "@/lib/api";
import {
  createYtPlayer,
  loadYouTubeApi,
  YT_STATE,
  youtubeSearchUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
  type YtHandles,
} from "@/components/yt-engine";
import { Icon } from "@/components/ui";
// iOS Background Audio Keep-Alive Bridge
const silentAudio = typeof window !== 'undefined' 
  ? new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==")
  : null;

if (silentAudio) {
  silentAudio.loop = true;
}

export type Route =
  | { name: "home" }
  | { name: "search"; q?: string }
  | { name: "language"; language: string }
  | { name: "trending" }
  | { name: "year"; year: number }
  | { name: "liked" }
  | { name: "recent" }
  | { name: "artist"; slug: string }
  | { name: "playlist"; id: number };

export type RepeatMode = "off" | "all" | "one";
export type PlayerStatus =
  | "idle"
  | "starting"
  | "resolving"
  | "loading"
  | "playing"
  | "paused"
  | "blocked";

const DEVICE_KEY = "dhun.deviceId";
const VOLUME_KEY = "dhun.volume";
const VIDEO_KEY = "dhun.videoOpen";

interface ResolveResponse {
  songId?: number;
  videoId?: string;
  altVideoIds?: string[];
  videoTitle?: string | null;
  videoChannel?: string | null;
  durationSec?: number;
  watchUrl?: string;
  error?: string;
  results?: ResolveResponse[];
}

interface PlayerContextValue {
  deviceId: string;
  catalog: SongDTO[];
  artists: ArtistDTO[];
  stats: StatsDTO;
  route: Route;
  navigate: (route: Route) => void;
  queue: SongDTO[];
  currentIndex: number;
  current: SongDTO | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  audioError: string | null;
  status: PlayerStatus;
  videoTitle: string | null;
  videoChannel: string | null;
  watchUrl: string | null;
  videoId: string | null;
  videoOpen: boolean;
  toggleVideo: () => void;
  retryResolve: () => void;
  playQueue: (list: SongDTO[], startIndex?: number) => void;
  playOnline: (tracks: OnlineTrackDTO[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  likedIds: number[];
  isLiked: (id: number) => boolean;
  toggleLike: (song: SongDTO) => void;
  recent: SongDTO[];
  playlists: PlaylistDTO[];
  createPlaylist: (name: string) => Promise<void>;
  addToPlaylist: (playlistId: number, song: SongDTO) => Promise<void>;
  removeFromPlaylist: (playlistId: number, songId: number) => Promise<void>;
  deletePlaylist: (playlistId: number) => Promise<void>;
  renamePlaylist: (playlistId: number, name: string) => Promise<void>;
  songsByIds: (ids: number[]) => SongDTO[];
  byArtist: (slug: string) => SongDTO[];
  artistBySlug: (slug: string) => ArtistDTO | undefined;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({
  songs,
  artists,
  stats,
  children,
}: {
  songs: SongDTO[];
  artists: ArtistDTO[];
  stats: StatsDTO;
  children: ReactNode;
}) {
  const [catalog, setCatalog] = useState<SongDTO[]>(songs);
  const [deviceId, setDeviceId] = useState("");
  const [route, setRoute] = useState<Route>({ name: "home" });

  const [queue, setQueue] = useState<SongDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [videoChannel, setVideoChannel] = useState<string | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(true);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [recent, setRecent] = useState<SongDTO[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistDTO[]>([]);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const handlesRef = useRef<YtHandles | null>(null);
  const playerPromiseRef = useRef<Promise<YtHandles> | null>(null);
  const altsRef = useRef<string[]>([]);
  const requestRef = useRef(0);
  const forceRetriedRef = useRef(false);

  const queueRef = useRef<SongDTO[]>([]);
  const indexRef = useRef(-1);
  const repeatRef = useRef<RepeatMode>("off");
  const shuffleRef = useRef(false);
  const historyRef = useRef<number[]>([]);
  const deviceIdRef = useRef("");
  const volumeRef = useRef(0.9);
  const mutedRef = useRef(false);

  queueRef.current = queue;
  indexRef.current = currentIndex;
  repeatRef.current = repeat;
  shuffleRef.current = shuffle;
  deviceIdRef.current = deviceId;
  volumeRef.current = volume;
  mutedRef.current = muted;

  const current = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  const currentRef = useRef<SongDTO | null>(null);
  currentRef.current = current;

  /* ---------------- anonymous device id: no login, ever ---------------- */
  useEffect(() => {
    let id = "";
    try {
      id = window.localStorage.getItem(DEVICE_KEY) ?? "";
      const savedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(savedVolume) && savedVolume > 0 && savedVolume <= 1) {
        setVolumeState(savedVolume);
        volumeRef.current = savedVolume;
      }
      setVideoOpen(window.localStorage.getItem(VIDEO_KEY) !== "0");
    } catch {
      id = "";
    }
    if (!id) {
      id = makeDeviceId();
      try {
        window.localStorage.setItem(DEVICE_KEY, id);
      } catch {
        /* ignore private-mode storage errors */
      }
    }
    setDeviceId(id);
    // Warm the YouTube API so the first click starts instantly.
    loadYouTubeApi().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/likes?deviceId=${encodeURIComponent(deviceId)}`).then((r) => r.json()),
      fetch(`/api/playlists?deviceId=${encodeURIComponent(deviceId)}`).then((r) => r.json()),
      fetch(`/api/plays?deviceId=${encodeURIComponent(deviceId)}`).then((r) => r.json()),
    ])
      .then(([liked, lists, plays]) => {
        if (cancelled) return;
        setLikedIds(Array.isArray(liked?.likedIds) ? liked.likedIds : []);
        setPlaylists(Array.isArray(lists?.playlists) ? lists.playlists : []);
        setRecent(Array.isArray(plays?.recent) ? plays.recent : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const applyResolution = useCallback((songId: number, data: ResolveResponse) => {
    if (!data.videoId) return;
    setCatalog((prev) =>
      prev.map((song) =>
        song.id === songId
          ? {
              ...song,
              videoId: data.videoId as string,
              altVideoIds: data.altVideoIds ?? song.altVideoIds,
              videoTitle: data.videoTitle ?? song.videoTitle,
              videoChannel: data.videoChannel ?? song.videoChannel,
              durationSec: data.durationSec && data.durationSec > 30 ? data.durationSec : song.durationSec,
            }
          : song,
      ),
    );
  }, []);

  /* ---------------- play reporting ---------------- */
  const reportPlay = useCallback((song: SongDTO | null | undefined, seconds: number) => {
    if (!song || seconds < 20) return;
    // Online-search results use negative ids and are not DB rows — don't report.
    if (song.id < 0) return;
    const did = deviceIdRef.current;
    if (!did) return;
    void fetch("/api/plays", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: did, songId: song.id, seconds: Math.floor(seconds) }),
    }).catch(() => undefined);
    setRecent((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 14));
    setCatalog((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, playCount: s.playCount + 1 } : s)),
    );
  }, []);

  /* ---------------- YouTube player singleton ---------------- */
  const ensurePlayer = useCallback((): Promise<YtHandles> => {
    if (handlesRef.current) return Promise.resolve(handlesRef.current);
    if (!playerPromiseRef.current) {
      playerPromiseRef.current = (async () => {
        const wrapper = hostRef.current;
        if (!wrapper) throw new Error("Player host missing");
        const host = document.createElement("div");
        host.style.width = "100%";
        host.style.height = "100%";
        wrapper.appendChild(host);
        const handles = await createYtPlayer(host, {
          onReady: () => {
            handlesRef.current?.setVolume(volumeRef.current);
            handlesRef.current?.setMuted(mutedRef.current);
          },
          onDuration: (seconds) => {
            if (seconds > 0) setDuration(seconds);
          },
          onState: (state) => {
            if (state === YT_STATE.PLAYING) {
              setIsPlaying(true);
              setStatus("playing");
              setAudioError(null);
            } else if (state === YT_STATE.PAUSED) {
              setIsPlaying(false);
              setStatus("paused");
            } else if (state === YT_STATE.BUFFERING) {
              setStatus("loading");
            } else if (state === YT_STATE.CUED) {
              setIsPlaying(false);
            } else if (state === YT_STATE.ENDED) {
              const song = currentRef.current;
              const handlesNow = handlesRef.current;
              reportPlay(song, handlesNow?.getDuration() || handlesNow?.getTime() || 0);
              if (repeatRef.current === "one") {
                handlesNow?.seek(0);
                handlesNow?.play();
                return;
              }
              nextRef.current();
            }
          },
          onError: (code) => {
            const song = currentRef.current;
            const handlesNow = handlesRef.current;
            const alt = altsRef.current.shift();
            if (alt && handlesNow) {
              setVideoId(alt);
              setWatchUrl(youtubeWatchUrl(alt));
              setStatus("loading");
              handlesNow.load(alt, true);
              return;
            }
            // For catalogue songs we can re-resolve against the DB; online
            // results already carry their own videoId so there's nothing to
            // re-resolve — fall through to the YouTube link.
            if (song && song.id >= 0 && !forceRetriedRef.current && handlesNow) {
              forceRetriedRef.current = true;
              void resolveAndPlay(song, true, true);
              return;
            }
            setIsPlaying(false);
            setStatus("blocked");
            setWatchUrl(song ? youtubeSearchUrl(song.title, song.artist) : null);
            setAudioError(
              code === 101 || code === 150
                ? "The label blocks embedding for this video — open it on YouTube with the button below."
                : "This video cannot be played here. Try the next track or open it on YouTube.",
            );
          },
        });
        handlesRef.current = handles;
        handles.setVolume(volumeRef.current);
        handles.setMuted(mutedRef.current);
        return handles;
      })().catch((error: unknown) => {
        playerPromiseRef.current = null;
        handlesRef.current = null;
        setStatus("blocked");
        setAudioError(
          error instanceof Error && /blocked|timed out/i.test(error.message)
            ? "YouTube's player could not load (network or ad-blocker). Refresh to retry."
            : "Playback engine failed to start. Refresh to retry.",
        );
        throw error;
      });
    }
    return playerPromiseRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPlay]);

  /* ---------------- resolve + play ---------------- */
  const resolveAndPlay = useCallback(
    async (song: SongDTO, autoplay: boolean, force = false) => {
      const requestId = requestRef.current;
      let chosenId = song.videoId ?? null;
      let alts = song.altVideoIds ?? [];

      if (!chosenId || force) {
        setStatus("resolving");
        setAudioError(null);
        const payload = await fetch("/api/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(force ? { songId: song.id, force: true } : { songId: song.id }),
        })
          .then((response) => response.json() as Promise<ResolveResponse>)
          .catch(() => null);

        if (requestRef.current !== requestId) return; // user skipped ahead

        if (payload?.videoId) {
          chosenId = payload.videoId;
          alts = payload.altVideoIds ?? [];
          setVideoTitle(payload.videoTitle ?? null);
          setVideoChannel(payload.videoChannel ?? null);
          if (payload.durationSec && payload.durationSec > 30) setDuration(payload.durationSec);
          applyResolution(song.id, payload);
        } else {
          setIsPlaying(false);
          setStatus("blocked");
          setVideoId(null);
          setWatchUrl(youtubeSearchUrl(song.title, song.artist));
          setAudioError(
            payload?.error ?? "Could not find a full-length stream for this track yet.",
          );
          return;
        }
      } else {
        setVideoTitle(song.videoTitle ?? null);
        setVideoChannel(song.videoChannel ?? null);
      }

      altsRef.current = [...alts];
      setVideoId(chosenId);
      setWatchUrl(youtubeWatchUrl(chosenId));
      setStatus("loading");
      setProgress(0);
      if (!song.videoId) setDuration(song.durationSec);

      try {
        const handles = await ensurePlayer();
        if (requestRef.current !== requestId) return;
        handles.load(chosenId, autoplay);
        if (!autoplay) {
          setIsPlaying(false);
          setStatus("paused");
        }
      } catch {
        /* ensurePlayer already surfaced the error */
      }
    },
    [applyResolution, ensurePlayer],
  );

  const resolveRef = useRef(resolveAndPlay);
  resolveRef.current = resolveAndPlay;

  /** Resolve the next couple of queue entries in the background. */
  const prefetch = useCallback(
    (list: SongDTO[], index: number) => {
      const upcoming = list.slice(index + 1, index + 3).filter((song) => !song.videoId);
      if (!upcoming.length) return;
      void fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ songIds: upcoming.map((song) => song.id) }),
      })
        .then((response) => response.json() as Promise<ResolveResponse>)
        .then((data) => {
          (data.results ?? []).forEach((result) => {
            if (result.songId != null && result.videoId) applyResolution(result.songId, result);
          });
        })
        .catch(() => undefined);
    },
    [applyResolution],
  );

  const startSong = useCallback(
    (song: SongDTO | undefined, autoplay: boolean) => {
      if (!song) return;
      requestRef.current += 1;
      forceRetriedRef.current = false;
      setAudioError(null);
      currentRef.current = song;
      void resolveRef.current(song, autoplay);
    },
    [],
  );

  const playIndex = useCallback(
    (list: SongDTO[], index: number) => {
      if (!list.length) return;
      const safeIndex = Math.max(0, Math.min(index, list.length - 1));
      reportPlay(currentRef.current, handlesRef.current?.getTime() ?? 0);
      setQueue(list);
      setCurrentIndex(safeIndex);
      startSong(list[safeIndex], true);
      prefetch(list, safeIndex);
    },
    [prefetch, reportPlay, startSong],
  );

  const playQueue = useCallback(
    (list: SongDTO[], startIndex = 0) => {
      historyRef.current = [];
      playIndex(list, startIndex);
    },
    [playIndex],
  );

  /** Play songs found via live online search (they already carry a videoId). */
  const playOnline = useCallback(
    (tracks: OnlineTrackDTO[], startIndex = 0) => {
      if (!tracks.length) return;
      historyRef.current = [];
      playIndex(tracks.map(onlineTrackToSong), startIndex);
    },
    [playIndex],
  );

  const next = useCallback(() => {
    const list = queueRef.current;
    if (!list.length) return;
    reportPlay(currentRef.current, handlesRef.current?.getTime() ?? 0);

    if (shuffleRef.current && list.length > 1) {
      historyRef.current.push(indexRef.current);
      let pick = indexRef.current;
      let guard = 0;
      while (pick === indexRef.current && guard < 12) {
        pick = Math.floor(Math.random() * list.length);
        guard += 1;
      }
      setCurrentIndex(pick);
      startSong(list[pick], true);
      prefetch(list, pick);
      return;
    }

    const following = indexRef.current + 1;
    if (following < list.length) {
      setCurrentIndex(following);
      startSong(list[following], true);
      prefetch(list, following);
      return;
    }
    if (repeatRef.current === "all") {
      setCurrentIndex(0);
      startSong(list[0], true);
      return;
    }
    setIsPlaying(false);
    setStatus("paused");
    setProgress(0);
    handlesRef.current?.pause();
  }, [prefetch, reportPlay, startSong]);

  const nextRef = useRef(next);
  nextRef.current = next;

  const prev = useCallback(() => {
    const list = queueRef.current;
    const handles = handlesRef.current;
    if (!list.length) return;
    if (handles && handles.getTime() > 4) {
      handles.seek(0);
      setProgress(0);
      return;
    }
    const fromHistory = historyRef.current.pop();
    const target =
      shuffleRef.current && fromHistory != null
        ? fromHistory
        : indexRef.current - 1 < 0
          ? repeatRef.current === "all"
            ? list.length - 1
            : 0
          : indexRef.current - 1;
    setCurrentIndex(target);
    startSong(list[target], true);
  }, [startSong]);

  const toggle = useCallback(() => {
    const handles = handlesRef.current;
    if (!currentRef.current) {
      const list = queueRef.current.length ? queueRef.current : catalog;
      if (!list.length) return;
      historyRef.current = [];
      setQueue(list);
      setCurrentIndex(Math.max(0, indexRef.current));
      startSong(list[Math.max(0, indexRef.current)], true);
      prefetch(list, Math.max(0, indexRef.current));
      return;
    }
    if (handles && handles.getState() === YT_STATE.PLAYING) {
      handles.pause();
      setIsPlaying(false);
      setStatus("paused");
      return;
    }
    if (handles && videoId) {
      setAudioError(null);
      if (silentAudio){
        silentAudio.play().catch(() => {});
      }
      handles.play();
      return;
    }
    startSong(currentRef.current, true);
  }, [catalog, prefetch, startSong, videoId]);

  const retryResolve = useCallback(() => {
    const song = currentRef.current;
    if (!song) return;
    requestRef.current += 1;
    forceRetriedRef.current = true;
    // Online results can't be re-resolved from the DB — just reload the video.
    void resolveRef.current(song, true, song.id >= 0);
  }, []);

  const seek = useCallback((seconds: number) => {
    const handles = handlesRef.current;
    if (!handles) return;
    const clamped = Math.max(0, seconds);
    handles.seek(clamped);
    setProgress(clamped);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    handlesRef.current?.setVolume(clamped);
    if (clamped > 0) handlesRef.current?.setMuted(false);
    setVolumeState(clamped);
    volumeRef.current = clamped;
    setMuted(clamped === 0);
    mutedRef.current = clamped === 0;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    handlesRef.current?.setMuted(nextMuted);
    setMuted(nextMuted);
    mutedRef.current = nextMuted;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    [],
  );
  const navigate = useCallback((target: Route) => {
    setRoute(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoOpen((open) => {
      try {
        window.localStorage.setItem(VIDEO_KEY, open ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !open;
    });
  }, []);

  /* ---------------- progress polling ---------------- */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const handles = handlesRef.current;
      if (!handles) return;
      const state = handles.getState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        setProgress(handles.getTime());
        const total = handles.getDuration();
        if (total > 0) setDuration(total);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  /* ---------------- likes / playlists ---------------- */
  const isLiked = useCallback((id: number) => likedIds.includes(id), [likedIds]);

  const toggleLike = useCallback(
    (song: SongDTO) => {
      const did = deviceIdRef.current;
      if (!did) return;
      const already = likedIds.includes(song.id);
      setLikedIds((prev) => (already ? prev.filter((id) => id !== song.id) : [...prev, song.id]));
      setCatalog((prev) =>
        prev.map((s) =>
          s.id === song.id ? { ...s, likeCount: Math.max(0, s.likeCount + (already ? -1 : 1)) } : s,
        ),
      );
      void fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: did, songId: song.id }),
      }).catch(() => undefined);
    },
    [likedIds],
  );

  const createPlaylist = useCallback(async (name: string) => {
    const did = deviceIdRef.current;
    if (!did) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: did, name }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { playlist?: PlaylistDTO } | null;
    if (data?.playlist) setPlaylists((prev) => [data.playlist as PlaylistDTO, ...prev]);
  }, []);

  const addToPlaylist = useCallback(async (playlistId: number, song: SongDTO) => {
    const did = deviceIdRef.current;
    if (!did) return;
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: did, songId: song.id }),
    }).catch(() => null);
    if (res?.ok) {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId && !p.songIds.includes(song.id)
            ? { ...p, songIds: [...p.songIds, song.id] }
            : p,
        ),
      );
    }
  }, []);

  const removeFromPlaylist = useCallback(async (playlistId: number, songId: number) => {
    const did = deviceIdRef.current;
    if (!did) return;
    const res = await fetch(
      `/api/playlists/${playlistId}?deviceId=${encodeURIComponent(did)}&songId=${songId}`,
      { method: "DELETE" },
    ).catch(() => null);
    if (res?.ok) {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, songIds: p.songIds.filter((id) => id !== songId) } : p,
        ),
      );
    }
  }, []);

  const deletePlaylist = useCallback(async (playlistId: number) => {
    const did = deviceIdRef.current;
    if (!did) return;
    const res = await fetch(`/api/playlists/${playlistId}?deviceId=${encodeURIComponent(did)}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const renamePlaylist = useCallback(async (playlistId: number, name: string) => {
    const did = deviceIdRef.current;
    if (!did) return;
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: did, name }),
    }).catch(() => null);
    if (res?.ok) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name } : p)));
    }
  }, []);

  const songsByIds = useCallback(
    (ids: number[]) => {
      const map = new Map(catalog.map((s) => [s.id, s]));
      return ids.map((id) => map.get(id)).filter((s): s is SongDTO => Boolean(s));
    },
    [catalog],
  );

  const byArtist = useCallback((slug: string) => catalog.filter((s) => s.artistSlug === slug), [catalog]);
  const artistBySlug = useCallback((slug: string) => artists.find((a) => a.slug === slug), [artists]);

  /* ---------------- niceties ---------------- */
  useEffect(() => {
    if (!current) return;
    const previous = document.title;
    document.title = `${current.title} · ${current.artist} — RanaSongs`;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album ?? "RanaSongs",
        artwork: videoId
          ? [
              { src: youtubeThumbnailUrl(videoId), sizes: "320x180", type: "image/jpeg" },
              { src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, sizes: "480x360", type: "image/jpeg" },
            ]
          : [],
      });
      navigator.mediaSession.setActionHandler("play", () => toggle());
      navigator.mediaSession.setActionHandler("pause", () => toggle());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
      try {
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (typeof details.seekTime === "number") seek(details.seekTime);
        });
      } catch {
        /* older browsers */
      }
    }
    return () => {
      document.title = previous;
    };
  }, [current, next, prev, seek, toggle, videoId]);

  /* Keep the OS/lock-screen controls in sync with playback + position. */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : current ? "paused" : "none";
    if (current && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(progress, duration),
        });
      } catch {
        /* setPositionState not supported */
      }
    }
  }, [current, duration, isPlaying, progress]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.code === "ArrowRight" && event.shiftKey) {
        next();
      } else if (event.code === "ArrowLeft" && event.shiftKey) {
        prev();
      } else if (event.key.toLowerCase() === "m") {
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggle, toggleMute]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      deviceId,
      catalog,
      artists,
      stats,
      route,
      navigate,
      queue,
      currentIndex,
      current,
      isPlaying,
      progress,
      duration: duration || current?.durationSec || 0,
      volume,
      muted,
      shuffle,
      repeat,
      audioError,
      status,
      videoTitle,
      videoChannel,
      watchUrl,
      videoId,
      videoOpen,
      toggleVideo,
      retryResolve,
      playQueue,
      playOnline,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      likedIds,
      isLiked,
      toggleLike,
      recent,
      playlists,
      createPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      deletePlaylist,
      renamePlaylist,
      songsByIds,
      byArtist,
      artistBySlug,
    }),
    [
      deviceId,
      catalog,
      artists,
      stats,
      route,
      navigate,
      queue,
      currentIndex,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      audioError,
      status,
      videoTitle,
      videoChannel,
      watchUrl,
      videoId,
      videoOpen,
      toggleVideo,
      retryResolve,
      playQueue,
      playOnline,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      likedIds,
      isLiked,
      toggleLike,
      recent,
      playlists,
      createPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      deletePlaylist,
      renamePlaylist,
      songsByIds,
      byArtist,
      artistBySlug,
    ],
  );

  const statusLabel =
    status === "resolving"
      ? "Finding the full song…"
      : status === "loading"
        ? "Buffering…"
        : status === "blocked"
          ? "Stream unavailable"
          : null;

  return (
    <PlayerContext.Provider value={value}>
      {children}

      {/* Persistent YouTube host — never unmounted, so playback survives route changes. */}
      <div
        className={`fixed z-40 overflow-hidden rounded-2xl border border-white/15 bg-black/90 shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 ${
          videoOpen
            ? "bottom-[104px] right-3 w-[min(420px,calc(100vw-1.5rem))]"
            : "bottom-[104px] right-3 w-[176px]"
        } ${current ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ visibility: current ? "visible" : "hidden" }}
      >
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
            <span className="text-rose-400">
              <Icon name="play" size={10} />
            </span>
            <span className="truncate">
              {statusLabel ?? (videoOpen ? "Full song · YouTube" : "Now playing")}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer noopener"
                title="Open on YouTube"
                className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="chevronRight" size={12} />
              </a>
            ) : null}
            <button
              type="button"
              onClick={toggleVideo}
              title={videoOpen ? "Mini player" : "Expand video"}
              className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name={videoOpen ? "close" : "grid"} size={12} />
            </button>
          </div>
        </div>
        <div className={videoOpen ? "aspect-video w-full" : "aspect-video w-full"}>
          <div ref={hostRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0" />
        </div>
      </div>
    </PlayerContext.Provider>
  );
}
