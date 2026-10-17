import { CONFIG } from "./config.js";
import { TILE, tileAt } from "./map.js";

const S = CONFIG.tileWidth;
export const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export const mix = (a, b, weight) => {
  const aa = parseInt(a.slice(1), 16),
    bb = parseInt(b.slice(1), 16);
  return `#${[16, 8, 0]
    .map((shift) =>
      Math.round(
        ((aa >> shift) & 255) * (1 - weight) + ((bb >> shift) & 255) * weight,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};
const point = (x, y) => ({
  x: CONFIG.originX + x * S,
  y: CONFIG.originY + y * S,
});

function wall(r, x, y, seed) {
  const p = r.palette;
  // All elevation stays inside the blocked cell: no wall hides a walkable tile.
  r.rect(x, y, S, S, mix(p.shadow, "#10291f", 0.45));
  r.rect(x + 1, y + 1, S - 2, S - 7, mix(p.stone, p.shadow, 0.15));
  r.rect(x + 2, y + 1, S - 4, 2, p.light);
  r.rect(x + 1, y + 3, 2, S - 10, mix(p.stone, p.light, 0.4));
  r.rect(x + 3, y + 22, S - 6, 3, p.shadow);
  r.rect(x + 3, y + 20, S - 6, 2, mix(p.light, p.stone, 0.5));
  const split = 8 + Math.floor(seed * 10);
  r.rect(x + split, y + 4, 1, 15, p.shadow);
  r.rect(x + split + 1, y + 4, 1, 14, mix(p.stone, p.light, 0.35));
  r.rect(x + 3, y + 11, split - 3, 1, p.shadow);
  r.rect(x + split + 2, y + 8, S - split - 5, 1, p.shadow);
  if (seed > 0.38) {
    r.line(
      [
        [x + 18, y + 12],
        [x + 15, y + 15],
        [x + 17, y + 18],
      ],
      p.shadow,
    );
    r.rect(x + 5, y + 5, 3, 2, mix(p.light, p.stone, 0.45));
  }
  // Moss and small trailing roots replace the old repetitive brick pattern.
  const moss = mix(p.bush, p.light, 0.22);
  for (let k = 0; k < 4; k++) {
    const mx = x + 2 + hash(seed + k, 9) * 20;
    const my = y + (k % 2 ? 17 : 3);
    r.rect(mx, my, 3 + hash(seed, k) * 4, 2, moss);
    r.rect(mx + 1, my + 2, 2, 3, p.bush);
    if (k === 0 && seed > 0.6) r.rect(mx + 2, my + 4, 1, 5, p.bush);
  }
}

export function paintTerrain(r, map) {
  const p = r.palette;
  r.rect(0, 0, CONFIG.width, CONFIG.height, p.bg);
  const ox = CONFIG.originX,
    oy = CONFIG.originY;
  r.rect(ox - 5, oy - 5, map.width * S + 10, map.height * S + 10, "#071e18");
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const t = tileAt(map, x, y),
        pos = point(x, y),
        seed = hash(x, y);
      const sx = pos.x,
        sy = pos.y;
      if (t === TILE.WALL) {
        wall(r, sx, sy, seed);
        continue;
      }
      if (t === TILE.WATER) {
        r.rect(
          sx,
          sy,
          S,
          S,
          mix(
            p.water,
            p.bg,
            0.22 + hash(Math.floor(x / 2), Math.floor(y / 2)) * 0.16,
          ),
        );
        r.rect(sx, sy, S, 1, p.waterLight + "18");
        r.rect(sx, sy, 1, S, p.waterLight + "18");
        continue;
      }
      const patch = hash(Math.floor(x / 3), Math.floor(y / 3));
      const ground = mix(
        p.ground[Math.floor(seed * 4)],
        p.shadow,
        0.35 + patch * 0.16,
      );
      r.rect(sx, sy, S, S, ground);
      // Worn paving and soft grid lines preserve exact, readable square steps.
      r.rect(sx, sy, S, 1, p.line + "90");
      r.rect(sx, sy, 1, S, p.line + "90");
      r.rect(sx + 1, sy + 1, S - 2, 1, p.light + "28");
      if (seed > 0.45 && t !== TILE.BUSH) {
        const stone = mix(ground, p.light, 0.13);
        r.poly(
          [
            [sx + 4, sy + 4],
            [sx + 20, sy + 3],
            [sx + 24, sy + 8],
            [sx + 22, sy + 22],
            [sx + 7, sy + 24],
            [sx + 3, sy + 19],
          ],
          stone,
        );
        r.line(
          [
            [sx + 5, sy + 5],
            [sx + 19, sy + 4],
          ],
          p.light + "50",
        );
        if (seed > 0.78)
          r.line(
            [
              [sx + 22, sy + 14],
              [sx + 16, sy + 16],
              [sx + 15, sy + 20],
            ],
            p.line + "90",
          );
      }
      for (let k = 0; k < 9; k++) {
        const dx = 2 + hash(x + k * 7, y) * 24,
          dy = 2 + hash(x, y + k * 11) * 24;
        r.rect(
          sx + dx,
          sy + dy,
          k % 3 ? 1 : 2,
          1,
          k % 2 ? p.light + "36" : p.line + "70",
        );
      }
      // Low vegetation hugs the ground, separate from hideable leaf clusters.
      if (patch > 0.48 || t === TILE.BUSH)
        for (let k = 0; k < 3; k++) {
          const dx = 2 + hash(x + k, y + 5) * 20,
            dy = 4 + hash(x, y + k) * 19;
          r.rect(sx + dx, sy + dy, 4, 2, mix(ground, p.bush, 0.35));
          r.rect(sx + dx + 2, sy + dy - 2, 1, 3, mix(ground, p.bush, 0.55));
        }
      if (tileAt(map, x, y - 1) === TILE.WALL)
        r.rect(sx + 1, sy + 1, S - 1, 4, "#10241d40");
      if (tileAt(map, x - 1, y) === TILE.WALL)
        r.rect(sx + 1, sy + 1, 3, S - 1, "#10241d30");
      if (t === TILE.BRIDGE) {
        r.rect(sx + 1, sy, S - 2, S, "#493c29");
        for (let k = 1; k < S; k += 6) {
          r.rect(sx + 2, sy + k, S - 4, 5, k % 2 ? "#b48751" : "#a77a46");
          r.rect(sx + 3, sy + k, S - 6, 1, "#dfba79");
          r.rect(sx + 7 + hash(x + k, y) * 7, sy + k + 2, 8, 1, "#87613d");
          r.rect(sx + 3, sy + k + 2, 1, 1, "#443a2e");
          r.rect(sx + S - 4, sy + k + 2, 1, 1, "#443a2e");
        }
        r.rect(sx + 1, sy, 2, S, "#efd19a");
        r.rect(sx + S - 3, sy, 2, S, "#c5a66e");
      }
      if (t === TILE.BASE) {
        r.rect(sx + 1, sy + 1, S - 2, S - 2, "#b4dba816");
        r.rect(sx + 12, sy + 12, 3, 3, "#d4e0aa60");
      }
    }
  // Water banks are painted after the floor, always inside the water cell.
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (tileAt(map, x, y) !== TILE.WATER) continue;
      const { x: sx, y: sy } = point(x, y);
      for (const [dx, dy, xx, yy, w, h] of [
        [0, -1, 0, 0, S, 3],
        [0, 1, 0, S - 3, S, 3],
        [-1, 0, 0, 0, 3, S],
        [1, 0, S - 3, 0, 3, S],
      ]) {
        if ([TILE.WATER, TILE.BRIDGE].includes(tileAt(map, x + dx, y + dy)))
          continue;
        r.rect(sx + xx, sy + yy, w, h, mix(p.water, p.shadow, 0.6));
        r.rect(
          sx + xx + (dx < 0 ? 3 : 0),
          sy + yy + (dy < 0 ? 3 : 0),
          w === 3 ? 1 : w,
          h === 3 ? 1 : h,
          p.waterLight + "70",
        );
      }
    }
  // Cache the ambient lighting with the floor, below actors and warning cells.
  const c = r.ctx;
  const light = c.createRadialGradient(
    ox + map.width * S * 0.75,
    oy + 70,
    20,
    ox + map.width * S * 0.6,
    oy + 160,
    map.width * S * 0.8,
  );
  light.addColorStop(0, p.accent + "19");
  light.addColorStop(0.6, "#081f1c00");
  light.addColorStop(1, "#081f1c30");
  c.fillStyle = light;
  c.fillRect(ox, oy, map.width * S, map.height * S);
  r.torches = [];
  for (let y = 2; y < map.height - 2; y++)
    for (let x = 2; x < map.width - 2; x++) {
      if (
        tileAt(map, x, y) !== TILE.WALL ||
        tileAt(map, x, y + 1) !== TILE.FLOOR ||
        hash(x + 3, y + 1) < 0.7
      )
        continue;
      const t = point(x + 0.5, y + 0.5);
      r.torches.push(t);
      r.rect(t.x - 2, t.y - 2, 4, 9, "#473b2b");
      r.rect(t.x - 4, t.y - 3, 8, 3, "#d1ac68");
    }
  const b = point(map.base.x, map.base.y);
  r.rect(b.x - 12, b.y - 12, 24, 24, "#25483b");
  r.ctx.strokeStyle = "#a5cca0";
  r.ctx.strokeRect(b.x - 11.5, b.y - 11.5, 23, 23);
  r.rune(b.x, b.y, "#e4e7ae");
}

export function paintWater(r, map) {
  const p = r.palette;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (tileAt(map, x, y) !== TILE.WATER) continue;
      const s = point(x, y);
      for (let k = 0; k < 2; k++) {
        const phase = r.time * 0.6 + hash(x + k, y) * 6;
        const dx = 4 + ((hash(x + k, y) * 14 + r.time * 1.5) % 14);
        r.rect(
          s.x + dx,
          s.y + 8 + k * 11,
          5 + Math.sin(phase) * 2,
          1,
          p.waterLight + "70",
        );
        r.rect(s.x + dx - 2, s.y + 9 + k * 11, 3, 1, p.waterLight + "28");
      }
      if (hash(x, y) > 0.86) {
        const bob = Math.sin(r.time + x) * 0.5;
        r.rect(s.x + 16, s.y + 13 + bob, 6, 3, mix(p.bush, p.water, 0.3));
        r.rect(s.x + 17, s.y + 12 + bob, 3, 1, p.light + "80");
      }
    }
}

export function paintAtmosphere(r, map) {
  const c = r.ctx;
  c.save();
  c.beginPath();
  c.rect(CONFIG.originX, CONFIG.originY, map.width * S, map.height * S);
  c.clip();
  for (const t of r.torches ?? []) {
    const flicker = Math.sin(r.time * 7 + t.x) * 0.5;
    r.glow(t.x, t.y - 5, "#ffcf79", 30, 0.35 + flicker * 0.08);
    r.poly(
      [
        [t.x - 3, t.y - 3],
        [t.x - 3, t.y - 7],
        [t.x + flicker, t.y - 12],
        [t.x + 3, t.y - 7],
        [t.x + 2, t.y - 3],
      ],
      "#f3a350",
    );
    r.rect(t.x - 1, t.y - 8 + flicker, 2, 5, "#ffe8a6");
  }
  // Sparse motes stay small and translucent; attack cells always draw above them.
  for (let i = 0; i < 22; i++) {
    const x =
      1 + ((hash(i, 13) * (map.width - 2) + r.time * 0.035) % (map.width - 2));
    const y =
      1 + hash(i, 23) * (map.height - 2) + Math.sin(r.time * 0.6 + i) * 0.12;
    const p = point(x, y);
    const glow = 0.22 + (Math.sin(r.time * 1.8 + i * 2) + 1) * 0.16;
    c.globalAlpha = glow;
    r.rect(p.x - 2, p.y - 2, 5, 5, r.palette.accent + "30");
    r.rect(p.x, p.y, 1, 1, r.palette.light);
  }
  c.restore();
}
