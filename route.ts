import { NextRequest, NextResponse } from "next/server";
import { listSongs } from "@/server/queries";
import type { SongDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") ?? undefined;
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const mood = url.searchParams.get("mood") ?? undefined;
  const sort = url.searchParams.get("sort") ?? "newest";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 400);

  let rows: SongDTO[] = await listSongs(language ? { language } : undefined);

  if (mood) rows = rows.filter((s) => s.moods.includes(mood));
  if (q) {
    rows = rows.filter((s) =>
      [s.title, s.artist, s.album ?? "", s.genre, s.language, s.moods.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  switch (sort) {
    case "popular":
      rows.sort((a, b) => b.playCount - a.playCount);
      break;
    case "liked":
      rows.sort((a, b) => b.likeCount - a.likeCount);
      break;
    case "az":
      rows.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "oldest":
      rows.sort((a, b) => a.releaseYear - b.releaseYear);
      break;
    default:
      rows.sort((a, b) => b.releaseYear - a.releaseYear || b.playCount - a.playCount);
  }

  return NextResponse.json({ songs: rows.slice(0, limit), total: rows.length });
}
