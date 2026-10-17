import { MISSIONS } from "../src/missions.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { Progress } from "../src/progress.js";
import {
  CONFIG,
  PlayerState,
  GuardState,
  FlagState,
  GameState,
} from "../src/config.js";
import { updateGuard } from "../src/ai.js";
import { findPath } from "../src/navigation.js";
import { canOccupy, distance, projectVector } from "../src/collisions.js";
const tick = (g, seconds, inputs) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, inputs);
};
const place = (p, x, y) =>
  Object.assign(p, {
    x,
    y,
    state: PlayerState.NORMAL,
    protection: 0,
    dashTime: 0,
  });
function fixture(mode = 2, index = 0) {
  const g = new Game(new Progress(null));
  g.start(mode, index);
  g.players.forEach((p) => place(p, p.x, p.y));
  return g;
}
function arena(mode = 2) {
  const g = fixture(mode, 1);
  g.map.cells = g.map.cells.map((row, y) =>
    row.map((t, x) => (x === 0 || y === 0 || x === 17 || y === 13 ? "#" : ".")),
  );
  g.relics = [];
  g.traps = [];
  g.guards = [g.guards[0]];
  place(g.players[0], 6.5, 6.5);
  if (mode === 2) place(g.players[1], 7, 6.5);
  Object.assign(g.guards[0], {
    x: 8.5,
    y: 6.5,
    type: "stone",
    attackCooldown: 0,
  });
  return g;
}

