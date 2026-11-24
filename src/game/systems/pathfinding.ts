export interface GridPoint {
  tileX: number;
  tileY: number;
}

export function findTilePath(
  start: GridPoint,
  goal: GridPoint,
  widthTiles: number,
  heightTiles: number,
  blocked: ReadonlySet<string>,
): GridPoint[] {
  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < widthTiles && y < heightTiles;
  const key = (x: number, y: number) => `${x},${y}`;

  if (!inBounds(goal.tileX, goal.tileY)) return [];

  // If the exact tapped tile is blocked (e.g., player tapped on wardrobe/table to walk up to it),
  // pick the nearest walkable neighbor to the player.
  let resolvedGoal = goal;
  if (blocked.has(key(goal.tileX, goal.tileY))) {
    const candidates: GridPoint[] = [
      { tileX: goal.tileX, tileY: goal.tileY + 1 },
      { tileX: goal.tileX, tileY: goal.tileY - 1 },
      { tileX: goal.tileX - 1, tileY: goal.tileY },
      { tileX: goal.tileX + 1, tileY: goal.tileY },
    ].filter((c) => inBounds(c.tileX, c.tileY) && !blocked.has(key(c.tileX, c.tileY)));

    if (candidates.length === 0) return [];
    candidates.sort(
      (a, b) =>
        Math.hypot(a.tileX - start.tileX, a.tileY - start.tileY) -
        Math.hypot(b.tileX - start.tileX, b.tileY - start.tileY),
    );
    resolvedGoal = candidates[0]!;
  }

  if (start.tileX === resolvedGoal.tileX && start.tileY === resolvedGoal.tileY) {
    return [];
  }

  const queue: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint | null>();
  cameFrom.set(key(start.tileX, start.tileY), null);

  const dirs: readonly GridPoint[] = [
    { tileX: 0, tileY: 1 },
    { tileX: 0, tileY: -1 },
    { tileX: -1, tileY: 0 },
    { tileX: 1, tileY: 0 },
  ];

  let found = false;
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.tileX === resolvedGoal.tileX && current.tileY === resolvedGoal.tileY) {
      found = true;
      break;
    }
    for (const d of dirs) {
      const nx = current.tileX + d.tileX;
      const ny = current.tileY + d.tileY;
      const nk = key(nx, ny);
      if (!inBounds(nx, ny) || blocked.has(nk) || cameFrom.has(nk)) continue;
      cameFrom.set(nk, current);
      queue.push({ tileX: nx, tileY: ny });
    }
  }

  if (!found) return [];

  const path: GridPoint[] = [];
  let cursor: GridPoint | null = resolvedGoal;
  while (cursor && !(cursor.tileX === start.tileX && cursor.tileY === start.tileY)) {
    path.push(cursor);
    cursor = cameFrom.get(key(cursor.tileX, cursor.tileY)) ?? null;
  }
  path.reverse();
  return path;
}
