import { NextRequest, NextResponse } from "next/server";
import { getLikedSongIds, toggleLike } from "@/server/queries";
import { readDeviceId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId = readDeviceId(new URL(request.url).searchParams.get("deviceId"));
  if (!deviceId) return NextResponse.json({ likedIds: [] });
  const likedIds = await getLikedSongIds(deviceId);
  return NextResponse.json({ likedIds });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { deviceId?: unknown; songId?: unknown }
    | null;

  const deviceId = readDeviceId(body?.deviceId);
  const songId = Number(body?.songId);

  if (!deviceId || !Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "deviceId and songId are required" }, { status: 400 });
  }

  const result = await toggleLike(deviceId, songId);
  return NextResponse.json(result);
}
