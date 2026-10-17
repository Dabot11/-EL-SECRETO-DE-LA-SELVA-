import test from "node:test";
import assert from "node:assert/strict";
import { explorerPose } from "../src/explorer-animation.js";
import { createMap } from "../src/map.js";
import { createPlayers } from "../src/entities.js";
import { stepBody, tickMotion } from "../src/grid.js";
import { CONFIG } from "../src/config.js";

const openMap = () => {
  const map = createMap(0);
  map.cells = map.cells.map((row, y) =>
    row.map((_, x) =>
      x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1
        ? "#"
        : ".",
    ),
  );
  return map;
};
test("Both explorers turn with the committed step and keep their direction at rest", () => {
  const map = openMap();
  for (const p of createPlayers(map, 2)) {
    assert.deepEqual(explorerPose(p), { direction: "south", frame: 0 });
    for (const [x, y, name] of [
      [0, -1, "north"],
      [1, 0, "east"],
      [0, 1, "south"],
      [-1, 0, "west"],
    ]) {
      assert.ok(stepBody(p, { x, y }, CONFIG.playerSpeed, map));
      assert.equal(explorerPose(p).direction, name);
      // A buffered/blocked turn cannot rotate the sprite before the current tile ends.
      assert.equal(
        stepBody(p, { x: -x, y: -y }, CONFIG.playerSpeed, map),
        false,
      );
      assert.equal(explorerPose(p).direction, name);
      tickMotion(p, p.motion.duration);
      assert.deepEqual(explorerPose(p), { direction: name, frame: 0 });
    }
  }
});
test("Consecutive tiles alternate feet at normal, slowed and dash speeds", () => {
  for (const speed of [
    CONFIG.playerSpeed,
    CONFIG.playerSpeed * 0.62,
    CONFIG.dashSpeed,
  ]) {
    const map = openMap(),
      p = createPlayers(map, 1)[0],
      poses = [];
    for (let i = 0; i < 4; i++) {
      stepBody(p, { x: 1, y: 0 }, speed, map);
      const duration = p.motion.duration;
      const initial = explorerPose(p).frame;
      if (i) assert.equal(initial, poses[i - 1] === 1 ? 2 : 0);
      tickMotion(p, duration * 0.4);
      poses.push(explorerPose(p).frame);
      tickMotion(p, duration * 0.4);
      assert.equal(explorerPose(p).frame, poses[i] === 1 ? 2 : 0);
      tickMotion(p, duration * 0.2 + 1e-8);
      assert.equal(explorerPose(p).frame, 0);
    }
    assert.ok([1, 3].includes(poses[0]));
    assert.notEqual(poses[0], poses[1]);
    assert.equal(poses[0], poses[2]);
    assert.equal(poses[1], poses[3]);
  }
});
test("Pose is stable in pause; reduced motion keeps orientation without leg animation", () => {
  const map = openMap(),
    p = createPlayers(map, 1)[0];
  stepBody(p, { x: 0, y: -1 }, CONFIG.playerSpeed, map);
  tickMotion(p, 0.1);
  const before = JSON.stringify(p),
    pose = explorerPose(p);
  assert.deepEqual(explorerPose(p), pose);
  assert.deepEqual(explorerPose(p, true), { direction: "north", frame: 0 });
  assert.equal(JSON.stringify(p), before);
});
