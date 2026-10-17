import { isWalkable } from "./map.js";
import { tickMotion, stepBody, sameTile } from "./grid.js";

// Breadth-first paths use four neighbors, so a path never cuts through a wall corner.
export function findPath(map, from, to) {
  const sx = Math.floor(from.x),
    sy = Math.floor(from.y),
    tx = Math.floor(to.x),
    ty = Math.floor(to.y);
  if (!isWalkable(map, sx, sy) || !isWalkable(map, tx, ty)) return [];
  const key = (x, y) => y * map.width + x;
  const queue = [{ x: sx, y: sy }],
    parents = new Map([[key(sx, sy), null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.x === tx && current.y === ty) {
      const path = [];
      for (let cell = current; cell; cell = parents.get(key(cell.x, cell.y)))
        path.push({ x: cell.x + 0.5, y: cell.y + 0.5 });
      return path.reverse();
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const x = current.x + dx,
        y = current.y + dy,
        k = key(x, y);
      if (isWalkable(map, x, y) && !parents.has(k)) {
        parents.set(k, current);
        queue.push({ x, y });
      }
    }
  }
  return [];
}

// Every route follows four-neighbor cells; never smooth a corner into a diagonal.
export function navigate(body, target, speed, dt, map) {
  tickMotion(body, dt);
  if (body.motion) return false;
  const path = findPath(map, body, target);
  if (path.length <= 1) {
    body.moving = false;
    return path.length === 1;
  }
  stepBody(body, { x: path[1].x - body.x, y: path[1].y - body.y }, speed, map);
  return sameTile(body, target);
}
