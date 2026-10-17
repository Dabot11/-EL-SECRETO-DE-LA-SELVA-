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
import { canDetect, updateGuard, updateCompanion } from "../src/ai.js";
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
  Object.assign(p, { x, y, protection: 0, state: PlayerState.NORMAL });
}
function tick(g, seconds, inputs) {
  for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, inputs);
}

test("el mapa tiene siete grupos de arbustos, patrullas accesibles y dos rutas independientes por el río", () => {
  const map = createMap();
  assert.equal(map.bushGroups.length, 7);
  for (const row of [4, 10]) {
    map.cells[row][8] = TILE.WATER;
    assert.ok(findPath(map, map.base, map.pedestal).length > 0);
    assert.ok(findPath(map, map.pedestal, map.base).length > 0);
    map.cells[row][8] = TILE.BRIDGE;
  }
  for (const p of map.patrols)
    for (const [x, y] of p.route)
      assert.ok(findPath(map, map.base, { x, y }).length);
  for (const group of map.bushGroups)
    for (const [x, y] of group)
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

test("movimiento relativo a pantalla y velocidad diagonal normalizada", () => {
  const g = game();
  g.guards = [];
  const p = g.players[0];
  const measure = (input) => {
    position(p, 5.5, 11.5);
    const start = { ...p };
    g.movePlayer(p, input, 0.05);
    return projectVector(p.x - start.x, p.y - start.y);
  };
  const up = measure({ x: 0, y: -1 }),
    right = measure({ x: 1, y: 0 }),
    diagonal = measure({ x: 1, y: 1 });
  assert.ok(Math.abs(up.x) < 1e-6 && up.y < 0);
  assert.ok(right.x > 0 && Math.abs(right.y) < 1e-6);
  assert.ok(
    Math.abs(Math.hypot(diagonal.x, diagonal.y) - Math.hypot(up.x, up.y)) <
      1e-6,
  );
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

test("muros y agua bloquean, los puentes y arbustos permiten caminar", () => {
  const map = createMap();
  const p = { x: 7.5, y: 6.5 };
  moveBody(p, 3, 0, map);
  assert.ok(p.x <= 8 - CONFIG.bodyRadius + 0.001);
  assert.ok(canOccupy(map, p.x, p.y));
  Object.assign(p, { x: 3.5, y: 3.5 });
  moveBody(p, 4, 0, map);
  assert.ok(p.x < 4);
  Object.assign(p, { x: 7.5, y: 4.5 });
  moveBody(p, 2, 0, map);
  assert.ok(p.x > 9);
  assert.ok(canOccupy(map, 3.5, 9.5));
  assert.ok(isBush(map, 3.5, 9.5));
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

test("un golpe anunciado captura e inmoviliza sin gastar un intento", () => {
  const g = game();
  position(g.players[0], 5.5, 5.5);
  Object.assign(g.guards[0], { x: 5.5, y: 5.5, attackCooldown: 0 });
  g.update(0.01);
  assert.notEqual(g.players[0].state, PlayerState.CAPTURED);
  tick(g, 0.9);
  assert.equal(g.players[0].state, PlayerState.CAPTURED);
  assert.equal(g.attempts, 3);
  const before = { ...g.players[0] };
  tick(g, 0.5, [
    { x: 1, y: 1 },
    { x: 0, y: 0 },
  ]);
  assert.equal(distance(before, g.players[0]), 0);
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

test("la IA navega por el puente hasta rescatar al humano sin teletransportarse", () => {
  const g = game(1);
  g.guards = [];
  position(g.players[0], 10.5, 4.5);
  position(g.players[1], 6.5, 4.5);
  g.capture(g.players[0]);
  let previous = { ...g.players[1] };
  for (
    let i = 0;
    i < 1800 && g.players[0].state === PlayerState.CAPTURED;
    i++
  ) {
    g.update(1 / 60);
    assert.ok(canOccupy(g.map, g.players[1].x, g.players[1].y));
    const delta = projectVector(
      g.players[1].x - previous.x,
      g.players[1].y - previous.y,
    );
    assert.ok(Math.hypot(delta.x, delta.y) <= CONFIG.playerSpeed / 60 + 0.001);
    previous = { ...g.players[1] };
  }
  assert.notEqual(g.players[0].state, PlayerState.CAPTURED);
  assert.equal(g.attempts, 3);
});

test("la IA se esconde con el humano y también puede ser capturada y rescatada", () => {
  const g = game(1);
  g.guards = [];
  position(g.players[0], 3.5, 9.5);
  position(g.players[1], 5.5, 9.5);
  tick(g, 3);
  assert.equal(g.players[1].state, PlayerState.HIDDEN);
  position(g.players[1], 5.5, 11.5);
  g.capture(g.players[1]);
  assert.equal(g.players[1].state, PlayerState.CAPTURED);
  position(g.players[0], 5.9, 11.5);
  tick(g, 0.65);
  assert.equal(g.players[1].state, PlayerState.PROTECTED);
});

test("la bandera se recoge por contacto y solo tiene un portador", () => {
  const g = game();
  g.runes.forEach((r) => (r.active = true));
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
  g.guards = [];
  position(g.players[0], 14.5, 2.5);
  g.collectFlag();
  position(g.players[0], 12.5, 3.5);
  g.capture(g.players[0]);
  assert.equal(g.flag.state, FlagState.DROPPED);
  assert.equal(g.flag.carrier, null);
  assert.ok(isWalkable(g.map, g.flag.x, g.flag.y));
  assert.equal(g.flag.x, 12.5);
  position(g.players[1], 12.5, 3.5);
  g.update(0.01);
  assert.equal(g.flag.state, FlagState.CARRIED);
  assert.equal(g.flag.carrier, 1);
  assert.equal(g.attempts, 3);
});

test("captura doble resta exactamente un intento y reinicia todo el nivel", () => {
  const g = game();
  g.runes.forEach((r) => (r.active = true));
  position(g.players[0], 14.5, 2.5);
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
  assert.ok(g.players.every((p) => distance(p, g.map.base) < 1));
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
  position(g.players[1], 2.9, 11.5);
  g.capture(g.players[1]);
  g.checkOutcome();
  assert.equal(g.state, GameState.PLAYING);
  g.rescue(CONFIG.rescueTime);
  g.checkOutcome();
  assert.equal(g.state, GameState.MISSION_COMPLETE);
});

test("el compañero IA completa el regreso a la base", () => {
  const g = game(1);
  g.guards = [];
  Object.assign(g.flag, { state: FlagState.CARRIED, carrier: 0 });
  position(g.players[1], 6.5, 10.5);
  tick(g, 10);
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
  test(`partida completa, modo ${mode}: runas, evasión, bandera y victoria con guardianes activos`, () => {
    const result = playJourney(new Game(), mode);
    assert.equal(result.state, GameState.MISSION_COMPLETE);
    assert.ok(result.attempts > 0);
    assert.equal(result.runes, 1);
    assert.ok(result.dashes > 0);
    assert.ok(result.flags > 0);
  });
