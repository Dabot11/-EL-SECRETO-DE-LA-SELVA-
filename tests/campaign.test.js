import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { MISSIONS } from "../src/missions.js";
import { createMap, isWalkable } from "../src/map.js";
import { findPath, navigate } from "../src/navigation.js";
import { distance, canOccupy } from "../src/collisions.js";
import { CONFIG, GameState, PlayerState, FlagState } from "../src/config.js";
import { playJourney } from "./journey.js";

test("cinco mapas distintos, todos los caminos y patrullas son accesibles", () => {
  assert.equal(MISSIONS.length, 5);
  const layouts = new Set();
  for (let i = 0; i < 5; i++) {
    const map = createMap(i);
    layouts.add(JSON.stringify(map.cells));
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (isWalkable(map, x, y))
          assert.ok(
            findPath(map, map.base, { x, y }).length,
            `Misión ${i + 1}, casilla ${x},${y}`,
          );
    assert.ok(canOccupy(map, map.pedestal.x, map.pedestal.y));
    for (const patrol of map.patrols)
      for (const [x, y] of patrol.route)
        assert.ok(canOccupy(map, x + 0.5, y + 0.5));
  }
  assert.equal(layouts.size, 5);
});

test("la dificultad aumenta sin guardianes más rápidos que el jugador", () => {
  let previous = null;
  for (let i = 0; i < 5; i++) {
    const g = new Game();
    g.start(1, i);
    assert.ok(g.guards.every((guard) => guard.speed < CONFIG.playerSpeed));
    if (previous) {
      assert.ok(g.guards.length >= previous.guards.length);
      assert.ok(g.map.mission.speed > previous.map.mission.speed);
      assert.ok(g.guards[0].detectionRange > previous.guards[0].detectionRange);
      assert.ok(g.guards[0].searchTime > previous.guards[0].searchTime);
    }
    previous = g;
  }
});

test("ida y vuelta físicas por los cinco mapas sin atravesar obstáculos", () => {
  for (let i = 0; i < 5; i++) {
    const map = createMap(i),
      body = { ...map.base };
    for (const target of [map.pedestal, map.base]) {
      for (let n = 0; n < 6000 && distance(body, target) > 0.1; n++) {
        navigate(body, target, CONFIG.playerSpeed, 1 / 60, map);
        assert.ok(canOccupy(map, body.x, body.y));
      }
      assert.ok(distance(body, target) < 0.1, `Misión ${i + 1}`);
    }
  }
});

test("captura doble, derrota y reintento conservan la misión y el modo", () => {
  for (let i = 1; i < 5; i++) {
    const g = new Game();
    g.start(2, i);
    const layout = JSON.stringify(g.map.cells);
    for (let attempt = 0; attempt < 3; attempt++) {
      g.players.forEach((p) => {
        p.protection = 0;
        p.state = PlayerState.NORMAL;
        g.capture(p);
      });
      g.checkOutcome();
      if (attempt < 2) for (let n = 0; n < 140; n++) g.update(1 / 60);
      assert.equal(g.missionIndex, i);
      assert.equal(g.attempts, 2 - attempt);
    }
    assert.equal(g.state, GameState.GAME_OVER);
    g.retryMission();
    assert.equal(g.missionIndex, i);
    assert.equal(g.mode, 2);
    assert.equal(g.attempts, 3);
    assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
    assert.equal(JSON.stringify(g.map.cells), layout);
  }
});

test("avanzar exige completar la misión y restaura intentos, bandera y guardias", () => {
  const g = new Game();
  g.start(2);
  assert.equal(g.nextMission(), false);
  for (let i = 0; i < 5; i++) {
    assert.equal(g.missionIndex, i);
    g.attempts = 1;
    Object.assign(g.flag, { state: FlagState.CARRIED, carrier: 0 });
    g.checkOutcome();
    assert.equal(
      g.state,
      i === 4 ? GameState.VICTORY : GameState.MISSION_COMPLETE,
    );
    const frozen = JSON.stringify(g.players);
    g.update(0.05);
    assert.equal(JSON.stringify(g.players), frozen);
    assert.equal(g.nextMission(), i < 4);
    if (i < 4) {
      assert.equal(g.attempts, 3);
      assert.equal(g.flag.state, FlagState.ON_PEDESTAL);
      assert.equal(g.guards.length, MISSIONS[i + 1].patrols.length);
    }
  }
  g.menu();
  g.start(1);
  assert.equal(g.missionIndex, 0);
  assert.throws(() => createMap(-1), RangeError);
  assert.throws(() => createMap(5), RangeError);
});

for (const mode of [1, 2])
  test(`campaña de cinco misiones, modo ${mode}, con guardianes y colisiones activos`, () => {
    const game = new Game();
    game.start(mode);
    for (let index = 0; index < 5; index++) {
      const result = playJourney(game, mode, index, true);
      assert.equal(result.missionIndex, index);
      assert.equal(
        result.state,
        index === 4 ? GameState.VICTORY : GameState.MISSION_COMPLETE,
      );
      assert.ok(result.flags > 0);
      assert.equal(result.runes, game.runes.length);
      assert.ok(result.attempts > 0);
      if (index < 4) assert.equal(game.nextMission(), true);
    }
  });
