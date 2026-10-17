import { MISSIONS } from "./missions.js";
const COUNT = MISSIONS.length;
const KEY = "selva-progress-v5";
const LEGACY_KEYS = ["selva-progress-v4", "selva-progress-v3"];
const validIndex = (n) => Number.isInteger(n) && n >= 0 && n < COUNT;
const validMode = (n) => n === 1 || n === 2;
const validRecord = (r) =>
  r &&
  Number.isInteger(r.stars) &&
  r.stars >= 1 &&
  r.stars <= 3 &&
  Number.isFinite(r.time) &&
  r.time > 0 &&
  Number.isFinite(r.score) &&
  r.score >= 0;
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
export class Progress {
  constructor(storage = defaultStorage()) {
    this.storage = storage;
    this.available = !!storage;
    this.data = {
      version: 3,
      checkpoint: null,
      unlocked: { 1: 1, 2: 1 },
      records: { 1: Array(COUNT).fill(null), 2: Array(COUNT).fill(null) },
    };
    try {
      const current = JSON.parse(storage?.getItem(KEY) ?? "null");
      const legacy =
        current == null
          ? JSON.parse(
              LEGACY_KEYS.map((key) => storage?.getItem(key)).find(Boolean) ??
                "null",
            )
          : null;
      const saved =
        current?.version === 3
          ? current
          : [1, 2].includes(legacy?.version)
            ? legacy
            : null;
      if (!saved) return;
      for (const mode of [1, 2]) {
        if (saved.version >= 2 && Number.isInteger(saved.unlocked?.[mode]))
          this.data.unlocked[mode] = Math.max(
            1,
            Math.min(COUNT, saved.unlocked[mode]),
          );
        for (let i = 0; i < COUNT; i++) {
          const record = saved.records?.[mode]?.[i];
          if (!validRecord(record)) continue;
          this.data.unlocked[mode] = Math.max(
            this.data.unlocked[mode],
            Math.min(COUNT, i + 2),
          );
          if (saved.version === 3)
            this.data.records[mode][i] = {
              stars: record.stars,
              time: record.time,
              score: Math.floor(record.score),
            };
        }
      }
      if (this.unlocked(saved.checkpoint?.mode, saved.checkpoint?.index))
        this.data.checkpoint = {
          mode: saved.checkpoint.mode,
          index: saved.checkpoint.index,
        };
      const previousCount = Math.max(
        saved.records?.[1]?.length ?? 0,
        saved.records?.[2]?.length ?? 0,
      );
      const expanded =
        saved.version === 3 && previousCount > 0 && previousCount < COUNT;
      // A completed older campaign can continue directly into the new chapter.
      if (expanded && !this.data.checkpoint) {
        const mode = [1, 2].find((mode) =>
          this.record(mode, previousCount - 1),
        );
        if (mode) this.data.checkpoint = { mode, index: previousCount };
      }
      if (legacy || expanded) this.save();
    } catch {
      this.available = false;
    }
  }
  unlocked(mode, index) {
    return (
      validMode(mode) && validIndex(index) && index < this.data.unlocked[mode]
    );
  }
  record(mode, index) {
    return this.data.records[mode]?.[index] ?? null;
  }
  save() {
    if (!this.storage) {
      this.available = false;
      return;
    }
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
      this.available = true;
    } catch {
      this.available = false;
    }
  }
  checkpoint(mode, index) {
    if (validMode(mode) && validIndex(index)) {
      this.data.checkpoint = { mode, index };
      this.save();
    }
  }
  complete(mode, index, result) {
    if (!validMode(mode) || !validIndex(index) || !validRecord(result)) return;
    const old = this.record(mode, index);
    this.data.records[mode][index] = {
      stars: Math.max(old?.stars ?? 0, result.stars),
      time: Math.min(old?.time ?? Infinity, result.time),
      score: Math.max(old?.score ?? 0, result.score),
    };
    this.data.unlocked[mode] = Math.max(
      this.data.unlocked[mode],
      Math.min(COUNT, index + 2),
    );
    this.data.checkpoint =
      index < COUNT - 1 ? { mode, index: index + 1 } : null;
    this.save();
  }
}
export const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
