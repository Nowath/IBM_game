import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getRoomSnapshot, joinRoom, startRoom, getPlayerTable } from '@/lib/gameStore';

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === 'start') {
    const ok = startRoom(body.roomId);
    return NextResponse.json({ ok });
  }

  const { roomId, params } = body;
  createRoom(roomId, params);
  return NextResponse.json({ roomId });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) return NextResponse.json({ error: 'missing roomId' }, { status: 400 });

  const snap = getRoomSnapshot(roomId);
  if (!snap) return NextResponse.json({ error: 'room not found' }, { status: 404 });
  return NextResponse.json(snap);
}

export async function PUT(request: NextRequest) {
  const { roomId, playerName } = await request.json();
  const ok = joinRoom(roomId, playerName);
  if (!ok) return NextResponse.json({ error: 'room not found' }, { status: 404 });

  // Check if already assigned (room may have started)
  const table = getPlayerTable(roomId, playerName);
  if (table) {
    const role = table.players[0] === playerName ? 'alice' : 'bob';
    return NextResponse.json({ tableId: table.tableId, role });
  }

  return NextResponse.json({ tableId: null, role: 'waiting' });
}
