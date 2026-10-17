import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { Progress } from "../src/progress.js";
import { CONFIG, PlayerState, FlagState, GuardState } from "../src/config.js";
import { ENEMIES, trapPhase } from "../src/challenges.js";
import { canDetect, updateGuard, dangerAt } from "../src/ai.js";
import { canOccupy, distance, projectVector } from "../src/collisions.js";
import { findPath } from "../src/navigation.js";
import { playJourney } from "./journey.js";
const memory = () => {
  let value = null;
  return { getItem: () => value, setItem: (_, v) => (value = v) };
};
const tick = (g, seconds, inputs) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, inputs);
};
function fixture(index = 0) {
  const g = new Game(new Progress(memory()));
  g.start(2, index);
  g.guards = [];
  for (const p of g.players) {
    p.protection = 0;
    p.state = PlayerState.NORMAL;
  }
  return g;
}
const place = (p, target) =>
  Object.assign(p, {
    x: target.x,
    y: target.y,
    protection: 0,
    state: PlayerState.NORMAL,
    dashTime: 0,
  });
const result = (stars = 2, time = 40, score = 1000) => ({ stars, time, score });
function arena(type = "stone") {
  const g = fixture();
  g.map.cells = Array.from({ length: 14 }, (_, y) =>
    Array.from({ length: 18 }, (_, x) =>
      x === 0 || x === 17 || y === 0 || y === 13 ? "#" : ".",
    ),
  );
  g.start(2); // Get a real configured guardian, then use a clear testing area.
  const guard = g.guards[0];
  g.guards = [guard];
  g.map.cells = Array.from({ length: 14 }, (_, y) =>
    Array.from({ length: 18 }, (_, x) =>
      x === 0 || x === 17 || y === 0 || y === 13 ? "#" : ".",
    ),
  );
  Object.assign(guard, { type, x: 7.5, y: 6.5, attackCooldown: 0 });
  place(g.players[0], { x: 8, y: 6.5 });
  place(g.players[1], g.map.base);
  return { g, guard, p: g.players[0] };
}

test("todas las runas, tesoros y trampas están en suelo alcanzable y fuera de la entrada", () => {
  for (let i = 0; i < 5; i++) {
    const g = fixture(i);
    if (g.bridge) g.openBridge();
    for (const item of [...g.runes, ...g.relics, ...g.traps]) {
      assert.ok(canOccupy(g.map, item.x, item.y));
      assert.ok(findPath(g.map, g.map.base, item).length);
      assert.ok(distance(item, g.map.base) > CONFIG.safeRadius);
    }
  }
});
test("la bandera queda sellada hasta activar todas las runas; salir interrumpe la carga", () => {
  const g = fixture(1),
    p = g.players[0];
  place(p, g.flag);
  g.collectFlag();
  assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
  assert.equal(g.alarm, false);
  place(p, g.runes[0]);
  tick(g, 0.3);
  assert.ok(g.runes[0].progress > 0 && !g.runes[0].active);
  place(p, g.map.base);
  tick(g, 0.05);
  assert.equal(g.runes[0].progress, 0);
  place(p, g.runes[0]);
  tick(g, 0.7);
  place(p, g.flag);
  g.collectFlag();
  assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
  place(p, g.runes[1]);
  tick(g, 0.7);
  place(p, g.flag);
  g.collectFlag();
  assert.equal(g.flag.state, FlagState.CARRIED);
  assert.equal(g.alarm, true);
});
test("cada tesoro se cobra una vez y un intento nuevo restaura los objetivos", () => {
  const g = fixture(1);
  place(g.players[0], g.relics[0]);
  tick(g, 1);
  assert.equal(g.events.filter((e) => e.type === "relic").length, 1);
  g.runes[0].active = true;
  g.alarm = true;
  g.players.forEach((p) => {
    p.protection = 0;
    g.capture(p);
  });
  g.checkOutcome();
  tick(g, 2.3);
  assert.ok(g.relics.every((r) => !r.collected));
  assert.ok(g.runes.every((r) => !r.active));
  assert.equal(g.alarm, false);
  assert.equal(g.stats.captures, 2);
});
test("rescatar exige permanecer cerca, se interrumpe al alejarse y protege a ambos", () => {
  const g = fixture();
  place(g.players[0], { x: 5.5, y: 11.5 });
  place(g.players[1], { x: 6, y: 11.5 });
  g.capture(g.players[0]);
  tick(g, 0.3);
  assert.equal(g.players[0].state, "CAPTURED");
  assert.ok(g.players[0].rescueProgress > 0);
  place(g.players[1], g.map.base);
  tick(g, 0.05);
  assert.equal(g.players[0].rescueProgress, 0);
  place(g.players[1], { x: 6, y: 11.5 });
  tick(g, 0.65);
  assert.equal(g.players[0].state, "PROTECTED");
  assert.ok(g.players[1].protection > 0);
  assert.equal(g.stats.rescues, 1);
  assert.equal(g.capture(g.players[1]), false);
});
test("el impulso da exactamente un paso rápido y no permite atravesar agua", () => {
  const g = fixture(),
    p = g.players[0];
  g.map.cells[6][7] = ".";
  g.map.cells[6][8] = ".";
  g.map.cells[6][9] = "~";
  place(p, { x: 7.5, y: 6.5 });
  g.movePlayer(p, { x: 1, y: 0, dash: true }, 0.01);
  assert.equal(p.x, 8.5);
  assert.equal(g.stats.dashes, 1);
  assert.equal(g.capture(p), false);
  tick(g, 0.5, [
    { x: 1, y: 0, dash: true },
    { x: 0, y: 0 },
  ]);
  assert.equal(p.x, 8.5);
  assert.equal(g.stats.dashes, 1);
  assert.equal(p.dashTime, 0);
  assert.equal(g.capture(p), true);
  const before = p.x;
  g.movePlayer(p, { x: -1, y: 0, dash: true }, 0.05);
  assert.equal(p.x, before - 1);
  assert.equal(p.dashTime, 0);
});
test("la pausa congela impulso, trampas, cronómetro y carga de runas", () => {
  const g = fixture(2);
  place(g.players[0], g.runes[0]);
  g.movePlayer(g.players[0], { x: 1, y: 0, dash: true }, 0.01);
  g.togglePause();
  const before = JSON.stringify([g.time, g.stats, g.players, g.runes]);
  tick(g, 4);
  assert.equal(JSON.stringify([g.time, g.stats, g.players, g.runes]), before);
});
for (const type of ["stone", "spirit", "warden"])
  test(`${type}: aviso visible antes del golpe, escape posible y recuperación después`, () => {
    const { g, guard, p } = arena(type);
    updateGuard(guard, g, 0.01);
    assert.equal(guard.state, GuardState.WINDUP);
    assert.equal(p.state, PlayerState.NORMAL);
    assert.ok(dangerAt(g, p));
    const origin = { ...guard.attack.origin };
    place(p, { x: 12, y: 9 });
    for (let i = 0; i < Math.ceil(ENEMIES[type].windup * 100) + 5; i++)
      updateGuard(guard, g, 0.01);
    assert.equal(p.state, PlayerState.NORMAL);
    assert.equal(guard.state, GuardState.RECOVER);
    assert.equal(distance(guard, origin), 0);
  });
