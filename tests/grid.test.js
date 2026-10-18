import { MISSIONS } from "../src/missions.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { CONFIG, GuardState, GameState, PlayerState } from "../src/config.js";
import { createMap, TILE, isWalkable } from "../src/map.js";
import {
  stepBody,
  tickMotion,
  renderPosition,
  centered,
  sameTile,
} from "../src/grid.js";
import { findPath, navigate } from "../src/navigation.js";
import { attackCells, attackHits, updateGuard } from "../src/ai.js";
import { toScreen } from "../src/renderer.js";
import { Progress } from "../src/progress.js";
const tick = (g, n, input) => {
  for (let i = 0; i < n; i++) g.update(1 / 60, input);
};
const arena = (mode = 2) => {
  const g = new Game(new Progress(null));
  g.start(mode, 1);
  g.map.cells = g.map.cells.map((row, y) =>
    row.map((_, x) =>
      x === 0 || y === 0 || x === g.map.width - 1 || y === g.map.height - 1
        ? "#"
        : ".",
    ),
  );
  g.traps = [];
  g.runes = [];
  g.relics = [];
  g.players.forEach((p, i) =>
    Object.assign(p, {
      x: 6.5 + i,
      y: 7.5,
      motion: null,
      protection: 0,
      state: PlayerState.NORMAL,
    }),
  );
  return g;
};

