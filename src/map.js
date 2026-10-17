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
export function createMap(index = 0) {
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
  return {
    width,
    height,
    cells,
    mission,
    index,
    theme: mission.theme,
    bushGroups: mission.bushes,
    base: { x: 2.5, y: 11.5 },
    pedestal: { x: mission.pedestal[0] + 0.5, y: mission.pedestal[1] + 0.5 },
    spawns: [
      { x: 2.1, y: 11.5 },
      { x: 2.9, y: 11.5 },
    ],
    patrols: mission.patrols,
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
