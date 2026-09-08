"use client";

import { useState } from "react";
import { NEWEST_RELEASE_YEAR } from "@/lib/catalog";
import { formatCount, LANGUAGE_LABEL } from "@/lib/format";
import { usePlayer, type Route } from "@/components/player-context";
import { Icon, type IconName } from "@/components/ui";
import { PlayerBar } from "@/components/player-bar";
import {
  ArtistView,
  HomeView,
  LanguageView,
  LikedView,
  PlaylistView,
  RecentView,
  SearchView,
  TrendingView,
  YearView,
} from "@/components/views";

function sameRoute(a: Route, b: Route): boolean {
  if (a.name !== b.name) return false;
  if (a.name === "language" && b.name === "language") return a.language === b.language;
  if (a.name === "artist" && b.name === "artist") return a.slug === b.slug;
  if (a.name === "playlist" && b.name === "playlist") return a.id === b.id;
  if (a.name === "year" && b.name === "year") return a.year === b.year;
  return true;
}

function NavItem({
  icon,
  label,
  route,
  badge,
}: {
  icon: IconName;
  label: string;
  route: Route;
  badge?: string;
}) {
  const { route: active, navigate } = usePlayer();
  const isActive = sameRoute(active, route);
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
        isActive ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <Icon name={icon} size={17} className={isActive ? "" : "text-current opacity-80"} />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
            isActive ? "bg-black/10 text-black" : "bg-white/10 text-zinc-300"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { navigate, stats, likedIds, playlists, createPlaylist, deviceId, recent, catalog } =
    usePlayer();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const freshCount = catalog.filter((song) => song.releaseYear >= NEWEST_RELEASE_YEAR).length;

  const wrap = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto scroll-thin p-4">
      <button
        type="button"
        onClick={wrap(() => navigate({ name: "home" }))}
        className="flex items-center gap-2.5 px-1"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-saffron via-magenta to-royal text-white shadow-lg">
          <Icon name="disc" size={20} />
        </span>
        <span className="text-left">
          <span className="block font-display text-xl font-extrabold leading-none tracking-tight text-white">
            RanaSongs
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            punjabi · haryanvi · hindi
          </span>
        </span>
      </button>

      <nav className="space-y-1">
        <NavItem icon="home" label="Home" route={{ name: "home" }} />
        <NavItem icon="search" label="Search" route={{ name: "search" }} />
        <NavItem
          icon="spark"
          label={`New in ${NEWEST_RELEASE_YEAR}`}
          route={{ name: "year", year: NEWEST_RELEASE_YEAR }}
          badge={String(freshCount)}
        />
        <NavItem icon="trending" label="Trending chart" route={{ name: "trending" }} badge={String(stats.totalSongs)} />
      </nav>

      <div>
        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
          languages
        </p>
        <nav className="space-y-1">
          <NavItem
            icon="spark"
            label={LANGUAGE_LABEL.punjabi}
            route={{ name: "language", language: "punjabi" }}
            badge={String(stats.byLanguage.punjabi ?? 0)}
          />
          <NavItem
            icon="spark"
            label={LANGUAGE_LABEL.haryanvi}
            route={{ name: "language", language: "haryanvi" }}
            badge={String(stats.byLanguage.haryanvi ?? 0)}
          />
          <NavItem
            icon="spark"
            label={LANGUAGE_LABEL.hindi}
            route={{ name: "language", language: "hindi" }}
            badge={String(stats.byLanguage.hindi ?? 0)}
          />
        </nav>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
          your library
        </p>
        <nav className="space-y-1">
          <NavItem icon="heart" label="Liked songs" route={{ name: "liked" }} badge={String(likedIds.length)} />
          <NavItem icon="clock" label="Recently played" route={{ name: "recent" }} badge={String(recent.length)} />
          {playlists.map((playlist) => (
            <NavItem
              key={playlist.id}
              icon="queue"
              label={playlist.name}
              route={{ name: "playlist", id: playlist.id }}
              badge={String(playlist.songIds.length)}
            />
          ))}
        </nav>

        <div className="mt-2 px-3">
          {creating ? (
            <form
              className="flex gap-1"
              onSubmit={async (event) => {
                event.preventDefault();
                const name = newName.trim();
                if (!name) return;
                await createPlaylist(name);
                setNewName("");
                setCreating(false);
              }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Playlist name"
                className="min-w-0 flex-1 rounded-lg border border-edge bg-black/50 px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-saffron/70"
              />
              <button type="submit" className="rounded-lg bg-white px-2 py-1.5 text-xs font-black text-black">
                Add
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border border-edge px-2 text-xs text-zinc-400"
              >
                <Icon name="close" size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-edge px-3 py-2 text-xs font-bold text-zinc-400 transition hover:border-white/30 hover:text-white"
            >
              <Icon name="plus" size={14} /> New playlist
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("ranasongs:open-install"))}
          className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/10"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-saffron via-magenta to-royal text-white">
            <Icon name="plus" size={15} />
          </span>
          <span className="flex-1 text-left">Install app</span>
          <span className="text-zinc-500">
            <Icon name="chevronRight" size={16} />
          </span>
        </button>
      </div>

      <div className="mt-auto space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3.5">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
          <Icon name="user" size={13} /> guest session
        </p>
        <p className="text-xs leading-relaxed text-zinc-300">
          No account, no email, no paywall. Your likes and playlists are tied to this browser
          {deviceId ? <span className="text-zinc-500"> · {deviceId.slice(0, 14)}…</span> : null}.
        </p>
        <p className="text-[11px] font-bold text-emerald-300/80">
          {formatCount(stats.totalPlays)} plays streamed so far
        </p>
      </div>
    </div>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { navigate, catalog } = usePlayer();
  const [term, setTerm] = useState("");

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-edge/70 bg-stage/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge text-zinc-300 transition hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="grid" size={16} />
        </button>

        <button
          type="button"
          onClick={() => navigate({ name: "home" })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge text-zinc-400 transition hover:text-white"
          aria-label="Home"
        >
          <Icon name="chevronLeft" size={16} />
        </button>

        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ name: "search", q: term });
          }}
        >
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
            <Icon name="search" size={16} />
          </span>
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={`Search ${catalog.length} songs, artists, moods…`}
            className="w-full rounded-full border border-edge bg-black/45 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-saffron/70 focus:bg-black/70"
          />
        </form>

        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 md:flex">
          <Icon name="check" size={12} /> no login required
        </span>
      </div>
    </header>
  );
}