test("un pulso atrapa al jugador que ignora el aviso y respeta la zona segura", () => {
  const { g, guard, p } = arena("spirit");
  updateGuard(guard, g, 0.01);
  for (let i = 0; i < 110; i++) updateGuard(guard, g, 0.01);
  assert.equal(p.state, "CAPTURED");
  place(p, g.map.base);
  Object.assign(guard, { x: p.x, y: p.y });
  assert.equal(canDetect(guard, p, g.map, 99), false);
});
test("el jaguar fija la dirección al avisar y su salto se detiene ante un muro", () => {
  const { g, guard, p } = arena("hunter");
  updateGuard(guard, g, 0.01);
  const aim = { ...guard.attack.end };
  place(p, { x: 7.5, y: 9 });
  assert.deepEqual(guard.attack.end, aim);
  g.map.cells[6][9] = "#";
  for (let i = 0; i < 110; i++) {
    updateGuard(guard, g, 0.01);
    assert.ok(canOccupy(g.map, guard.x, guard.y));
  }
  assert.ok(guard.x < 9);
  assert.equal(p.state, PlayerState.NORMAL);
  assert.equal(guard.state, GuardState.RECOVER);
});
test("el ataque no se inicia a través de paredes", () => {
  const { g, guard, p } = arena("warden");
  g.map.cells[6][8] = "#";
  place(p, { x: 9.5, y: 6.5 });
  updateGuard(guard, g, 0.01);
  assert.notEqual(guard.state, GuardState.WINDUP);
});

