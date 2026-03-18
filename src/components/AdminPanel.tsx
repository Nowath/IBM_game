'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { computeBoard, CellType } from '@/lib/boardCompute';

interface Props {
  onRoomCreated: (roomId: string) => void;
}

const PRESETS = [
  { label: 'Classic s=5, p=2, q=2', s: 5, p: 2, q: 2 },
  { label: 'Easy s=7, p=3, q=3', s: 7, p: 3, q: 3 },
];

function buildPreviewGrid(N: number, M: number, p: number, q: number, s: number): CellType[][] {
  const { classification } = computeBoard(N, M, p, q, s);
  return Array.from({ length: N }, (_, i) =>
    Array.from({ length: M }, (_, j) => classification.get(`${i + 1},${j + 1}`) ?? 'B')
  );
}

interface RoomSnap {
  waitingPlayers: string[];
  tables: { tableId: number; players: string[]; status: string }[];
  started: boolean;
}

export default function AdminPanel({ onRoomCreated }: Props) {
  const [roomName, setRoomName] = useState('');
  const [params, setParams] = useState({ s: 5, p: 2, q: 2, N: 5, M: 5 });
  const [preview, setPreview] = useState<CellType[][]>([]);
  const [createdId, setCreatedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [snap, setSnap] = useState<RoomSnap | null>(null);
  const [starting, setStarting] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setPreview(buildPreviewGrid(params.N, params.M, params.p, params.q, params.s));
  }, [params]);

  useEffect(() => {
    if (!createdId) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/room?roomId=${createdId}`);
      if (res.ok) setSnap(await res.json());
    }, 800);
    return () => clearInterval(id);
  }, [createdId]);

  async function handleCreate() {
    const id = roomName.trim() || `room-${Math.random().toString(36).slice(2, 7)}`;
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: id, params }),
    });
    if (res.ok) {
      setCreatedId(id);
      onRoomCreated(id);
      const url = `${window.location.origin}?join=${encodeURIComponent(id)}`;
      setJoinUrl(url);
    }
  }

  async function handleStart() {
    if (!createdId) return;
    setStarting(true);
    await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', roomId: createdId }),
    });
    setStarting(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const cellColor = (type: CellType) => {
    if (type === 'removed') return 'bg-gray-500 opacity-40';
    if (type === 'A') return 'bg-teal-400';
    return 'bg-amber-400';
  };

  const counts = preview.flat().reduce(
    (acc, c) => { acc[c] = (acc[c] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const canStart = (snap?.waitingPlayers.length ?? 0) >= 2 && !snap?.started;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold text-teal-400">⚙️ IBM Grid Game — Admin</h1>

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-6 flex flex-col gap-5">
        {/* Room Name */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">ชื่อห้อง</label>
          <input
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="เช่น ibm-room-1"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
          />
        </div>

        {/* Presets */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Presets</label>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map(pr => (
              <button
                key={pr.label}
                onClick={() => setParams(p => ({ ...p, s: pr.s, p: pr.p, q: pr.q }))}
                className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-teal-600 text-sm transition-colors"
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-3 gap-3">
          {(['s', 'p', 'q'] as const).map(k => (
            <div key={k}>
              <label className="text-sm text-gray-400 mb-1 block">พารามิเตอร์ {k}</label>
              <input
                type="number" min={2} max={97}
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-400"
                value={params[k]}
                onChange={e => setParams(prev => ({ ...prev, [k]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>

        {/* Board Preview (admin only — shows A/B/X) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Preview กระดาน {params.N}×{params.M}</span>
            <span className="text-xs text-gray-500">
              A={counts.A ?? 0} B={counts.B ?? 0} X={counts.removed ?? 0}
            </span>
          </div>
          <div
            className="grid gap-1 w-fit mx-auto"
            style={{ gridTemplateColumns: `repeat(${params.M}, 2.5rem)` }}
          >
            {preview.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold text-gray-900 ${cellColor(cell)}`}
                >
                  {cell === 'removed' ? '✕' : cell}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-4 mt-2 justify-center text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-400 inline-block" /> A = Alice ได้เปรียบ</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> B = Bob ได้เปรียบ</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500 inline-block" /> X = ถูกเจาะ</span>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!!createdId}
          className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-gray-900 font-bold rounded-xl transition-colors text-lg"
        >
          สร้างห้อง
        </button>

        {createdId && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Room Code</div>
                <div className="text-xl font-mono font-bold text-teal-300">{createdId}</div>
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            {/* QR Code */}
            {joinUrl && (
              <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3">
                <QRCodeSVG value={joinUrl} size={400} />
                <p className="text-gray-700 text-xs text-center">
                  สแกนเพื่อเข้าร่วมห้อง <span className="font-mono font-bold">{createdId}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Waiting Room Panel */}
      {createdId && snap && (
        <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-300">
              ผู้เล่นในห้อง
              <span className="ml-2 text-sm text-gray-500">({snap.waitingPlayers.length} คน)</span>
            </h2>
            {!snap.started && (
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="px-5 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-gray-900 font-bold rounded-xl transition-colors text-sm"
              >
                {starting ? '...' : '▶ เริ่มเกม'}
              </button>
            )}
            {snap.started && (
              <span className="text-xs bg-green-700 px-3 py-1 rounded-full">เริ่มแล้ว</span>
            )}
          </div>

          {snap.waitingPlayers.length === 0 ? (
            <p className="text-gray-500 text-sm">ยังไม่มีผู้เล่นเข้าร่วม...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {snap.waitingPlayers.map((name, i) => (
                <span key={i} className="bg-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                  {name}
                </span>
              ))}
            </div>
          )}

          {!canStart && !snap.started && snap.waitingPlayers.length < 2 && (
            <p className="text-xs text-gray-500">ต้องมีผู้เล่นอย่างน้อย 2 คนก่อนเริ่ม</p>
          )}

          {snap.tables.length > 0 && (
            <div className="mt-2">
              <div className="text-sm text-gray-400 mb-2">โต๊ะที่กำลังเล่น</div>
              <div className="flex flex-col gap-2">
                {snap.tables.map(t => (
                  <div key={t.tableId} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-2">
                    <span className="text-sm">
                      โต๊ะ {t.tableId}: <span className="text-teal-300">{t.players[0]}</span> vs <span className="text-amber-300">{t.players[1]}</span>
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'playing' ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {t.status === 'playing' ? 'กำลังเล่น' : 'จบแล้ว'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