test("solo tiene un explorador y menos enemigos; conserva al Guardián Solar", () => {
  for (let i = 0; i < MISSIONS.length; i++) {
    const solo = fixture(1, i),
      duo = fixture(2, i);
    assert.equal(solo.players.length, 1);
    assert.equal(solo.guards.length, duo.guards.length - 1);
    if (duo.guards.some((g) => g.type === "warden"))
      assert.ok(solo.guards.some((g) => g.type === "warden"));
  }
  const g = fixture(1);
  const before = { ...g.players[0] };
  tick(g, 0.2, [
    { x: 0, y: 0 },
    { x: 1, y: 1, light: true, vine: true },
  ]);
  assert.equal(distance(before, g.players[0]), 0);
  assert.equal(g.stats.lights, 0);
});
test("solo pierde corazones sin burbujas y no recibe golpes repetidos durante protección", () => {
  const g = arena(1),
    p = g.players[0];
  g.guards = [];
  g.takeFlag(p);
  assert.equal(g.capture(p), true);
  assert.equal(p.hearts, 2);
  assert.equal(p.state, PlayerState.PROTECTED);
  assert.equal(g.flag.carrier, 0);
  assert.equal(g.capture(p), false);
  for (let i = 0; i < 2; i++) {
    tick(g, 1.8);
    assert.equal(g.capture(p), true);
  }
  assert.equal(g.state, GameState.GAME_OVER);
  assert.equal(p.hearts, 0);
  assert.equal(g.stats.captures, 3);
  assert.equal(g.capture(p), false);
  g.retryMission();
  assert.equal(g.missionIndex, 1);
  assert.equal(g.players.length, 1);
  assert.equal(g.players[0].hearts, 3);
  assert.equal(g.flag.carrier, null);
});
test("el campamento cura tras dos segundos antes de la alarma, interrumpir reinicia la espera", () => {
  const g = fixture(1),
    p = g.players[0];
  g.guards = [];
  p.hearts = 1;
  tick(g, 1);
  assert.equal(p.hearts, 1);
  place(p, 5.5, 11.5);
  tick(g, 0.1);
  assert.equal(p.campProgress, 0);
  place(p, g.map.base.x, g.map.base.y);
  tick(g, 1.5);
  assert.equal(p.hearts, 1);
  tick(g, 0.6);
  assert.equal(p.hearts, 3);
  p.hearts = 1;
  g.alarm = true;
  tick(g, 3);
  assert.equal(p.hearts, 1);
});
test("la victoria individual solo exige al explorador y su reliquia", () => {
  const g = fixture(1);
  g.guards = [];
  g.checkOutcome();
  assert.equal(g.state, GameState.PLAYING);
  g.takeFlag(g.players[0]);
  g.checkOutcome();
  assert.equal(g.state, GameState.MISSION_COMPLETE);
});
test("los roles impiden usar la herramienta ajena; solo puede encadenar las dos", () => {
  const duo = arena();
  const [blue, red] = duo.players;
  assert.equal(duo.useVine(blue), false);
  assert.equal(duo.useLight(red), false);
  assert.equal(duo.useLight(blue), true);
  assert.equal(duo.useVine(red), true);
  assert.equal(duo.stats.combos, 1);
  assert.equal(duo.guards[0].state, GuardState.STUNNED);
  assert.ok(duo.guards[0].stunTime > 2);
  const solo = arena(1);
  assert.equal(solo.useLight(solo.players[0]), true);
  assert.equal(solo.useVine(solo.players[0]), true);
  assert.equal(solo.stats.combos, 1);
});
test("un combo interrumpe el ataque; las recargas y el fin del aturdimiento funcionan", () => {
  const g = arena(),
    guard = g.guards[0];
  place(g.players[0], 7.5, 6.5);
  updateGuard(guard, g, 0.01);
  assert.equal(guard.state, GuardState.WINDUP);
  g.useLight(g.players[0]);
  g.useVine(g.players[1]);
  assert.equal(guard.attack, null);
  assert.equal(g.useLight(g.players[0]), false);
  assert.equal(g.useVine(g.players[1]), false);
  for (let i = 0; i < 120; i++) updateGuard(guard, g, 1 / 60);
  assert.equal(g.stats.captures, 0);
  assert.equal(guard.state, GuardState.STUNNED);
  updateGuard(guard, g, 0.25);
  assert.equal(guard.state, GuardState.RETURN);
  g.guards = [];
  tick(g, 5.1);
  assert.equal(g.players[0].lightCooldown, 0);
  assert.equal(g.players[1].vineCooldown, 0);
});
test("muros bloquean luz, liana y pases; fallar la liana no gasta recarga", () => {
  const g = arena();
  place(g.players[0], 6.5, 6.5);
  place(g.players[1], 8.5, 6.5);
  Object.assign(g.guards[0], { x: 6.5, y: 6.5 });
  g.map.cells[6][7] = "#";
  assert.equal(g.useLight(g.players[1]), false);
  g.takeFlag(g.players[0]);
  assert.equal(g.passFlag(g.players[0]), false);
  assert.equal(g.useVine(g.players[1]), false);
  assert.equal(g.players[1].vineCooldown, 0);
  place(g.players[0], 8.5, 6.5);
  g.useLight(g.players[0]);
  assert.equal(g.guards[0].markedTime, 0);
});
test("las herramientas no actúan durante pausa, derrota ni captura", () => {
  for (const state of [
    GameState.PAUSED,
    GameState.GAME_OVER,
    GameState.ROUND_RESET,
    GameState.MENU,
  ]) {
    const g = arena();
    g.takeFlag(g.players[0]);
    g.state = state;
    assert.equal(g.useLight(g.players[0]), false);
    assert.equal(g.useVine(g.players[1]), false);
    assert.equal(g.passFlag(g.players[0]), false);
    assert.equal(g.stats.lights, 0);
  }
  const g = arena();
  g.capture(g.players[1]);
  assert.equal(g.useVine(g.players[1]), false);
});
test("el puente sella la isla; solo el salto del jaguar carga la estatua", () => {
  const g = fixture(),
    guard = g.guards[0],
    statue = g.bridge.statue;
  assert.equal(findPath(g.map, g.map.base, g.map.pedestal).length, 0);
  assert.equal(
    canOccupy(g.map, g.bridge.tiles[0][0] + 0.5, g.bridge.tiles[0][1] + 0.5),
    false,
  );
  place(g.players[0], g.map.pedestal.x, g.map.pedestal.y);
  g.collectFlag();
  assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
  Object.assign(guard, { x: statue.x, y: statue.y, state: GuardState.PATROL });
  assert.equal(g.strikeStatue(guard, guard), false);
  // Real windup and lunge, no manual bridge activation or strike call.
  Object.assign(guard, {
    x: statue.x - 1,
    y: statue.y,
    state: GuardState.PATROL,
    attackCooldown: 0,
  });
  place(g.players[0], statue.x + 0.1, statue.y);
  place(g.players[1], g.map.base.x, g.map.base.y);
  for (let i = 0; i < 70; i++) updateGuard(guard, g, 1 / 60);
  assert.equal(g.bridge.charged, true);
  assert.equal(g.bridge.open, false);
  assert.equal(g.stats.captures, 0);
});
test("abrir exige estatua cargada, luz vigente y liana; ambos modos pueden hacerlo", () => {
  for (const mode of [1, 2]) {
    const g = fixture(mode);
    g.guards = [];
    for (const p of g.players) place(p, g.bridge.winch.x, g.bridge.winch.y);
    const blue = g.players[0],
      vine = g.players.at(-1);
    assert.equal(g.useVine(vine), false);
    assert.equal(g.bridge.open, false);
    g.bridge.charged = true;
    assert.equal(g.useVine(vine), false);
    assert.equal(g.useLight(blue), true);
    const duration = mode === 1 ? 8 : 4;
    assert.equal(g.bridge.litTime, duration);
    tick(g, duration + 0.1);
    assert.equal(g.useVine(vine), false);
    tick(g, 1.1);
    assert.equal(g.useLight(blue), true);
    const revision = g.map.revision;
    assert.equal(g.useVine(vine), true);
    assert.equal(g.bridge.open, true);
    assert.ok(g.map.revision > revision);
    assert.ok(findPath(g.map, g.map.base, g.map.pedestal).length);
    assert.ok(
      canOccupy(g.map, g.bridge.tiles[0][0] + 0.5, g.bridge.tiles[0][1] + 0.5),
    );
    g.retryMission();
    assert.equal(g.bridge.open, false);
    assert.equal(g.bridge.charged, false);
    assert.equal(g.bridge.litTime, 0);
    assert.equal(findPath(g.map, g.map.base, g.map.pedestal).length, 0);
  }
});
test("la liana no recoge una reliquia sellada y sí la recupera después", () => {
  const g = arena();
  g.guards = [];
  const red = g.players[1];
  place(red, g.flag.x - 2, g.flag.y);
  assert.equal(g.useVine(red), false);
  assert.equal(g.alarm, false);
  g.runes.forEach((r) => (r.active = true));
  assert.equal(g.useVine(red), true);
  assert.equal(g.flag.carrier, 1);
  assert.equal(g.alarm, true);
});
test("pase cambia un único portador, respeta recarga y captura limpia la animación", () => {
  const g = arena();
  g.guards = [];
  const [blue, red] = g.players;
  g.takeFlag(blue);
  assert.equal(g.passFlag(red), false);
  assert.equal(g.passFlag(blue), true);
  assert.equal(g.flag.carrier, 1);
  assert.equal(g.flag.state, FlagState.CARRIED);
  assert.equal(g.stats.passes, 1);
  assert.equal(g.passFlag(red), false);
  tick(g, 0.9);
  assert.equal(g.flag.flight, null);
  assert.equal(g.passFlag(red), true);
  assert.equal(g.flag.carrier, 0);
  blue.protection = 0;
  g.capture(blue);
  assert.equal(g.flag.flight, null);
  assert.equal(g.flag.state, FlagState.DROPPED);
  assert.equal(g.passFlag(blue), false);
});
test("no se pasa a un cautivo ni fuera de alcance; el agua permite un pase", () => {
  const g = arena();
  g.guards = [];
  const [blue, red] = g.players;
  g.takeFlag(blue);
  place(red, 13, 6.5);
  assert.equal(g.passFlag(blue), false);
  place(red, 8.5, 6.5);
  g.capture(red);
  assert.equal(g.passFlag(blue), false);
  place(red, 8.5, 6.5);
  g.map.cells[6][7] = "~";
  assert.equal(g.passFlag(blue), true);
});
test("cargar ralentiza la frecuencia de pasos, nunca la longitud de una casilla", () => {
  for (const mode of [1, 2]) {
    const g = arena(mode),
      p = g.players[0];
    g.takeFlag(p);
    const before = { ...p };
    g.movePlayer(p, { x: 1, y: 0 }, 0.01);
    assert.equal(p.x, before.x + 1);
    assert.equal(p.y, before.y);
    assert.ok(
      Math.abs(
        p.motion.duration -
          CONFIG.tileWidth / (CONFIG.playerSpeed * (mode === 1 ? 0.93 : 0.78)),
      ) < 0.0001,
    );
  }
});
test("la burbuja rueda sin impulso ni herramientas; la liana acerca y el rescate requiere tiempo", () => {
  const g = arena();
  g.guards = [];
  const [blue, red] = g.players;
  place(blue, 5.5, 6.5);
  place(red, 7.5, 6.5);
  g.capture(blue);
  const before = { ...blue };
  g.movePlayer(blue, { x: 1, y: 0, dash: true }, 0.05);
  assert.ok(distance(before, blue) > 0);
  assert.equal(blue.dashTime, 0);
  assert.equal(g.useLight(blue), false);
  assert.equal(g.useVine(red), true);
  tick(g, 0.2);
  assert.ok(distance(blue, red) <= CONFIG.rescueRadius);
  assert.equal(blue.state, PlayerState.CAPTURED);
  g.rescue(0.3);
  assert.equal(blue.state, PlayerState.CAPTURED);
  g.rescue(0.3);
  assert.equal(blue.state, PlayerState.PROTECTED);
  assert.equal(g.stats.rescues, 1);
});
test("la liana no arrastra burbujas a través del agua ni de paredes", () => {
  const g = arena();
  g.guards = [];
  const [blue, red] = g.players;
  place(blue, 6.5, 6.5);
  place(red, 8.5, 6.5);
  g.capture(blue);
  const before = { ...blue };
  for (const tile of ["~", "#"]) {
    g.map.cells[6][7] = tile;
    assert.equal(g.useVine(red), false);
    assert.equal(distance(before, blue), 0);
  }
});
test("rescatar tiene prioridad sobre un mecanismo sin activar", () => {
  const g = fixture();
  g.guards = [];
  const w = g.bridge.winch;
  place(g.players[0], w.x - 1, w.y);
  place(g.players[1], w.x + 1, w.y);
  g.capture(g.players[0]);
  assert.equal(g.useVine(g.players[1]), true);
  tick(g, 0.05);
  assert.ok(distance(...g.players) <= CONFIG.rescueRadius);
  assert.equal(g.bridge.open, false);
});
test("curarse no borra golpes; encadenar combos y pases no regala puntuación", () => {
  const g = fixture(1);
  g.stats.captures = 2;
  g.players[0].hearts = 3;
  g.finishMission();
  assert.equal(g.result.clean, false);
  const score = g.result.score;
  g.stats.passes = 999;
  g.stats.combos = 999;
  g.finishMission();
  assert.equal(g.result.score, score);
});
test("migra desbloqueos y misión v3, conserva su copia y separa los récords v4", () => {
  const old = {
    version: 1,
    checkpoint: { mode: 1, index: 2 },
    records: {
      1: [
        { stars: 3, time: 25, score: 1200 },
        { stars: 2, time: 40, score: 1000 },
      ],
      2: [{ stars: 2, time: 40, score: 1000 }],
    },
  };
  const map = new Map([["selva-progress-v3", JSON.stringify(old)]]),
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
    };
  const p = new Progress(storage);
  assert.equal(p.unlocked(1, 2), true);
  assert.equal(p.unlocked(1, 3), false);
  assert.equal(p.unlocked(2, 1), true);
  assert.deepEqual(p.data.checkpoint, { mode: 1, index: 2 });
  assert.equal(p.record(1, 0), null);
  assert.equal(map.get("selva-progress-v3"), JSON.stringify(old));
  p.complete(1, 2, { stars: 3, time: 35, score: 1300 });
  const reload = new Progress(storage);
  assert.equal(reload.record(1, 2).stars, 3);
  assert.equal(reload.unlocked(1, 3), true);
  assert.equal(reload.unlocked(2, 2), false);
});

test("un mecanismo cerrado y un tesoro no roban el combo de un guardián marcado", () => {
  const g = fixture();
  const [blue, red] = g.players;
  const w = g.bridge.winch;
  place(blue, w.x - 1, w.y);
  place(red, w.x - 1, w.y);
  g.guards = [g.guards[0]];
  Object.assign(g.guards[0], { x: w.x, y: w.y });
  g.relics = [{ x: blue.x, y: blue.y, collected: false }];
  assert.equal(g.useLight(blue), true);
  assert.equal(g.useVine(red), true);
  assert.equal(g.stats.combos, 1);
  assert.equal(g.relics[0].collected, false);
  assert.equal(g.bridge.open, false);
});
