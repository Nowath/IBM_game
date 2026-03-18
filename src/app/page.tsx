'use client';

import { useState, useEffect } from 'react';
import AdminPanel from '@/components/AdminPanel';
import Lobby from '@/components/Lobby';
import GameTable from '@/components/GameTable';

type View = 'home' | 'admin' | 'lobby' | 'game';

interface GameSession {
  roomId: string;
  tableId: number;
  playerName: string;
  role: 'alice' | 'bob';
}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [session, setSession] = useState<GameSession | null>(null);
  const [prefilledRoom, setPrefilledRoom] = useState('');

  // Handle ?join=roomCode deep link from QR code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setPrefilledRoom(joinCode);
      setView('lobby');
    }
  }, []);

  function handleJoined(roomId: string, tableId: number, playerName: string, role: 'alice' | 'bob') {
    setSession({ roomId, tableId, playerName, role });
    setView('game');
  }

  if (view === 'admin') return <AdminPanel onRoomCreated={() => {}} />;
  if (view === 'lobby') return (
    <Lobby
      prefilledRoom={prefilledRoom}
      onJoined={handleJoined}
      onBack={() => { setPrefilledRoom(''); setView('home'); }}
    />
  );
  if (view === 'game' && session) {
    return (
      <GameTable
        roomId={session.roomId}
        tableId={session.tableId}
        playerName={session.playerName}
        role={session.role}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-teal-400 mb-2">🎯 Grid Geography Game</h1>
        <p className="text-gray-400">IBM Ponder This — March 2026</p>
        <p className="text-gray-500 text-sm mt-1">เกมกระดาน 1v1 เชิงทฤษฎีกราฟ</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setView('admin')}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-2"
        >
          ⚙️ Admin — สร้างห้อง
        </button>
        <button
          onClick={() => setView('lobby')}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-2"
        >
          🎮 เล่นเกม
        </button>
      </div>

      <div className="text-center text-xs text-gray-600 max-w-sm">
        <p>ใครเดินไม่ได้ก่อน = แพ้</p>
      </div>
    </div>
  );
}
