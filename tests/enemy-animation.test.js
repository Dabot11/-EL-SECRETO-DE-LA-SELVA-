import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { Progress } from "../src/progress.js";
import { GuardState } from "../src/config.js";
import { updateGuard } from "../src/ai.js";
import { enemyPose } from "../src/enemy-animation.js";
import { stepBody, tickMotion } from "../src/grid.js";

const arena = (type) => {
  const game = new Game(new Progress(null));
  game.start(2, 9);
  game.map.cells = game.map.cells.map((row, y) =>
    row.map((_, x) =>
      x === 0 ||
      y === 0 ||
      x === game.map.width - 1 ||
      y === game.map.height - 1
        ? "#"
        : ".",
    ),
  );
  const guard = game.guards[0];
  Object.assign(guard, {
    type,
    x: 10.5,
    y: 10.5,
    motion: null,
    direction: { x: 0, y: 1 },
    route: [
      { x: 10.5, y: 10.5 },
      { x: 12.5, y: 10.5 },
      { x: 12.5, y: 12.5 },
      { x: 10.5, y: 12.5 },
    ],
    waypoint: 1,
    state: GuardState.PATROL,
    attack: null,
    attackCooldown: 0,
  });
  game.guards = [guard];
  return { game, guard };
};

test("All four enemies face each leg of their real patrol without drawing changing AI", () => {
  for (const type of ["stone", "hunter", "spirit", "warden"]) {
    const { game, guard } = arena(type);
    game.players = [];
    const directions = new Set(),
      frames = new Set();
    for (let i = 0; i < 1200; i++) {
      updateGuard(guard, game, 1 / 60);
      const before = JSON.stringify(guard),
        pose = enemyPose(guard, false, i / 60);
      if (guard.motion) {
        directions.add(pose.direction);
        frames.add(pose.frame);
      }
      assert.equal(JSON.stringify(guard), before);
    }
    assert.equal(directions.size, 4, type);
    assert.equal(frames.size, 4, type);
  }
});

test("Jaguars turn toward the actual warning and keep that direction through a charge", () => {
  for (const [x, y, direction] of [
    [0, -1, "north"],
    [0, 1, "south"],
    [-1, 0, "west"],
    [1, 0, "east"],
  ]) {
    const { game, guard } = arena("hunter");
    game.players = [game.players[0]];
    Object.assign(game.players[0], {
      x: guard.x + x * 2,
      y: guard.y + y * 2,
      state: "NORMAL",
      protection: 0,
    });
    guard.direction = { x: -x, y: -y };
    updateGuard(guard, game, 0.01);
    assert.equal(guard.state, GuardState.WINDUP);
    const warning = structuredClone(guard.attack.cells);
    assert.deepEqual(enemyPose(guard), { direction, frame: 0 });
    for (let i = 0; i < 150 && guard.state !== GuardState.RECOVER; i++) {
      updateGuard(guard, game, 1 / 60);
      assert.equal(enemyPose(guard).direction, direction);
      assert.deepEqual(guard.attack.cells, warning);
    }
    assert.equal(guard.state, GuardState.RECOVER);
    assert.deepEqual(enemyPose(guard), { direction, frame: 0 });
  }
});

test("Stun, attack anticipation and recovery do not keep marching feet", () => {
  for (const type of ["stone", "hunter", "spirit", "warden"]) {
    const { game, guard } = arena(type);
    stepBody(guard, { x: 0, y: -1 }, guard.speed, game.map);
    tickMotion(guard, guard.motion.duration * 0.4);
    for (const state of [
      GuardState.STUNNED,
      GuardState.WINDUP,
      GuardState.RECOVER,
    ]) {
      guard.state = state;
      const before = JSON.stringify(guard);
      assert.deepEqual(enemyPose(guard, false, 0.75), {
        direction: "north",
        frame: 0,
      });
      assert.equal(JSON.stringify(guard), before);
    }
    guard.state = GuardState.PATROL;
    assert.deepEqual(enemyPose(guard, true, 0.75), {
      direction: "north",
      frame: 0,
    });
  }
});

test("Spirit has a flowing cycle at rest that freezes with paused renderer time", () => {
  const { guard } = arena("spirit");
  const frames = [0, 0.25, 0.5, 0.75].map(
    (time) => enemyPose(guard, false, time).frame,
  );
  assert.equal(new Set(frames).size, 4);
  const before = JSON.stringify(guard),
    pose = enemyPose(guard, false, 0.5);
  assert.deepEqual(enemyPose(guard, false, 0.5), pose);
  assert.deepEqual(enemyPose(guard, true, 0.5), {
    direction: "south",
    frame: 0,
  });
  assert.equal(JSON.stringify(guard), before);
});