export function Shell() {
  const { route } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);

  let view: React.ReactNode;
  switch (route.name) {
    case "search":
      view = <SearchView initialQuery={route.q} />;
      break;
    case "language":
      view = <LanguageView key={route.language} language={route.language} />;
      break;
    case "trending":
      view = <TrendingView />;
      break;
    case "year":
      view = <YearView key={route.year} year={route.year} />;
      break;
    case "liked":
      view = <LikedView />;
      break;
    case "recent":
      view = <RecentView />;
      break;
    case "artist":
      view = <ArtistView key={route.slug} slug={route.slug} />;
      break;
    case "playlist":
      view = <PlaylistView key={route.id} id={route.id} />;
      break;
    default:
      view = <HomeView />;
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-edge/70 bg-panel/60 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-edge bg-panel shadow-2xl">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="px-4 pb-[116px] pt-4 sm:px-6 lg:ml-[264px]">
        <div className="mx-auto max-w-[1500px]">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          {view}
          <footer className="mt-16 border-t border-edge/70 pt-6 text-xs leading-relaxed text-zinc-600">
            <p className="max-w-3xl">
              RanaSongs is an open library — no sign-up, no login, no paywall. Every track plays the{" "}
              <span className="text-zinc-400">complete song</span> (official audio or music video)
              streamed through YouTube&apos;s own embed player, resolved on demand and cached in the
              database so the next play is instant. If a label blocks embedding for a specific video,
              the player automatically falls back to an alternative upload or hands you a one-click
              link to YouTube. Search anything — if a song is not in the library, RanaSongs finds it
              online and plays it instantly.
            </p>
            <p className="mt-2">
              Keyboard: <span className="text-zinc-400">space</span> play/pause ·{" "}
              <span className="text-zinc-400">shift + ←/→</span> previous/next ·{" "}
              <span className="text-zinc-400">m</span> mute
            </p>
            <p className="mt-2">
              <span className="text-zinc-400">Install on your phone:</span> tap the install prompt (or
              your browser menu → &ldquo;Add to Home Screen&rdquo;) to open RanaSongs fullscreen with
              lock-screen controls. Note: because tracks stream from YouTube&apos;s embedded player,
              phones may pause audio when the screen is locked — a limitation YouTube applies to all
              embeds.
            </p>
          </footer>
        </div>
      </main>

      <PlayerBar />
    </div>
  );
}


