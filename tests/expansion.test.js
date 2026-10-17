import test from "node:test";
import assert from "node:assert/strict";
import { Progress } from "../src/progress.js";
import { Game } from "../src/game.js";
import { GameState, FlagState } from "../src/config.js";
import { MISSIONS } from "../src/missions.js";

const record = { stars: 3, time: 42, score: 1800 };
const oldCampaign = (checkpoint = null) => ({
  version: 3,
  checkpoint,
  unlocked: { 1: 3, 2: 5 },
  records: { 1: [record, record, null, null, null], 2: Array(5).fill(record) },
});
const storageFor = (saved) => {
  const data = new Map([["selva-progress-v5", JSON.stringify(saved)]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};

test("terminar la campaña anterior desbloquea el nivel seis y conserva todos sus récords", () => {
  const storage = storageFor(oldCampaign());
  const p = new Progress(storage);
  assert.equal(p.data.records[2].length, 10);
  for (let i = 0; i < 5; i++) assert.deepEqual(p.record(2, i), record);
  assert.equal(p.record(2, 5), null);
  assert.equal(p.unlocked(2, 5), true);
  assert.equal(p.unlocked(2, 6), false);
  assert.equal(p.unlocked(1, 5), false);
  assert.deepEqual(p.data.checkpoint, { mode: 2, index: 5 });
  assert.deepEqual(new Progress(storage).data, p.data);
});

test("la expansión conserva una misión pendiente y permite guardar y continuar el nuevo capítulo", () => {
  const storage = storageFor(oldCampaign({ mode: 1, index: 2 }));
  const p = new Progress(storage);
  assert.deepEqual(p.data.checkpoint, { mode: 1, index: 2 });
  for (let i = 5; i < MISSIONS.length; i++) {
    assert.equal(p.unlocked(2, i), true);
    p.complete(2, i, record);
    const reloaded = new Progress(storage);
    assert.deepEqual(reloaded.record(2, i), record);
    assert.deepEqual(
      reloaded.data.checkpoint,
      i === 9 ? null : { mode: 2, index: i + 1 },
    );
  }
  const finished = new Progress(storage);
  assert.equal(finished.unlocked(2, 9), true);
  assert.equal(finished.unlocked(2, 10), false);
  assert.equal(finished.unlocked(2, -1), false);
  assert.equal(finished.data.checkpoint, null);
});

test("la misión cinco continúa al nuevo capítulo y solo la diez termina la aventura", () => {
  for (const mode of [1, 2]) {
    const g = new Game(new Progress(null));
    for (const index of [4, 9]) {
      g.start(mode, index);
      Object.assign(g.flag, { state: FlagState.CARRIED, carrier: 0 });
      g.checkOutcome();
      assert.equal(
        g.state,
        index === 9 ? GameState.VICTORY : GameState.MISSION_COMPLETE,
      );
      assert.equal(g.nextMission(), index !== 9);
      assert.equal(g.missionIndex, index === 9 ? 9 : 5);
      assert.equal(g.mode, mode);
    }
  }
});
