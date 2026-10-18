import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "../src/config.js";
import { createMap, isWalkable, isBush, TILE } from "../src/map.js";
import { findPath, navigate } from "../src/navigation.js";
import {
  distance,
  moveBody,
  canOccupy,
  hasLineOfSight,
  canTravelStraight,
  projectVector,
} from "../src/collisions.js";
import { canDetect, updateGuard } from "../src/ai.js";
import { stepBody, tickMotion } from "../src/grid.js";
import { playJourney } from "./journey.js";

function game(mode = 2) {
  const g = new Game();
  g.start(mode);
  for (const p of g.players) {
    p.protection = 0;
    p.state = PlayerState.NORMAL;
  }
  return g;
}
function position(p, x, y) {
  Object.assign(p, {
    x,
    y,
    protection: 0,
    state: PlayerState.NORMAL,
    motion: null,
  });
}
function openArena(g) {
  g.map.cells = g.map.cells.map((row, y) =>
    row.map((t, x) =>
      x === 0 || y === 0 || x === g.map.width - 1 || y === g.map.height - 1
        ? TILE.WALL
        : TILE.FLOOR,
    ),
  );
}
function tick(g, seconds, inputs) {
  for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, inputs);
}

test("el mapa ampliado conserva arbustos y dos cruces independientes tras abrir el mecanismo", () => {
  const g = game();
  g.start(2, 5);
  g.openBridge();
  const map = g.map;
  assert.equal(map.bushGroups.length, 7);
  for (const upper of [true, false]) {
    const cells = g.bridge.tiles.filter((t) =>
      upper ? t[0] < 15 : t[0] >= 15,
    );
    for (const [x, y] of cells) map.cells[y][x] = TILE.WATER;
    assert.ok(findPath(map, map.base, map.pedestal).length);
    for (const [x, y] of cells) map.cells[y][x] = TILE.BRIDGE;
  }
  for (const patrol of map.patrols)
    for (const [x, y] of patrol.route)
      assert.ok(findPath(map, map.base, { x, y }).length);
});

test("el menú inicia una partida independiente en cada modo", () => {
  const g = new Game();
  assert.equal(g.state, GameState.MENU);
  for (const mode of [1, 2]) {
    g.start(mode);
    assert.equal(g.mode, mode);
    assert.equal(g.state, GameState.PLAYING);
    assert.equal(g.attempts, 3);
  }
});

test("las direcciones de pantalla corresponden a un paso cardinal, nunca diagonal", () => {
  const g = game();
  openArena(g);
  g.guards = [];
  const p = g.players[0];
  for (const [input, expected] of [
    [{ x: 0, y: -1 }, [5.5, 10.5]],
    [{ x: 1, y: 0 }, [6.5, 11.5]],
    [{ x: 1, y: 1 }, [6.5, 11.5]],
  ]) {
    position(p, 5.5, 11.5);
    g.movePlayer(p, input, 0.05);
    assert.deepEqual([p.x, p.y], expected);
  }
});

test("dos jugadores se mueven simultáneamente", () => {
  const g = game();
  g.guards = [];
  const before = g.players.map((p) => ({ ...p }));
  tick(g, 0.2, [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]);
  assert.ok(g.players.every((p, i) => distance(p, before[i]) > 0.1));
});

test("un paso no entra en agua ni muros, pero sí en puentes y arbustos", () => {
  const g = game();
  openArena(g);
  const p = g.players[0];
  for (const tile of [TILE.WALL, TILE.WATER, TILE.BRIDGE, TILE.BUSH]) {
    position(p, 5.5, 5.5);
    g.map.cells[5][6] = tile;
    assert.equal(
      stepBody(p, { x: 1, y: 0 }, 112, g.map),
      tile === TILE.BRIDGE || tile === TILE.BUSH,
    );
    assert.ok(canOccupy(g.map, p.x, p.y));
  }
});

test("los movimientos diagonales no atraviesan esquinas sólidas", () => {
  const map = {
    width: 4,
    height: 4,
    cells: [
      ["#", "#", "#", "#"],
      ["#", ".", "#", "#"],
      ["#", "#", ".", "#"],
      ["#", "#", "#", "#"],
    ],
  };
  const p = { x: 1.5, y: 1.5 };
  moveBody(p, 2, 2, map);
  assert.ok(p.x < 2 && p.y < 2);
  assert.deepEqual(findPath(map, { x: 1.5, y: 1.5 }, { x: 2.5, y: 2.5 }), []);
  assert.equal(
    hasLineOfSight(map, { x: 1.5, y: 1.5 }, { x: 2.5, y: 2.5 }),
    false,
  );
});

test("entrar en arbusto oculta automáticamente y salir vuelve a mostrar", () => {
  const g = game();
  g.guards = [];
  g.map.cells[9][3] = TILE.BUSH;
  g.map.cells[8][3] = TILE.FLOOR;
  position(g.players[0], 3.5, 9.5);
  g.update(0.01);
  assert.equal(g.players[0].state, PlayerState.HIDDEN);
  position(g.players[0], 3.5, 8.5);
  g.update(0.01);
  assert.equal(g.players[0].state, PlayerState.NORMAL);
});

