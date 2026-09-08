import { NextRequest, NextResponse } from "next/server";
import {
  addSongToPlaylist,
  deletePlaylist,
  removeSongFromPlaylist,
  renamePlaylist,
} from "@/server/queries";
import { readDeviceId } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function playlistId(context: Params): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Add a song to the playlist. */
export async function POST(request: NextRequest, context: Params) {
  const id = await playlistId(context);
  const body = (await request.json().catch(() => null)) as
    | { deviceId?: unknown; songId?: unknown }
    | null;

  const deviceId = readDeviceId(body?.deviceId);
  const songId = Number(body?.songId);

  if (!id || !deviceId || !Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ok = await addSongToPlaylist(deviceId, id, songId);
  if (!ok) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Rename the playlist. */
export async function PATCH(request: NextRequest, context: Params) {
  const id = await playlistId(context);
  const body = (await request.json().catch(() => null)) as
    | { deviceId?: unknown; name?: unknown }
    | null;

  const deviceId = readDeviceId(body?.deviceId);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!id || !deviceId || !name) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ok = await renamePlaylist(deviceId, id, name);
  if (!ok) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/**
 * Delete the whole playlist, or just one song from it when `songId` is present.
 */
export async function DELETE(request: NextRequest, context: Params) {
  const id = await playlistId(context);
  const params = new URL(request.url).searchParams;
  const deviceId = readDeviceId(params.get("deviceId"));
  const songIdParam = params.get("songId");

  if (!id || !deviceId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (songIdParam != null) {
    const songId = Number(songIdParam);
    if (!Number.isInteger(songId) || songId <= 0) {
      return NextResponse.json({ error: "Invalid songId" }, { status: 400 });
    }
    const ok = await removeSongFromPlaylist(deviceId, id, songId);
    if (!ok) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const ok = await deletePlaylist(deviceId, id);
  if (!ok) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
