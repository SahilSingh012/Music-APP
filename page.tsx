import { getStats, listArtists, listSongs } from "@/server/queries";
import { PlayerProvider } from "@/components/player-context";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [songs, artists, stats] = await Promise.all([listSongs(), listArtists(), getStats()]);

  return (
    <PlayerProvider songs={songs} artists={artists} stats={stats}>
      <Shell />
    </PlayerProvider>
  );
}