test("los guardianes no detectan ocultos ni miran a través de paredes", () => {
  const g = game(),
    guard = g.guards[0],
    p = g.players[0];
  openArena(g);
  guard.route = [{ x: 5.5, y: 5.5 }];
  g.map.cells[9][3] = TILE.BUSH;
  g.map.cells[3][4] = TILE.WALL;
  position(p, 3.5, 9.5);
  Object.assign(guard, { x: 3.5, y: 8.5 });
  g.refreshPlayerStates();
  assert.equal(canDetect(guard, p, g.map), false);
  position(p, 3.5, 3.5);
  Object.assign(guard, { x: 5.5, y: 3.5 });
  assert.equal(canDetect(guard, p, g.map), false);
  position(p, 6.5, 5.5);
  Object.assign(guard, { x: 5.5, y: 5.5 });
  assert.equal(canDetect(guard, p, g.map), true);
});

test("guardia recorre PATROL → CHASE → SEARCH → RETURN → PATROL", () => {
  const g = game(),
    guard = g.guards[0];
  openArena(g);
  guard.route = [
    { x: 5.5, y: 5.5 },
    { x: 7.5, y: 5.5 },
  ];
  g.map.cells[9][3] = TILE.BUSH;
  g.map.cells[9][4] = TILE.BUSH;
  position(g.players[0], 5.5, 5.5);
  Object.assign(guard, { x: 7.5, y: 5.5 });
  updateGuard(guard, g, 0.01);
  assert.equal(guard.state, GuardState.CHASE);
  position(g.players[1], 4.5, 9.5);
  position(g.players[0], 3.5, 9.5);
  g.refreshPlayerStates();
  updateGuard(guard, g, 0.01);
  assert.equal(guard.state, GuardState.SEARCH);
  for (let i = 0; i < 130; i++) updateGuard(guard, g, 1 / 60);
  assert.ok([GuardState.RETURN, GuardState.PATROL].includes(guard.state));
  for (let i = 0; i < 600; i++) updateGuard(guard, g, 1 / 60);
  assert.equal(guard.state, GuardState.PATROL);
});

test("un golpe anunciado captura y permite rodar sin gastar un intento", () => {
  const g = game();
  openArena(g);
  g.guards = [g.guards[0]];
  g.guards[0].route = [{ x: 5.5, y: 5.5 }];
  g.guards[0].type = "stone";
  position(g.players[0], 5.5, 5.5);
  Object.assign(g.guards[0], { x: 5.5, y: 5.5, attackCooldown: 0 });
  g.update(0.01);
  assert.notEqual(g.players[0].state, PlayerState.CAPTURED);
  tick(g, g.guards[0].attack.duration + 0.05);
  assert.equal(g.players[0].state, PlayerState.CAPTURED);
  assert.equal(g.attempts, 3);
  const before = { ...g.players[0] };
  tick(g, 0.5, [
    { x: 1, y: 1 },
    { x: 0, y: 0 },
  ]);
  assert.ok(distance(before, g.players[0]) > 0);
  assert.equal(g.capture(g.players[0]), false);
});

test("rescate automático rompe burbuja y protege durante 1.5 segundos", () => {
  const g = game();
  g.guards = [];
  position(g.players[0], 5.5, 11.5);
  position(g.players[1], 6.1, 11.5);
  g.capture(g.players[0]);
  g.rescue(CONFIG.rescueTime);
  assert.equal(g.players[0].state, PlayerState.PROTECTED);
  assert.equal(g.players[0].protection, CONFIG.protectionTime);
  assert.equal(g.attempts, 3);
  assert.equal(g.capture(g.players[0]), false);
  tick(g, 1.6);
  assert.equal(g.players[0].protection, 0);
  assert.equal(g.players[0].state, PlayerState.NORMAL);
});

test("no hay liberación por tiempo ni rescate a través de un muro", () => {
  const g = game();
  g.guards = [];
  position(g.players[0], 3.5, 3.5);
  position(g.players[1], 5.5, 3.5);
  g.capture(g.players[0]);
  tick(g, 6);
  assert.equal(g.players[0].state, PlayerState.CAPTURED);
  assert.equal(g.attempts, 3);
  const map = {
    width: 4,
    height: 4,
    cells: [
      ["#", "#", "#", "#"],
      ["#", ".", "#", "#"],
      ["#", "#", ".", "#"],
      ["#", "#", "#", "#"],
    ],
  };
  g.map = map;
  position(g.players[0], 1.8, 1.8);
  position(g.players[1], 2.2, 2.2);
  g.capture(g.players[0]);
  g.rescue(CONFIG.rescueTime);
  assert.equal(g.players[0].state, PlayerState.CAPTURED);
});

test("la bandera se recoge por contacto y solo tiene un portador", () => {
  const g = game();
  g.runes.forEach((r) => (r.active = true));
  g.openBridge();
  g.guards = [];
  for (const p of g.players) position(p, g.map.pedestal.x, g.map.pedestal.y);
  g.update(0.01);
  assert.equal(g.flag.state, FlagState.CARRIED);
  assert.equal(g.flag.carrier, 0);
  position(g.players[0], 13.5, 2.5);
  g.update(0.01);
  assert.equal(g.flag.carrier, 0);
  assert.equal(g.flag.x, 13.5);
});

