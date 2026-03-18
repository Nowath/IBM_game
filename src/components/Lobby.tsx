'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  onJoined: (roomId: string, tableId: number, playerName: string, role: 'alice' | 'bob') => void;
  onBack: () => void;
  prefilledRoom?: string;
}

export default function Lobby({ onJoined, onBack, prefilledRoom = '' }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(prefilledRoom);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'no_pair'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [waitingPlayers, setWaitingPlayers] = useState<string[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
  }

  useEffect(() => () => stopPoll(), []);

  async function handleJoin() {
    const name = playerName.trim();
    const code = roomCode.trim();
    if (!name || !code) { setErrorMsg('กรุณากรอกชื่อและ room code'); return; }
    setErrorMsg('');

    const res = await fetch('/api/room', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: code, playerName: name }),
    });
    if (!res.ok) { setErrorMsg('ไม่พบห้องนี้ กรุณาตรวจสอบ room code'); return; }

    const { tableId, role } = await res.json();
    if (tableId !== null) {
      // Room already started and we're assigned
      onJoined(code, tableId, name, role);
      return;
    }

    setStatus('waiting');

    // Poll room state until admin starts and we get a table
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/room?roomId=${code}`);
      if (!r.ok) return;
      const snap = await r.json();
      setWaitingPlayers(snap.waitingPlayers ?? []);
      setTableCount(snap.tables?.length ?? 0);

      if (snap.started) {
        const myTable = (snap.tables ?? []).find(
          (t: { players: string[] }) => t.players.includes(name)
        );
        if (myTable) {
          stopPoll();
          const myRole: 'alice' | 'bob' = myTable.players[0] === name ? 'alice' : 'bob';
          onJoined(code, myTable.tableId, name, myRole);
          return;
        }
        // Room started but player has no table = unpaired
        if ((snap.unpairedPlayers ?? []).includes(name)) {
          stopPoll();
          setStatus('no_pair');
        }
      }
    }, 800);
  }

  function handleCancel() {
    stopPoll();
    setStatus('idle');
    setWaitingPlayers([]);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-teal-400 mb-2">🎯 Grid Geography Game</h1>
        <p className="text-gray-400 text-sm">IBM Ponder This — March 2026</p>
      </div>

      {status === 'idle' && (
        <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">ชื่อผู้เล่น</label>
            <input
              className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="เช่น Alice123"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Room Code</label>
            <input
              className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-teal-400 font-mono"
              placeholder="room code จาก admin"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>
          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          <button
            onClick={handleJoin}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-gray-900 font-bold rounded-xl transition-colors"
          >
            เข้าร่วม
          </button>
        </div>
      )}

      {status === 'waiting' && (
        <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-600" />
            <div className="absolute inset-0 rounded-full border-4 border-t-teal-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">รอ Admin เริ่มเกม...</p>
            <p className="text-gray-400 text-sm mt-1">ห้อง: <span className="font-mono text-teal-300">{roomCode}</span></p>
          </div>

          {/* Player list */}
          {waitingPlayers.length > 0 && (
            <div className="w-full">
              <p className="text-xs text-gray-500 mb-2">ผู้เล่นในห้อง ({waitingPlayers.length} คน)</p>
              <div className="flex flex-col gap-1.5">
                {waitingPlayers.map((n, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${n === playerName ? 'bg-teal-700 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${n === playerName ? 'bg-teal-300' : 'bg-gray-500'}`} />
                    {n} {n === playerName && '(คุณ)'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tableCount > 0 && (
            <p className="text-xs text-green-400">✓ เกมเริ่มแล้ว กำลังเข้าโต๊ะ...</p>
          )}

          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {status === 'no_pair' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5 text-center shadow-2xl">
            <div className="text-5xl">😔</div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">ไม่มีคู่ต่อสู้</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                จำนวนผู้เล่นในห้องเป็นเลขคี่<br />
                คุณไม่ได้รับการจับคู่ในรอบนี้
              </p>
            </div>
            <button
              onClick={onBack}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-gray-900 font-bold rounded-xl transition-colors"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
