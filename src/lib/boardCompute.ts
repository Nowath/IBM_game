// Board computation: Hopcroft-Karp bipartite matching + Gallai-Edmonds classification
// Grid cells: 1-indexed (row i, col j), i in [1..N], j in [1..M]
// Bipartition: L = (i+j) even, R = (i+j) odd
// Edges: horizontal/vertical adjacent non-removed pairs between L and R

export type CellType = 'A' | 'B' | 'removed';

export interface BoardResult {
  N: number;
  M: number;
  classification: Map<string, CellType>;
}

function modpow(base: number, exp: number, mod: number): number {
  let result = 1n;
  let b = BigInt(base) % BigInt(mod);
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % BigInt(mod);
    e = Math.floor(e / 2);
    b = (b * b) % BigInt(mod);
  }
  return Number(result);
}

function key(i: number, j: number) {
  return `${i},${j}`;
}

export function computeBoard(N: number, M: number, p: number, q: number, s: number): BoardResult {
  // 1. Find removed cells
  const removed = new Set<string>();
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const pi = modpow(p, i, s);
      const qj = modpow(q, j, s);
      if ((pi + qj) % s === 0) removed.add(key(i, j));
    }
  }

  // 2. Build bipartite graph
  // L-nodes: cells with (i+j) % 2 === 0, R-nodes: (i+j) % 2 === 1
  // Assign indices
  const lIndex = new Map<string, number>(); // L-node -> index
  const rIndex = new Map<string, number>(); // R-node -> index
  const lCells: [number, number][] = [];
  const rCells: [number, number][] = [];

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const k = key(i, j);
      if (removed.has(k)) continue;
      if ((i + j) % 2 === 0) {
        lIndex.set(k, lCells.length);
        lCells.push([i, j]);
      } else {
        rIndex.set(k, rCells.length);
        rCells.push([i, j]);
      }
    }
  }

  const nL = lCells.length;
  const nR = rCells.length;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // adjacency list: adj[lIdx] = list of rIdx
  const adj: number[][] = Array.from({ length: nL }, () => []);
  for (let li = 0; li < nL; li++) {
    const [r, c] = lCells[li];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 1 || nr > N || nc < 1 || nc > M) continue;
      const nk = key(nr, nc);
      if (removed.has(nk)) continue;
      const ri = rIndex.get(nk);
      if (ri !== undefined) adj[li].push(ri);
    }
  }

  // 3. Hopcroft-Karp
  const matchL = new Array<number>(nL).fill(-1);
  const matchR = new Array<number>(nR).fill(-1);
  const INF = 1e9;

  function bfs(): boolean {
    const dist = new Array<number>(nL).fill(INF);
    const queue: number[] = [];
    for (let u = 0; u < nL; u++) {
      if (matchL[u] === -1) {
        dist[u] = 0;
        queue.push(u);
      }
    }
    let found = false;
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const v of adj[u]) {
        const w = matchR[v];
        if (w === -1) {
          found = true;
        } else if (dist[w] === INF) {
          dist[w] = dist[u] + 1;
          queue.push(w);
        }
      }
    }
    // store dist in closure via outer variable trick
    ;(bfs as any)._dist = dist;
    return found;
  }

  function dfs(u: number, dist: number[]): boolean {
    for (const v of adj[u]) {
      const w = matchR[v];
      if (w === -1 || (dist[w] === dist[u] + 1 && dfs(w, dist))) {
        matchL[u] = v;
        matchR[v] = u;
        return true;
      }
    }
    dist[u] = INF;
    return false;
  }

  while (bfs()) {
    const dist: number[] = (bfs as any)._dist;
    for (let u = 0; u < nL; u++) {
      if (matchL[u] === -1) dfs(u, dist);
    }
  }

  // 4. Gallai-Edmonds: find reachable sets via alternating paths
  // From unmatched L-nodes: follow unmatched L->R edge, then matched R->L edge
  const reachableL = new Set<number>();
  const reachableR = new Set<number>();

  // BFS/DFS from all unmatched L-nodes
  const stackL: number[] = [];
  for (let u = 0; u < nL; u++) {
    if (matchL[u] === -1) {
      stackL.push(u);
      reachableL.add(u);
    }
  }
  while (stackL.length > 0) {
    const u = stackL.pop()!;
    for (const v of adj[u]) {
      if (!reachableR.has(v)) {
        reachableR.add(v);
        const w = matchR[v];
        if (w !== -1 && !reachableL.has(w)) {
          reachableL.add(w);
          stackL.push(w);
        }
      }
    }
  }

  // Similarly from unmatched R-nodes (Alice can start on R side too)
  const reachableR2 = new Set<number>();
  const reachableL2 = new Set<number>();

  const stackR: number[] = [];
  for (let v = 0; v < nR; v++) {
    if (matchR[v] === -1) {
      stackR.push(v);
      reachableR2.add(v);
    }
  }
  while (stackR.length > 0) {
    const v = stackR.pop()!;
    const u = matchR[v]; // matched L-node (if any) — wrong, matchR[v] is L-index
    // From R, follow matched edge to L, then unmatched L->R
    if (u !== -1 && !reachableL2.has(u)) {
      reachableL2.add(u);
      for (const nv of adj[u]) {
        if (!reachableR2.has(nv)) {
          reachableR2.add(nv);
          stackR.push(nv);
        }
      }
    }
  }

  // 5. Classify cells
  // A = Alice wins = not covered by every max matching
  //   For L-node: reachable from some unmatched L-node (reachableL)
  //   For R-node: reachable from some unmatched R-node (reachableR2)
  // B = Bob wins = in every max matching (not A)

  const classification = new Map<string, CellType>();

  for (const [k] of removed.entries()) {
    classification.set(k, 'removed');
  }

  // Mark removed cells not yet in map
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const k = key(i, j);
      if (removed.has(k)) {
        classification.set(k, 'removed');
        continue;
      }
      if ((i + j) % 2 === 0) {
        // L-node
        const li = lIndex.get(k)!;
        classification.set(k, reachableL.has(li) ? 'A' : 'B');
      } else {
        // R-node
        const ri = rIndex.get(k)!;
        classification.set(k, reachableR2.has(ri) ? 'A' : 'B');
      }
    }
  }

  return { N, M, classification };
}

export function getAdjacentCells(
  i: number, j: number, N: number, M: number,
  removedSet: Set<string>
): [number, number][] {
  const dirs: [number, number][] = [[0,1],[0,-1],[1,0],[-1,0]];
  return dirs
    .map(([dr, dc]) => [i + dr, j + dc] as [number, number])
    .filter(([r, c]) => r >= 1 && r <= N && c >= 1 && c <= M && !removedSet.has(key(r, c)));
}
