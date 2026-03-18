'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CellType } from '@/lib/boardCompute';

interface GameState {
  board: CellType[][];
  removedCells: boolean[][];
  pawnPos: [number, number] | null;
  currentTurn: 'alice' | 'bob';
  phase: 'placement' | 'moving';
  winner: 'alice' | 'bob' | null;
  moveHistory: string[];
  timerStart: number;
}

interface TableData {
  tableId: number;
  players: [string, string];
  status: string;
  gameState: GameState;
}

interface Props {
  roomId: string;
  tableId: number;
  playerName: string;
  role: 'alice' | 'bob';
}

const TURN_SECONDS = 30;

// Role explanation content
const ROLE_INFO = {
  alice: {
    title: 'คุณคือ Alice 🟢',
    color: 'teal',
    steps: [
      { icon: '1️⃣', text: 'Alice เลือกช่องบนกระดาน แล้ววางหมากลงไป (ทำได้ครั้งเดียว)' },
      { icon: '↔️', text: 'หลังจากนั้น Bob เดินก่อน โดยย้ายหมากไปช่องติดกัน (บน/ล่าง/ซ้าย/ขวา)' },
      { icon: '🔄', text: 'ผลัดกันเดิน — ช่องที่หมากเพิ่งออกมาจะถูกลบออกถาวร' },
      { icon: '🏆', text: 'ใครเดินไม่ได้ก่อน = แพ้' },
    ],
    tip: 'เลือกช่องที่ทำให้ตัวเองได้เปรียบในการเดิน!',
  },
  bob: {
    title: 'คุณคือ Bob 🟠',
    color: 'amber',
    steps: [
      { icon: '👁️', text: 'Alice จะเลือกช่องและวางหมากก่อน' },
      { icon: '1️⃣', text: 'Bob เดินก่อน — ย้ายหมากไปช่องติดกัน (บน/ล่าง/ซ้าย/ขวา)' },
      { icon: '🔄', text: 'ผลัดกันเดิน — ช่องที่หมากเพิ่งออกมาจะถูกลบออกถาวร' },
      { icon: '🏆', text: 'ใครเดินไม่ได้ก่อน = แพ้' },
    ],
    tip: 'วางแผนให้ Alice ติดหล่มก่อนคุณ!',
  },
};

