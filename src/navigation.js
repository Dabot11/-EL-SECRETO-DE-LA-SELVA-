import { isWalkable } from "./map.js";
import {
  distance,
  canTravelStraight,
  projectVector,
  moveBody,
} from "./collisions.js";

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

// A direct clear segment smooths paths. Replanning starts from the actual position.
export function navigate(body, target, speed, dt, map) {
  if (distance(body, target) < 0.045) {
    body.moving = false;
    return true;
  }
  let waypoint = target;
  if (!canTravelStraight(map, body, target)) {
    const path = findPath(map, body, target);
    if (!path.length) {
      body.moving = false;
      return false;
    }
    waypoint = path[0];
    for (let i = 1; i < path.length; i++) {
      if (canTravelStraight(map, body, path[i])) waypoint = path[i];
      else break;
    }
  }
  const dx = waypoint.x - body.x,
    dy = waypoint.y - body.y,
    screen = projectVector(dx, dy);
  const factor = Math.min(
    1,
    (speed * dt) / Math.max(0.0001, Math.hypot(screen.x, screen.y)),
  );
  moveBody(body, dx * factor, dy * factor, map);
  return distance(body, target) < 0.08;
}