test("las trampas avisan antes de frenar y el impulso permite cruzarlas", () => {
  const g = fixture(2),
    trap = g.traps[0],
    p = g.players[0];
  place(p, trap);
  g.time = 4.5 - trap.offset;
  g.collectObjectives(0.01);
  assert.equal(trapPhase(trap, g.time), "warning");
  assert.equal(p.slowTime, 0);
  g.time = 5.5 - trap.offset;
  g.collectObjectives(0.01);
  assert.ok(p.slowTime > 0);
  p.slowTime = 0;
  p.dashTime = 0.2;
  g.collectObjectives(0.01);
  assert.equal(p.slowTime, 0);
});
test("estrellas premian completar, explorar y evitar capturas; rescatar no permite cultivar puntos", () => {
  const g = fixture();
  g.stats.time = 30;
  g.finishMission();
  assert.equal(g.result.stars, 2);
  const points = g.result.score;
  g.stats.rescues = 999;
  g.finishMission();
  assert.equal(g.result.score, points);
  g.relics.forEach((r) => (r.collected = true));
  g.finishMission();
  assert.equal(g.result.stars, 3);
  g.stats.captures = 3;
  g.finishMission();
  assert.equal(g.result.stars, 2);
  assert.ok(g.result.score < points + 600);
  g.stats.captures = 0;
  g.attempts = 2;
  g.finishMission();
  assert.equal(g.result.stars, 2);
});
test("el guardado conserva récords independientes y desbloqueos por modalidad", () => {
  const storage = memory(),
    p = new Progress(storage);
  p.complete(1, 0, result(3, 40, 1500));
  p.complete(1, 0, result(1, 50, 900));
  p.complete(1, 0, result(2, 35, 1600));
  const reload = new Progress(storage);
  assert.deepEqual(reload.record(1, 0), result(3, 35, 1600));
  assert.equal(reload.unlocked(1, 1), true);
  assert.equal(reload.unlocked(2, 1), false);
  assert.deepEqual(reload.data.checkpoint, { mode: 1, index: 1 });
});
test("continuar conserva misión y modo sin persistir estados transitorios", () => {
  const storage = memory(),
    g = new Game(new Progress(storage));
  g.start(2);
  g.progress.complete(2, 0, result());
  g.start(2, 1);
  g.stats.time = 16;
  g.players[0].state = "CAPTURED";
  const reload = new Game(new Progress(storage)),
    saved = reload.progress.data.checkpoint;
  reload.start(saved.mode, saved.index);
  assert.equal(reload.mode, 2);
  assert.equal(reload.missionIndex, 1);
  assert.equal(reload.stats.time, 0);
  assert.equal(reload.attempts, 3);
  assert.notEqual(reload.players[0].state, "CAPTURED");
});
test("datos corruptos, almacenamiento bloqueado y récords inválidos no impiden jugar", () => {
  for (const storage of [
    null,
    { getItem: () => "{bad", setItem: () => {} },
    {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    },
    {
      getItem: () =>
        JSON.stringify({
          version: 1,
          checkpoint: { mode: 1, index: 4 },
          records: { 1: [{ stars: 99, time: -1, score: -4 }] },
        }),
      setItem: () => {},
    },
  ]) {
    const progress = new Progress(storage),
      g = new Game(progress);
    assert.equal(progress.data.checkpoint, null);
    assert.equal(progress.record(1, 0), null);
    g.start(1);
    g.update(0.01);
    assert.equal(g.state, "PLAYING");
  }
});
for (const mode of [1, 2])
  test(`los cinco mapas pueden completarse buscando todos los tesoros en modo ${mode}`, () => {
    for (let i = 0; i < 5; i++) {
      const r = playJourney(new Game(), mode, i, false, true);
      assert.equal(
        r.state,
        i === 4 ? "VICTORY" : "MISSION_COMPLETE",
        `Misión ${i + 1}`,
      );
      assert.equal(r.relics, 3);
      assert.ok(r.stars >= 2);
    }
  });

test("los guardianes abandonan la persecución fuera de su zona y evitan acumularse por todo el mapa", () => {
  const { g, guard, p } = arena();
  place(p, { x: 8, y: 6.5 });
  assert.equal(canDetect(guard, p, g.map, 99), true);
  place(p, { x: 15, y: 11 });
  assert.equal(canDetect(guard, p, g.map, 99), false);
  guard.state = GuardState.CHASE;
  guard.lastSeen = { x: 8, y: 6.5 };
  updateGuard(guard, g, 0.01);
  assert.equal(guard.state, GuardState.SEARCH);
});
test("los ataques cercanos se turnan y un salto no rebasa su aviso con frames largos", () => {
  const { g, guard, p } = arena("hunter");
  const other = {
    ...guard,
    id: 1,
    x: 7.6,
    y: 6.5,
    route: guard.route.map((p) => ({ ...p })),
  };
  g.guards.push(other);
  updateGuard(guard, g, 0.01);
  updateGuard(other, g, 0.01);
  assert.equal(guard.state, GuardState.WINDUP);
  assert.notEqual(other.state, GuardState.WINDUP);
  const end = { ...guard.attack.end };
  place(p, { x: 13, y: 11 });
  while (guard.state === GuardState.WINDUP) updateGuard(guard, g, 0.05);
  while (guard.state === GuardState.LUNGE) updateGuard(guard, g, 0.05);
  assert.equal(guard.state, GuardState.RECOVER);
  assert.ok(distance(guard, end) < 0.001);
});