export default function GameTable({ roomId, tableId, playerName, role }: Props) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(true);
  const prevWinnerRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    const res = await fetch(`/api/game?roomId=${roomId}&tableId=${tableId}`);
    if (!res.ok) return;
    const data: TableData = await res.json();
    setTableData(data);

    if (data.gameState.winner && data.gameState.winner !== prevWinnerRef.current) {
      prevWinnerRef.current = data.gameState.winner;
      setShowWinModal(true);
    }
  }, [roomId, tableId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 500);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    if (!tableData) return;
    const gs = tableData.gameState;
    if (gs.phase !== 'moving' || gs.winner) return;
    const elapsed = (Date.now() - gs.timerStart) / 1000;
    setTimeLeft(Math.max(0, Math.ceil(TURN_SECONDS - elapsed)));
  }, [tableData]);

  async function handleCellClick(row: number, col: number) {
    if (!tableData) return;
    const gs = tableData.gameState;
    if (gs.winner || gs.currentTurn !== role) return;

    if (gs.phase === 'placement' && role === 'alice') {
      if (gs.removedCells[row][col]) return;
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, tableId, action: 'place', row, col }),
      });
      if ((await res.json()).ok) fetchState();
    } else if (gs.phase === 'moving' && gs.pawnPos) {
      const [pr, pc] = gs.pawnPos;
      if (Math.abs(row - pr) + Math.abs(col - pc) !== 1 || gs.removedCells[row][col]) return;
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, tableId, action: 'move', row, col }),
      });
      if ((await res.json()).ok) fetchState();
    }
  }

  async function handleReset() {
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, tableId, action: 'reset' }),
    });
    setShowWinModal(false);
    setShowRoleModal(true);
    prevWinnerRef.current = null;
    fetchState();
  }

  if (!tableData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const gs = tableData.gameState;
  const N = gs.board.length;
  const M = gs.board[0]?.length ?? 0;
  const info = ROLE_INFO[role];

  function isValidMove(row: number, col: number): boolean {
    if (!gs.pawnPos || gs.phase !== 'moving' || gs.currentTurn !== role) return false;
    const [pr, pc] = gs.pawnPos;
    return Math.abs(row - pr) + Math.abs(col - pc) === 1 && !gs.removedCells[row][col];
  }

  function isValidPlacement(row: number, col: number): boolean {
    return gs.phase === 'placement' && role === 'alice' && !gs.removedCells[row][col];
  }

  function cellStyle(row: number, col: number): string {
    const removed = gs.removedCells[row][col];
    const isPawn = gs.pawnPos?.[0] === row && gs.pawnPos?.[1] === col;
    const hovered = hoveredCell?.[0] === row && hoveredCell?.[1] === col;
    const validMove = isValidMove(row, col);
    const validPlace = isValidPlacement(row, col);

    if (isPawn) return 'bg-purple-500 ring-4 ring-purple-300 scale-110 z-10 cursor-default';
    if (removed) return 'bg-gray-800 opacity-20 cursor-not-allowed';
    if (validMove && hovered) return 'bg-blue-400 scale-105 cursor-pointer ring-2 ring-blue-200';
    if (validMove) return 'bg-blue-500/60 cursor-pointer ring-2 ring-blue-400 animate-pulse';
    if (validPlace && hovered) return 'bg-green-400 scale-105 cursor-pointer ring-2 ring-green-200';
    if (validPlace) return 'bg-green-600/50 cursor-pointer ring-1 ring-green-500';
    return 'bg-gray-600/50 cursor-default';
  }

  function cellContent(row: number, col: number): string {
    if (gs.pawnPos?.[0] === row && gs.pawnPos?.[1] === col) return '●';
    if (gs.removedCells[row][col]) return '';
    return '';
  }

  const timerPct = timeLeft / TURN_SECONDS;
  const timerColor = timerPct > 0.5 ? 'stroke-green-400' : timerPct > 0.25 ? 'stroke-yellow-400' : 'stroke-red-400';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Role Explanation Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-7 max-w-md w-full flex flex-col gap-5 shadow-2xl">
            <h2 className={`text-2xl font-bold ${info.color === 'teal' ? 'text-teal-400' : 'text-amber-400'}`}>
              {info.title}
            </h2>
            <p className="text-gray-400 text-sm">สนามแข่ง: {tableData.players[0]} vs {tableData.players[1]}</p>

            <div className="flex flex-col gap-3">
              {info.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl leading-tight">{s.icon}</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>

            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${info.color === 'teal' ? 'bg-teal-900/50 text-teal-300' : 'bg-amber-900/50 text-amber-300'}`}>
              💡 {info.tip}
            </div>

            <button
              onClick={() => setShowRoleModal(false)}
              className={`w-full py-3 font-bold rounded-xl transition-colors text-gray-900 ${info.color === 'teal' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-amber-500 hover:bg-amber-400'}`}
            >
              เข้าใจแล้ว — เริ่มเกม!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <PlayerChip name={tableData.players[0]} label="ALICE" color="teal" active={gs.currentTurn === 'alice' && gs.phase === 'moving'} isMe={role === 'alice'} />

        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-gray-400 text-center">
            {gs.phase === 'placement'
              ? (role === 'alice' ? '⚡ เลือกช่องวางหมาก' : '👁️ รอ Alice วางหมาก')
              : gs.winner
              ? (gs.winner === role ? '🏆 คุณชนะ!' : '😢 คุณแพ้')
              : gs.currentTurn === role ? '⚡ ตาคุณ!' : `รอ ${gs.currentTurn === 'alice' ? tableData.players[0] : tableData.players[1]}`}
          </div>
          {gs.phase === 'moving' && !gs.winner && (
            <TimerCircle timeLeft={timeLeft} total={TURN_SECONDS} colorClass={timerColor} />
          )}
        </div>

        <PlayerChip name={tableData.players[1]} label="BOB" color="amber" active={gs.currentTurn === 'bob' && gs.phase === 'moving'} isMe={role === 'bob'} />
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${M}, minmax(3rem, 4.5rem))` }}
        >
          {gs.board.map((row, i) =>
            row.map((_, j) => (
              <div
                key={`${i}-${j}`}
                className={`relative aspect-square rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-150 select-none ${cellStyle(i, j)}`}
                onClick={() => handleCellClick(i, j)}
                onMouseEnter={() => setHoveredCell([i, j])}
                onMouseLeave={() => setHoveredCell(null)}
                title={`(${i + 1},${j + 1})`}
              >
                {cellContent(i, j)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Move Log */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 max-h-28 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-1">Move Log</div>
        <div className="flex flex-col gap-0.5">
          {gs.moveHistory.length === 0
            ? <div className="text-xs text-gray-600">ยังไม่มีการเดิน</div>
            : [...gs.moveHistory].reverse().map((m, i) => (
                <div key={i} className="text-xs text-gray-400">{m}</div>
              ))}
        </div>
      </div>

      {/* Win Modal */}
      {showWinModal && gs.winner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5 text-center shadow-2xl">
            <div className="text-5xl">{gs.winner === role ? '🏆' : '😢'}</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{gs.winner === role ? 'คุณชนะ!' : 'คุณแพ้!'}</h2>
              <p className="text-gray-400 text-sm">
                {gs.winner === 'alice' ? tableData.players[0] : tableData.players[1]} ชนะในรอบนี้
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-gray-900 font-bold rounded-xl transition-colors"
            >
              🔄 เล่นใหม่ (สลับ role)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerChip({ name, label, color, active, isMe }: {
  name: string; label: string; color: 'teal' | 'amber'; active: boolean; isMe: boolean;
}) {
  const ring = color === 'teal' ? 'ring-teal-400' : 'ring-amber-400';
  const text = color === 'teal' ? 'text-teal-300' : 'text-amber-300';
  return (
    <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0 ${active ? `ring-2 ${ring} bg-gray-700` : ''}`}>
      <span className={`text-xs font-semibold ${text}`}>{label}{isMe ? ' (คุณ)' : ''}</span>
      <span className="text-sm text-white font-medium truncate max-w-[6rem]">{name}</span>
    </div>
  );
}

function TimerCircle({ timeLeft, total, colorClass }: { timeLeft: number; total: number; colorClass: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - timeLeft / total);
  return (
    <div className="relative w-11 h-11">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#374151" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className={`transition-all duration-1000 ${colorClass}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{timeLeft}</span>
    </div>
  );
}