test("capturar al portador deja bandera accesible y el compañero puede recogerla", () => {
  const g = game();
  g.runes.forEach((r) => (r.active = true));
  g.openBridge();
  g.guards = [];
  position(g.players[0], g.map.pedestal.x, g.map.pedestal.y);
  g.collectFlag();
  position(g.players[0], 5.5, 11.5);
  g.capture(g.players[0]);
  assert.equal(g.flag.state, FlagState.DROPPED);
  assert.equal(g.flag.carrier, null);
  assert.ok(isWalkable(g.map, g.flag.x, g.flag.y));
  assert.equal(g.flag.x, 5.5);
  position(g.players[1], 5.5, 11.5);
  g.update(0.01);
  assert.equal(g.flag.state, FlagState.CARRIED);
  assert.equal(g.flag.carrier, 1);
  assert.equal(g.attempts, 3);
});

test("captura doble resta exactamente un intento y reinicia todo el nivel", () => {
  const g = game();
  g.runes.forEach((r) => (r.active = true));
  g.openBridge();
  position(g.players[0], g.map.pedestal.x, g.map.pedestal.y);
  g.collectFlag();
  g.players.forEach((p) => g.capture(p));
  g.checkOutcome();
  assert.equal(g.attempts, 2);
  assert.equal(g.state, GameState.ROUND_RESET);
  for (let i = 0; i < 50; i++) g.checkOutcome();
  assert.equal(g.attempts, 2);
  tick(g, 2.4);
  assert.equal(g.state, GameState.PLAYING);
  assert.equal(g.attempts, 2);
  assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
  assert.ok(g.players.every((p) => distance(p, g.map.base) <= 1));
  assert.ok(g.guards.every((p) => p.state === GuardState.PATROL));
});

test("tres capturas dobles causan derrota y reintentar devuelve tres intentos", () => {
  const g = game();
  for (let n = 0; n < 3; n++) {
    g.players.forEach((p) => {
      p.protection = 0;
      g.capture(p);
    });
    g.checkOutcome();
    if (n < 2) tick(g, 2.25);
  }
  assert.equal(g.attempts, 0);
  assert.equal(g.state, GameState.GAME_OVER);
  tick(g, 8);
  assert.equal(g.attempts, 0);
  g.start(1);
  assert.equal(g.attempts, 3);
  assert.equal(g.state, GameState.PLAYING);
  assert.equal(g.flag.carrier, null);
});

test("la victoria exige bandera, ambos libres y ambos en la entrada", () => {
  const g = game();
  g.guards = [];
  g.checkOutcome();
  assert.equal(g.state, GameState.PLAYING);
  Object.assign(g.flag, { state: FlagState.CARRIED, carrier: 0 });
  position(g.players[1], 5.5, 11.5);
  g.checkOutcome();
  assert.equal(g.state, GameState.PLAYING);
  position(g.players[1], g.map.base.x, g.map.base.y);
  g.capture(g.players[1]);
  g.checkOutcome();
  assert.equal(g.state, GameState.PLAYING);
  g.rescue(CONFIG.rescueTime);
  g.checkOutcome();
  assert.equal(g.state, GameState.MISSION_COMPLETE);
});

test("pausar congela lógica, movimiento, guardianes y protección", () => {
  const g = game();
  g.togglePause();
  const before = JSON.stringify({
    players: g.players,
    guards: g.guards,
    time: g.time,
  });
  tick(g, 1);
  assert.equal(
    JSON.stringify({ players: g.players, guards: g.guards, time: g.time }),
    before,
  );
  g.togglePause();
  assert.equal(g.state, GameState.PLAYING);
});

test("navegación exhaustiva: todas las casillas transitables son alcanzables desde la entrada", () => {
  const map = createMap();
  let count = 0;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++)
      if (isWalkable(map, x, y)) {
        assert.ok(findPath(map, map.base, { x, y }).length, `${x},${y}`);
        count++;
      }
  assert.ok(count > 140);
});

test("la navegación física recorre ida y vuelta sin atascarse ni atravesar obstáculos", () => {
  const map = createMap(),
    p = { ...map.base };
  for (const target of [map.pedestal, map.base]) {
    for (let i = 0; i < 6000 && distance(p, target) > 0.1; i++) {
      navigate(p, target, CONFIG.playerSpeed, 1 / 60, map);
      assert.ok(canOccupy(map, p.x, p.y));
    }
    assert.ok(distance(p, target) < 0.1);
  }
});

for (const mode of [1, 2])
  test(`partida completa, modo ${mode}: estatua, herramientas, evasión, reliquia y victoria con guardianes activos`, () => {
    const result = playJourney(new Game(), mode, 5);
    assert.equal(result.state, GameState.MISSION_COMPLETE);
    assert.ok(result.attempts > 0);
    assert.equal(result.runes, 3);
    assert.equal(result.bridge, true);
    assert.ok(result.dashes > 0);
    assert.ok(result.flags > 0);
  });
