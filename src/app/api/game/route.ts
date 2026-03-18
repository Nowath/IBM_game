import { NextRequest, NextResponse } from 'next/server';
import { getTable, placePawn, movePawn, resetTable } from '@/lib/gameStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId')!;
  const tableId = Number(searchParams.get('tableId'));
  const table = getTable(roomId, tableId);
  if (!table) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(table);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { roomId, tableId, action } = body;

  if (action === 'place') {
    const ok = placePawn(roomId, tableId, body.row, body.col);
    return NextResponse.json({ ok });
  }
  if (action === 'move') {
    const ok = movePawn(roomId, tableId, body.row, body.col);
    return NextResponse.json({ ok });
  }
  if (action === 'reset') {
    resetTable(roomId, tableId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