test("la proyección usa cuadrados alineados con los ejes de pantalla", () => {
  const p = toScreen(1.5, 2.5),
    right = toScreen(2.5, 2.5),
    down = toScreen(1.5, 3.5);
  assert.equal(right.y, p.y);
  assert.equal(down.x, p.x);
  assert.equal(right.x - p.x, down.y - p.y);
  assert.equal(CONFIG.tileWidth, CONFIG.tileHeight);
});
test("los diez mapas crecen a 560 casillas y conservan conectividad y objetivos", () => {
  for (let i = 0; i < MISSIONS.length; i++) {
    const map = createMap(i);
    assert.equal(map.width, 28);
    assert.equal(map.height, 20);
    assert.equal(map.cells.flat().length, 560);
    for (const [x, y] of [...map.mission.runes, ...map.mission.relics])
      assert.ok(findPath(map, map.base, { x: x + 0.5, y: y + 0.5 }).length);
    for (const p of [
      map.base,
      map.pedestal,
      ...map.spawns,
      ...map.patrols.flatMap((p) =>
        p.route.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })),
      ),
    ]) {
      assert.ok(centered(p));
      assert.ok(isWalkable(map, p.x, p.y));
    }
  }
});
test("un toque completa exactamente una casilla con interpolación visual cardinal", () => {
  const g = arena();
  g.guards = [];
  const p = g.players[0],
    from = { x: p.x, y: p.y };
  g.update(1 / 60, [{ x: 0, y: 0, pressed: { x: 1, y: 0 } }]);
  assert.equal(p.x, from.x + 1);
  assert.equal(p.y, from.y);
  assert.deepEqual(renderPosition(p), from);
  g.update(0.05);
  const visual = renderPosition(p);
  assert.ok(visual.x > from.x && visual.x < p.x);
  assert.equal(visual.y, from.y);
  tick(g, 60);
  assert.deepEqual([p.x, p.y], [from.x + 1, from.y]);
  assert.equal(p.motion, null);
});
test("una dirección nueva durante un paso espera al centro y se ejecuta una vez", () => {
  const g = arena();
  g.guards = [];
  const p = g.players[0];
  g.update(0.01, [{ x: 1, y: 0 }]);
  g.update(0.01, [{ x: 0, y: 0, pressed: { x: 0, y: -1 } }]);
  assert.deepEqual([p.x, p.y], [7.5, 7.5]);
  tick(g, 60);
  assert.deepEqual([p.x, p.y], [7.5, 6.5]);
  assert.equal(p.motion, null);
});
test("mantener una dirección encadena pasos completos sin acelerar en diagonal", () => {
  const a = arena(),
    b = arena();
  a.guards = [];
  b.guards = [];
  for (let i = 0; i < 60; i++) {
    a.update(1 / 60, [{ x: 1, y: 0 }]);
    b.update(1 / 60, [{ x: 1, y: 1 }]);
    assert.ok(centered(a.players[0]));
    assert.deepEqual(
      [a.players[0].x, a.players[0].y],
      [b.players[0].x, b.players[0].y],
    );
  }
  assert.equal(a.players[0].x, 10.5);
});
test("un paso bloqueado no desliza por una esquina ni consume impulso", () => {
  const g = arena();
  g.guards = [];
  const p = g.players[0];
  g.map.cells[7][7] = TILE.WALL;
  g.update(0.05, [{ x: 1, y: 1, dash: true }]);
  assert.deepEqual([p.x, p.y], [6.5, 7.5]);
  assert.equal(p.dashCooldown, 0);
  assert.equal(g.stats.dashes, 0);
});
test("un impulso pedido durante el paso se guarda y recorre una sola casilla", () => {
  const g = arena();
  g.guards = [];
  const p = g.players[0];
  g.update(0.01, [{ x: 1, y: 0 }]);
  g.update(0.01, [{ x: 1, y: 0, dash: true }]);
  tick(g, 60);
  assert.equal(p.x, 8.5);
  assert.equal(g.stats.dashes, 1);
  assert.ok(p.dashCooldown > 0);
});
test("la pausa congela el paso visual y descarta el giro pendiente", () => {
  const g = arena();
  g.guards = [];
  const p = g.players[0];
  g.update(0.01, [{ x: 1, y: 0 }]);
  g.update(0.01, [{ x: 0, y: 0, pressed: { x: 0, y: 1 } }]);
  g.togglePause();
  const before = JSON.stringify(p);
  tick(g, 60);
  assert.equal(JSON.stringify(p), before);
  g.togglePause();
  tick(g, 60);
  assert.deepEqual([p.x, p.y], [7.5, 7.5]);
});
test("la navegación enemiga recorre celdas adyacentes incluso alrededor de paredes", () => {
  const g = arena(),
    guard = g.guards[0];
  Object.assign(guard, { x: 5.5, y: 5.5, motion: null });
  g.map.cells[5][6] = "#";
  const target = { x: 9.5, y: 5.5 };
  let before = { ...guard };
  for (let i = 0; i < 600 && !sameTile(guard, target); i++) {
    navigate(guard, target, 56, 1 / 60, g.map);
    assert.ok(centered(guard));
    assert.ok(Math.abs(guard.x - before.x) + Math.abs(guard.y - before.y) <= 1);
    if (guard.motion) {
      const d = guard.motion.from;
      assert.equal(Math.abs(d.x - guard.x) + Math.abs(d.y - guard.y), 1);
    }
    before = { ...guard };
  }
  assert.ok(sameTile(guard, target));
});
test("el jaguar debe alinearse antes de atacar; su aviso es una línea cardinal", () => {
  const g = arena(),
    guard = g.guards[0],
    p = g.players[0];
  g.guards = [guard];
  Object.assign(guard, {
    x: 7.5,
    y: 6.5,
    motion: null,
    type: "hunter",
    route: [{ x: 7.5, y: 6.5 }],
    attackCooldown: 0,
  });
  Object.assign(p, { x: 9.5, y: 7.5 });
  g.players[1].protection = 99;
  updateGuard(guard, g, 0.01);
  assert.notEqual(guard.state, GuardState.WINDUP);
  for (let i = 0; i < 300 && guard.state !== GuardState.WINDUP; i++)
    updateGuard(guard, g, 1 / 60);
  assert.equal(guard.state, GuardState.WINDUP);
  assert.ok(attackHits(guard.attack, p));
  const cells = guard.attack.cells;
  assert.ok(
    cells.every((c) => c.x === cells[0].x) ||
      cells.every((c) => c.y === cells[0].y),
  );
});
test("la embestida avanza un cuadro por vez y nunca rebasa los cuadros anunciados", () => {
  const g = arena(),
    guard = g.guards[0],
    p = g.players[0];
  g.guards = [guard];
  Object.assign(guard, {
    x: 7.5,
    y: 6.5,
    motion: null,
    type: "hunter",
    route: [{ x: 7.5, y: 6.5 }],
    attackCooldown: 0,
  });
  Object.assign(p, { x: 9.5, y: 6.5 });
  g.players[1].protection = 99;
  g.map.cells[6][10] = "#";
  updateGuard(guard, g, 0.01);
  const marked = guard.attack.cells.map((c) => ({ ...c }));
  p.y = 10.5;
  let before = { ...guard };
  for (
    let i = 0, steps = Math.ceil((guard.attack.duration + 0.6) * 100);
    i < steps;
    i++
  ) {
    updateGuard(guard, g, 0.01);
    assert.ok(Math.abs(guard.x - before.x) + Math.abs(guard.y - before.y) <= 1);
    assert.ok(marked.some((c) => sameTile(c, guard)));
    before = { ...guard };
    if (guard.state === GuardState.RECOVER) break;
  }
  assert.equal(guard.state, GuardState.RECOVER);
  assert.equal(guard.x, 9.5);
});
for (const type of ["stone", "spirit", "warden"])
  test(`${type}: solo golpea las casillas que anunció`, () => {
    const g = arena(),
      guard = g.guards[0];
    g.guards = [guard];
    Object.assign(guard, {
      x: 9.5,
      y: 7.5,
      type,
      motion: null,
      route: [{ x: 9.5, y: 7.5 }],
      attackCooldown: 0,
    });
    Object.assign(g.players[0], { x: 8.5, y: 7.5 });
    Object.assign(g.players[1], { x: 8.5, y: type === "warden" ? 10.5 : 9.5 });
    updateGuard(guard, g, 0.01);
    assert.equal(guard.state, GuardState.WINDUP);
    assert.ok(attackHits(guard.attack, g.players[0]));
    assert.ok(!attackHits(guard.attack, g.players[1]));
    for (
      let i = 0, steps = Math.ceil(guard.attack.duration * 100) + 2;
      i < steps;
      i++
    )
      updateGuard(guard, g, 0.01);
    assert.equal(g.players[0].state, PlayerState.CAPTURED);
    assert.notEqual(g.players[1].state, PlayerState.CAPTURED);
  });
