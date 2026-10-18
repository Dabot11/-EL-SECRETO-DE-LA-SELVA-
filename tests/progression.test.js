import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { Progress } from "../src/progress.js";
import { CONFIG, GuardState, PlayerState } from "../src/config.js";
import { canDetect, updateGuard } from "../src/ai.js";
import { findPath } from "../src/navigation.js";
import { distance } from "../src/collisions.js";
import { stepBody, renderPosition } from "../src/grid.js";
import { playJourney } from "./journey.js";

const game = (mode = 2, index = 0) => {
  const g = new Game(new Progress(null));
  g.start(mode, index);
  return g;
};
const carry = (g) => {
  Object.assign(g.players[0], g.map.pedestal, { motion: null, protection: 99 });
  g.runes.forEach((r) => (r.active = true));
  if (g.bridge) g.openBridge();
  g.collectFlag();
};

test("Campaign introduces runes, jaguar, spirit, traps, bridge and Solar in separate missions", () => {
  for (const mode of [1, 2]) {
    const seen = new Set();
    for (let index = 0; index < 10; index++) {
      const g = game(mode, index),
        fresh = [];
      const mechanics = [...new Set(g.guards.map((g) => g.type))];
      if (g.runes.length) mechanics.push("runes");
      if (g.traps.length) mechanics.push("traps");
      if (g.bridge) mechanics.push("bridge");
      for (const mechanic of mechanics)
        if (!seen.has(mechanic)) {
          fresh.push(mechanic);
          seen.add(mechanic);
        }
      assert.ok(
        fresh.length <= 1,
        `Mode ${mode}, mission ${index + 1}: ${fresh}`,
      );
      if (index < 7)
        assert.deepEqual(
          fresh,
          [
            ["stone"],
            ["runes"],
            ["hunter"],
            ["spirit"],
            ["traps"],
            ["bridge"],
            ["warden"],
          ][index],
        );
      if (index === 0) {
        assert.ok(g.sealOpen());
        assert.equal(g.guards.length, mode);
      }
      if (index === 1) assert.equal(g.runes.length, 1);
    }
  }
});

test("First two missions can be won in both modes with movement alone", () => {
  for (const mode of [1, 2])
    for (const index of [0, 1]) {
      const g = game(mode, index),
        result = playJourney(g, mode, index, false, false, false);
      assert.equal(
        result.state,
        "MISSION_COMPLETE",
        `Mode ${mode}, mission ${index + 1}`,
      );
      assert.ok(result.alarm);
      assert.ok(result.flags > 0);
      for (const action of ["dashes", "lights", "vines", "passes"])
        assert.equal(g.stats[action], 0);
    }
});

test("Early warnings and recovery are longer; solo keeps extra reaction time at every stage", () => {
  const durations = [];
  for (let index = 0; index < 10; index++) {
    const values = [];
    for (const mode of [2, 1]) {
      const g = game(mode, index),
        guard = g.guards[0];
      g.map.cells = g.map.cells.map((row, y) =>
        row.map((_, x) =>
          !x || !y || x === g.map.width - 1 || y === g.map.height - 1
            ? "#"
            : ".",
        ),
      );
      Object.assign(guard, {
        x: 10.5,
        y: 10.5,
        route: [{ x: 10.5, y: 10.5 }],
        waypoint: 0,
        attackCooldown: 0,
      });
      g.guards = [guard];
      g.players = [g.players[0]];
      Object.assign(g.players[0], {
        x: 11.5,
        y: 10.5,
        state: PlayerState.NORMAL,
        protection: 0,
      });
      updateGuard(guard, g, 0.01);
      assert.equal(guard.state, GuardState.WINDUP);
      const duration = guard.attack.duration;
      assert.ok(
        duration > (2 * 28) / (CONFIG.playerSpeed * (mode === 1 ? 0.93 : 0.78)),
      );
      updateGuard(guard, g, duration + 0.001);
      assert.equal(guard.state, GuardState.RECOVER);
      values.push({ duration, recovery: guard.recovery });
    }
    assert.ok(values[1].duration > values[0].duration);
    assert.ok(values[1].recovery > values[0].recovery);
    durations.push(values[0].duration);
    const g = game(2, index);
    for (const guard of g.guards)
      assert.ok(
        guard.speed * g.map.mission.alarmSpeed < CONFIG.playerSpeed * 0.78,
      );
  }
  for (let i = 1; i < durations.length; i++)
    assert.ok(durations[i] < durations[i - 1]);
});

