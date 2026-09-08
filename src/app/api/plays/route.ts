import { NextRequest, NextResponse } from "next/server";
import { getRecentlyPlayed, recordPlay } from "@/server/queries";
import { readDeviceId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId = readDeviceId(new URL(request.url).searchParams.get("deviceId"));
  if (!deviceId) return NextResponse.json({ recent: [] });
  const recent = await getRecentlyPlayed(deviceId, 14);
  return NextResponse.json({ recent });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { deviceId?: unknown; songId?: unknown; seconds?: unknown }
    | null;

  const deviceId = readDeviceId(body?.deviceId);
  const songId = Number(body?.songId);
  const seconds = Number(body?.seconds) || 0;

  if (!deviceId || !Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "deviceId and songId are required" }, { status: 400 });
  }

  await recordPlay(deviceId, songId, seconds);
  return NextResponse.json({ ok: true });
}