test("los avisos de área no señalan muros ni casillas ocultas tras ellos", () => {
  const g = arena(),
    guard = g.guards[0];
  Object.assign(guard, { x: 9.5, y: 7.5, type: "warden" });
  g.map.cells[7][10] = "#";
  const cells = attackCells(guard, g.players[0], g.map);
  assert.ok(!cells.some((c) => c.x === 10.5 && c.y === 7.5));
  assert.ok(!cells.some((c) => c.x === 11.5 && c.y === 7.5));
});
test("la liana mueve una burbuja por pasos cardinales y permite rescatar sin superponerse", () => {
  const g = arena();
  g.guards = [];
  const [blue, red] = g.players;
  blue.x = 5.5;
  red.x = 8.5;
  g.capture(blue);
  g.useVine(red);
  let before = { ...blue };
  for (let i = 0; i < 120; i++) {
    g.update(1 / 60);
    assert.ok(centered(blue));
    assert.ok(Math.abs(blue.x - before.x) + Math.abs(blue.y - before.y) <= 1);
    before = { ...blue };
  }
  assert.equal(g.stats.rescues, 1);
  assert.equal(blue.x, 7.5);
  assert.equal(red.x, 8.5);
});
test("la versión de cuadrícula conserva desbloqueos de v4 y deja sus récords intactos en la copia", () => {
  const data = {
      version: 2,
      checkpoint: { mode: 2, index: 3 },
      unlocked: { 1: 2, 2: 4 },
      records: { 1: [{ stars: 3, time: 30, score: 1000 }], 2: [] },
    },
    m = new Map([["selva-progress-v4", JSON.stringify(data)]]);
  const storage = {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, v),
    },
    p = new Progress(storage);
  assert.ok(p.unlocked(2, 3));
  assert.equal(p.record(1, 0), null);
  assert.deepEqual(p.data.checkpoint, { mode: 2, index: 3 });
  assert.equal(m.get("selva-progress-v4"), JSON.stringify(data));
  assert.equal(JSON.parse(m.get("selva-progress-v5")).version, 3);
});

test("la casilla inicial del jaguar también golpea al terminar el aviso", () => {
  const g = arena(),
    guard = g.guards[0],
    p = g.players[0];
  g.guards = [guard];
  Object.assign(guard, {
    x: 7.5,
    y: 7.5,
    motion: null,
    type: "hunter",
    route: [{ x: 7.5, y: 7.5 }],
    attackCooldown: 0,
  });
  Object.assign(p, { x: 7.5, y: 7.5 });
  g.players[1].protection = 99;
  updateGuard(guard, g, 0.01);
  assert.equal(guard.state, GuardState.WINDUP);
  assert.ok(attackHits(guard.attack, p));
  for (
    let i = 0, steps = Math.ceil(guard.attack.duration * 100) + 2;
    i < steps;
    i++
  )
    updateGuard(guard, g, 0.01);
  assert.equal(p.state, PlayerState.CAPTURED);
});
