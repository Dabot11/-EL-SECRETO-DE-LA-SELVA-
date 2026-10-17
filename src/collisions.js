import { CONFIG } from "./config.js";
import { TILE, isWalkable, tileAt } from "./map.js";

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const projectVector = (x, y) => ({
  x: ((x - y) * CONFIG.tileWidth) / 2,
  y: ((x + y) * CONFIG.tileHeight) / 2,
});
export const unprojectVector = (x, y) => ({
  x: x / CONFIG.tileWidth + y / CONFIG.tileHeight,
  y: y / CONFIG.tileHeight - x / CONFIG.tileWidth,
});

export function canOccupy(map, x, y, r = CONFIG.bodyRadius) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (isWalkable(map, tx, ty)) continue;
      const nearX = Math.max(tx, Math.min(x, tx + 1)),
        nearY = Math.max(ty, Math.min(y, ty + 1));
      if (Math.hypot(x - nearX, y - nearY) < r - 0.00001) return false;
    }
  }
  return true;
}

// Small substeps prevent tunneling even after a delayed frame; sliding avoids sticky corners.
export function moveBody(body, dx, dy, map) {
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.08));
  const startX = body.x,
    startY = body.y;
  for (let i = 0; i < count; i++) {
    if (canOccupy(map, body.x + dx / count, body.y)) body.x += dx / count;
    if (canOccupy(map, body.x, body.y + dy / count)) body.y += dy / count;
  }
  const moved = projectVector(body.x - startX, body.y - startY);
  body.moving = Math.hypot(moved.x, moved.y) > 0.01;
  if (body.moving) body.facing = moved.x < 0 ? -1 : 1;
  return body.moving;
}

// Supercover grid traversal: walls at a diagonal corner also block sight/rescue.
export function hasLineOfSight(map, a, b) {
  let x = Math.floor(a.x),
    y = Math.floor(a.y);
  const endX = Math.floor(b.x),
    endY = Math.floor(b.y);
  const dx = b.x - a.x,
    dy = b.y - a.y,
    sx = Math.sign(dx),
    sy = Math.sign(dy);
  const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx),
    deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let maxX =
    dx === 0 ? Infinity : (sx > 0 ? x + 1 - a.x : a.x - x) / Math.abs(dx);
  let maxY =
    dy === 0 ? Infinity : (sy > 0 ? y + 1 - a.y : a.y - y) / Math.abs(dy);
  const blocked = (xx, yy) => tileAt(map, xx, yy) === TILE.WALL;
  for (let i = 0; i < map.width + map.height + 4; i++) {
    if (blocked(x, y)) return false;
    if (x === endX && y === endY) return true;
    if (Math.abs(maxX - maxY) < 1e-9) {
      if (blocked(x + sx, y) || blocked(x, y + sy)) return false;
      x += sx;
      y += sy;
      maxX += deltaX;
      maxY += deltaY;
    } else if (maxX < maxY) {
      x += sx;
      maxX += deltaX;
    } else {
      y += sy;
      maxY += deltaY;
    }
  }
  return false;
}
export function canTravelStraight(map, a, b) {
  const count = Math.max(1, Math.ceil(distance(a, b) / 0.07));
  for (let i = 0; i <= count; i++)
    if (
      !canOccupy(
        map,
        a.x + ((b.x - a.x) * i) / count,
        a.y + ((b.y - a.y) * i) / count,
      )
    )
      return false;
  return true;
}
