export const TILE = Object.freeze({
  FLOOR: ".",
  WALL: "#",
  WATER: "~",
  BRIDGE: "=",
  BUSH: "b",
  BASE: "s",
});

export function createMap() {
  const width = 18,
    height = 14;
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1
        ? TILE.WALL
        : TILE.FLOOR,
    ),
  );
  for (let y = 1; y < 13; y++) cells[y][8] = TILE.WATER;
  cells[4][8] = cells[10][8] = TILE.BRIDGE;
  for (const [x, y] of [
    [4, 2],
    [4, 3],
    [4, 4],
    [4, 6],
    [4, 7],
    [2, 6],
    [6, 2],
    [6, 7],
    [11, 5],
    [11, 6],
    [11, 8],
    [11, 9],
    [11, 10],
    [14, 6],
    [15, 6],
    [16, 6],
    [15, 10],
  ])
    cells[y][x] = TILE.WALL;
  const bushGroups = [
    [
      [3, 9],
      [4, 9],
    ],
    [
      [2, 4],
      [2, 5],
    ],
    [
      [6, 3],
      [7, 3],
    ],
    [
      [6, 10],
      [7, 10],
    ],
    [
      [9, 3],
      [10, 3],
    ],
    [
      [12, 10],
      [12, 11],
    ],
    [
      [14, 4],
      [15, 4],
    ],
  ];
  for (const group of bushGroups)
    for (const [x, y] of group) cells[y][x] = TILE.BUSH;
  for (let y = 10; y <= 12; y++)
    for (let x = 1; x <= 3; x++) cells[y][x] = TILE.BASE;
  return {
    width,
    height,
    cells,
    bushGroups,
    base: { x: 2.5, y: 11.5 },
    pedestal: { x: 14.5, y: 2.5 },
    spawns: [
      { x: 2.1, y: 11.5 },
      { x: 2.9, y: 11.5 },
    ],
    patrols: [
      {
        type: "stone",
        route: [
          [5, 5],
          [7, 5],
          [7, 8],
          [5, 8],
        ],
      },
      {
        type: "stone",
        route: [
          [12, 2],
          [15, 2],
          [15, 4],
          [12, 4],
        ],
      },
      {
        type: "spirit",
        route: [
          [9, 7],
          [13, 7],
          [13, 11],
          [9, 11],
        ],
      },
    ],
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
