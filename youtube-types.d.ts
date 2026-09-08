/** Minimal ambient types for the YouTube IFrame Player API (no @types package needed). */
declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }

  namespace YT {
    const PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };

    interface PlayerEvent {
      data: number;
      target: Player;
    }

    interface PlayerOptions {
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: PlayerEvent) => void;
        onStateChange?: (event: PlayerEvent) => void;
        onError?: (event: PlayerEvent) => void;
      };
    }

    class Player {
      constructor(element: HTMLElement | string, options: PlayerOptions);
      loadVideoById(videoId: string, startSeconds?: number): void;
      cueVideoById(videoId: string, startSeconds?: number): void;
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      setVolume(volume: number): void;
      getVolume(): number;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): number;
      getVideoUrl(): string;
      destroy(): void;
      addEventListener(name: string, listener: (event: PlayerEvent) => void): void;
    }
  }
}

export {};