test("Every escape patrol uses reachable ground and leaves the entrance clear", () => {
  for (let index = 0; index < 10; index++) {
    const g = game(2, index);
    if (g.bridge) g.openBridge();
    for (const guard of g.guards) {
      assert.notDeepEqual(guard.route, guard.alarmRoute);
      for (const target of guard.alarmRoute)
        assert.ok(
          findPath(g.map, guard, target).length,
          `Mission ${index + 1}, guard ${guard.id}`,
        );
      assert.ok(
        distance(guard.alarmRoute.at(-1), g.map.base) > CONFIG.safeRadius + 2,
      );
    }
  }
});

test("Alarm waits, then changes patrols without teleporting, cancelling a step or removing a stun", () => {
  const g = game(),
    [moving, stunned] = g.guards;
  const path = findPath(g.map, moving, moving.route[1]);
  assert.ok(
    stepBody(
      moving,
      { x: path[1].x - moving.x, y: path[1].y - moving.y },
      moving.speed,
      g.map,
    ),
  );
  const motion = moving.motion,
    position = renderPosition(moving),
    route = structuredClone(moving.route);
  stunned.state = GuardState.STUNNED;
  stunned.stunTime = 1.5;
  carry(g);
  g.updateAlarm(g.alarmTimer - 0.1);
  assert.equal(g.alarmActive, false);
  assert.deepEqual(moving.route, route);
  g.updateAlarm(0.11);
  assert.equal(g.alarmActive, true);
  assert.equal(moving.motion, motion);
  assert.deepEqual(renderPosition(moving), position);
  assert.equal(stunned.state, GuardState.STUNNED);
  assert.equal(stunned.stunTime, 1.5);
  assert.deepEqual(moving.route, moving.alarmRoute);
  assert.notDeepEqual(moving.route, route);
});

test("Alarm preserves an attack's cells and timing and cannot locate a hidden carrier", () => {
  const g = game(2, 3),
    guard = g.guards[0];
  const attack = {
    cells: [{ x: guard.x, y: guard.y }],
    origin: { x: guard.x, y: guard.y },
    duration: 1,
  };
  guard.state = GuardState.WINDUP;
  guard.attack = attack;
  guard.attackTimer = 0.6;
  carry(g);
  g.updateAlarm(g.alarmTimer);
  assert.equal(guard.attack, attack);
  assert.equal(guard.attackTimer, 0.6);
  assert.equal(guard.state, GuardState.WINDUP);
  const [x, y] = g.map.bushGroups[0][0];
  Object.assign(g.players[0], {
    x: x + 0.5,
    y: y + 0.5,
    protection: 0,
    state: PlayerState.HIDDEN,
  });
  assert.equal(canDetect(guard, g.players[0], g.map, 99), false);
  assert.equal(guard.target, null);
});

test("Pause freezes the alarm; passes and dropped-flag pickups never restart its delay", () => {
  const g = game();
  carry(g);
  g.togglePause();
  const timer = g.alarmTimer;
  g.update(0.05);
  assert.equal(g.alarmTimer, timer);
  g.togglePause();
  g.updateAlarm(0.5);
  const remaining = g.alarmTimer;
  const [blue, red] = g.players;
  Object.assign(red, {
    x: blue.x - 1,
    y: blue.y,
    protection: 0,
    state: PlayerState.NORMAL,
  });
  assert.ok(g.passFlag(blue));
  assert.equal(g.alarmTimer, remaining);
  red.protection = 0;
  red.state = PlayerState.NORMAL;
  assert.ok(g.capture(red));
  Object.assign(blue, { x: red.x, y: red.y });
  g.collectFlag();
  assert.equal(g.flag.carrier, 0);
  assert.equal(g.alarmTimer, remaining);
  g.updateAlarm(remaining);
  assert.ok(g.alarmActive);
  g.takeFlag(blue);
  assert.ok(g.alarmActive);
  assert.equal(g.alarmTimer, 0);
});

test("Retry restores ordinary patrols, closed bridge, flag and alarm state", () => {
  const g = game(2, 5),
    initial = g.guards.map((guard) => structuredClone(guard.route));
  carry(g);
  g.updateAlarm(g.alarmTimer);
  assert.ok(g.alarmActive);
  assert.ok(g.bridge.open);
  g.retryMission();
  assert.equal(g.alarm, false);
  assert.equal(g.alarmActive, false);
  assert.equal(g.alarmTimer, 0);
  assert.equal(g.bridge.open, false);
  assert.equal(g.flag.state, "ON_PEDESTAL");
  assert.deepEqual(
    g.guards.map((guard) => guard.route),
    initial,
  );
});
