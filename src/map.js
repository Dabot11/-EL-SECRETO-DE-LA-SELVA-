import { CHALLENGES } from "./challenges.js";
import { MISSIONS } from "./missions.js";
export const TILE = Object.freeze({
  FLOOR: ".",
  WALL: "#",
  WATER: "~",
  BRIDGE: "=",
  BUSH: "b",
  BASE: "s",
});
export function createMap(index = 0, mode = 2) {
  if (!Number.isInteger(index) || !MISSIONS[index])
    throw new RangeError("Misión inválida");
  const mission = { ...MISSIONS[index], ...CHALLENGES[index] },
    width = 18,
    height = 14;
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1
        ? TILE.WALL
        : TILE.FLOOR,
    ),
  );
  for (const [type, positions] of [
    [TILE.WATER, mission.water],
    [TILE.BRIDGE, [...mission.bridges, ...(mission.extraBridges ?? [])]],
    [TILE.WALL, mission.walls],
  ])
    for (const [x, y] of positions) cells[y][x] = type;
  for (const group of mission.bushes)
    for (const [x, y] of group) cells[y][x] = TILE.BUSH;
  for (let y = 10; y <= 12; y++)
    for (let x = 1; x <= 3; x++) cells[y][x] = TILE.BASE;
  const expandedWidth = 28,
    expandedHeight = 20;
  const axis = (oldSize, newSize) =>
    Array.from({ length: oldSize }, (_, i) =>
      i === 0
        ? [0]
        : i === oldSize - 1
          ? [newSize - 1]
          : Array.from(
              {
                length:
                  Math.floor((i * (newSize - 2)) / (oldSize - 2)) -
                  Math.floor(((i - 1) * (newSize - 2)) / (oldSize - 2)),
              },
              (_, j) =>
                1 + Math.floor(((i - 1) * (newSize - 2)) / (oldSize - 2)) + j,
            ),
    );
  const xs = axis(width, expandedWidth),
    ys = axis(height, expandedHeight);
  const point = ([x, y]) => [
    xs[x][Math.floor((xs[x].length - 1) / 2)],
    ys[y][Math.floor((ys[y].length - 1) / 2)],
  ];
  const world = (p) => {
    const [x, y] = point([Math.floor(p.x), Math.floor(p.y)]);
    return { x: x + 0.5, y: y + 0.5 };
  };
  const region = ([x, y]) => ys[y].flatMap((yy) => xs[x].map((xx) => [xx, yy]));
  const expanded = Array.from({ length: expandedHeight }, () =>
    Array(expandedWidth).fill(TILE.WALL),
  );
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (const [xx, yy] of region([x, y])) expanded[yy][xx] = cells[y][x];
  const converted = {
    ...mission,
    runes: mission.runes.map(point),
    relics: mission.relics.map(point),
    traps: mission.traps.map((t) => {
      const [x, y] = point([t.x, t.y]);
      return { ...t, x, y };
    }),
    bridge: mission.bridge
      ? {
          statue: world(mission.bridge.statue),
          winch: world(mission.bridge.winch),
          tiles: mission.bridge.tiles.flatMap(region),
        }
      : null,
    patrols: mission.patrols.map((p) => ({ ...p, route: p.route.map(point) })),
  };
  const base = world({ x: 2.5, y: 11.5 });
  return {
    width: expandedWidth,
    height: expandedHeight,
    mode,
    revision: 0,
    cells: expanded,
    mission: converted,
    index,
    theme: mission.theme,
    bushGroups: mission.bushes.map((group) => group.flatMap(region)),
    base,
    pedestal: world({
      x: mission.pedestal[0] + 0.5,
      y: mission.pedestal[1] + 0.5,
    }),
    spawns: [
      { x: base.x - 1, y: base.y },
      { x: base.x, y: base.y },
    ],
    patrols: converted.patrols,
  };
}

export function tileAt(map, x, y) {
  return map.cells[Math.floor(y)]?.[Math.floor(x)] ?? TILE.WALL;
}
export function isWalkable(map, x, y) {
  return ![TILE.WALL, TILE.WATER].includes(tileAt(map, x, y));
}
export function isBush(map, x, y) {
  return tileAt(map, x, y) === TILE.BUSH;
}
