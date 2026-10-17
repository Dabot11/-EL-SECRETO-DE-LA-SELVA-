import { CONFIG } from "./config.js";
import { isWalkable } from "./map.js";
export const sameTile = (a, b) =>
  Math.floor(a.x) === Math.floor(b.x) && Math.floor(a.y) === Math.floor(b.y);
export const cardinal = (x, y) =>
  Math.abs(x) >= Math.abs(y) && x
    ? { x: Math.sign(x), y: 0 }
    : y
      ? { x: 0, y: Math.sign(y) }
      : { x: 0, y: 0 };
export const centered = (p) =>
  Number.isInteger(p.x - 0.5) && Number.isInteger(p.y - 0.5);
// Rules use tile centers. Only rendering interpolates a single cardinal step.
export function tickMotion(body, dt) {
  if (body.motion) {
    body.motion.remaining = Math.max(0, body.motion.remaining - dt);
    if (body.motion.remaining <= 1e-8) body.motion = null;
  }
  body.moving = !!body.motion;
}
export function stepBody(body, direction, speed, map) {
  if (body.motion || !centered(body)) return false;
  const d = cardinal(direction.x, direction.y);
  if (!d.x && !d.y) return false;
  const x = body.x + d.x,
    y = body.y + d.y;
  if (!isWalkable(map, x, y)) return false;
  const duration = CONFIG.tileWidth / speed;
  body.motion = {
    from: { x: body.x, y: body.y },
    duration,
    remaining: duration,
  };
  body.x = x;
  body.y = y;
  body.moving = true;
  body.direction = d;
  if (d.x) body.facing = d.x;
  return true;
}
export function renderPosition(body) {
  if (!body.motion) return { x: body.x, y: body.y };
  const t = 1 - body.motion.remaining / body.motion.duration;
  return {
    x: body.motion.from.x + (body.x - body.motion.from.x) * t,
    y: body.motion.from.y + (body.y - body.motion.from.y) * t,
  };
}
