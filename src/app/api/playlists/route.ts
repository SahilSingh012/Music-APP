import { NextRequest, NextResponse } from "next/server";
import { createPlaylist, listPlaylists } from "@/server/queries";
import { readDeviceId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId = readDeviceId(new URL(request.url).searchParams.get("deviceId"));
  if (!deviceId) return NextResponse.json({ playlists: [] });
  const playlists = await listPlaylists(deviceId);
  return NextResponse.json({ playlists });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { deviceId?: unknown; name?: unknown }
    | null;

  const deviceId = readDeviceId(body?.deviceId);
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const playlist = await createPlaylist(deviceId, name || "My Mix");
  if (!playlist) return NextResponse.json({ error: "Could not create playlist" }, { status: 500 });

  return NextResponse.json({ playlist });
}
