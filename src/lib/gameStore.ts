// In-memory shared state (simulates real-time multiplayer on the same browser)
import { computeBoard, CellType } from './boardCompute';

export interface BoardParams {
  s: number;
  p: number;
  q: number;
  N: number;
  M: number;
}

export interface GameState {
  board: CellType[][];
  removedCells: boolean[][];
  pawnPos: [number, number] | null;
  currentTurn: 'alice' | 'bob';
  phase: 'placement' | 'moving';
  winner: 'alice' | 'bob' | null;
  moveHistory: string[];
  timerStart: number;
}

export interface TableState {
  tableId: number;
  players: [string, string]; // [alice, bob]
  status: 'waiting' | 'playing' | 'finished';
  gameState: GameState;
}

export interface RoomState {
  roomId: string;
  params: BoardParams;
  classification: Map<string, CellType>;
  tables: TableState[];
  waitingPlayers: string[];
  unpairedPlayers: string[];  // players with no pair after start
  started: boolean;
}

const rooms = new Map<string, RoomState>();
let nextTableId = 1;

function makeEmptyGame(params: BoardParams, classification: Map<string, CellType>): GameState {
  const board: CellType[][] = [];
  const removedCells: boolean[][] = [];
  for (let i = 0; i < params.N; i++) {
    board.push([]);
    removedCells.push([]);
    for (let j = 0; j < params.M; j++) {
      const c = classification.get(`${i + 1},${j + 1}`) ?? 'B';
      board[i].push(c);
      removedCells[i].push(c === 'removed');
    }
  }
  return {
    board,
    removedCells,
    pawnPos: null,
    currentTurn: 'alice',
    phase: 'placement',
    winner: null,
    moveHistory: [],
    timerStart: Date.now(),
  };
}

export function createRoom(roomId: string, params: BoardParams): RoomState {
  const { classification } = computeBoard(params.N, params.M, params.p, params.q, params.s);
  const room: RoomState = {
    roomId,
    params,
    classification,
    tables: [],
    waitingPlayers: [],
    unpairedPlayers: [],
    started: false,
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

// Join waiting list — no auto pairing, just enqueue
export function joinRoom(roomId: string, playerName: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (!room.waitingPlayers.includes(playerName)) {
    room.waitingPlayers.push(playerName);
  }
  return true;
}

// Admin triggers start — shuffle waiting players then pair them
export function startRoom(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || room.started) return false;

  const players = [...room.waitingPlayers];
  // Fisher-Yates shuffle
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }

  // Pair up players into tables
  for (let i = 0; i + 1 < players.length; i += 2) {
    const alice = players[i];
    const bob = players[i + 1];
    room.tables.push({
      tableId: nextTableId++,
      players: [alice, bob],
      status: 'playing',
      gameState: makeEmptyGame(room.params, room.classification),
    });
  }

  // Odd player out gets no pair
  if (players.length % 2 === 1) {
    room.unpairedPlayers.push(players[players.length - 1]);
  }

  room.started = true;
  return true;
}

// Find which table a player was assigned to after start
export function getPlayerTable(roomId: string, playerName: string): TableState | undefined {
  return rooms.get(roomId)?.tables.find(t => t.players.includes(playerName));
}

export function getTable(roomId: string, tableId: number): TableState | undefined {
  return rooms.get(roomId)?.tables.find(t => t.tableId === tableId);
}

export function placePawn(roomId: string, tableId: number, row: number, col: number): boolean {
  const table = getTable(roomId, tableId);
  if (!table || table.gameState.phase !== 'placement') return false;
  const gs = table.gameState;
  if (gs.removedCells[row][col]) return false;

  gs.pawnPos = [row, col];
  gs.phase = 'moving';
  gs.currentTurn = 'bob';
  gs.timerStart = Date.now();
  gs.moveHistory.push(`Alice วางหมากที่ (${row + 1},${col + 1})`);
  return true;
}

export function movePawn(roomId: string, tableId: number, toRow: number, toCol: number): boolean {
  const table = getTable(roomId, tableId);
  if (!table || table.gameState.phase !== 'moving') return false;
  const gs = table.gameState;
  if (!gs.pawnPos) return false;

  const [fr, fc] = gs.pawnPos;
  if (Math.abs(toRow - fr) + Math.abs(toCol - fc) !== 1) return false;
  if (gs.removedCells[toRow][toCol]) return false;

  gs.removedCells[fr][fc] = true;
  gs.pawnPos = [toRow, toCol];

  const mover = gs.currentTurn === 'alice' ? 'Alice' : 'Bob';
  gs.moveHistory.push(`${mover} เดินไป (${toRow + 1},${toCol + 1})`);

  const nextTurn: 'alice' | 'bob' = gs.currentTurn === 'alice' ? 'bob' : 'alice';
  const params = rooms.get(roomId)!.params;
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const canMove = dirs.some(([dr, dc]) => {
    const nr = toRow + dr;
    const nc = toCol + dc;
    return nr >= 0 && nr < params.N && nc >= 0 && nc < params.M && !gs.removedCells[nr][nc];
  });

  if (!canMove) {
    gs.winner = gs.currentTurn;
    table.status = 'finished';
  } else {
    gs.currentTurn = nextTurn;
    gs.timerStart = Date.now();
  }

  return true;
}

export function resetTable(roomId: string, tableId: number): void {
  const room = rooms.get(roomId);
  const table = room?.tables.find(t => t.tableId === tableId);
  if (!table || !room) return;
  table.gameState = makeEmptyGame(room.params, room.classification);
  table.status = 'playing';
  table.players = [table.players[1], table.players[0]];
}

export function getRoomSnapshot(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId: room.roomId,
    params: room.params,
    tables: room.tables,
    waitingPlayers: room.waitingPlayers,
    unpairedPlayers: room.unpairedPlayers,
    started: room.started,
    classificationEntries: Array.from(room.classification.entries()),
  };
}
