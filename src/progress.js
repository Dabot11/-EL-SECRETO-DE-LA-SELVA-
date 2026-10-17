const KEY = "selva-progress-v3";
const validIndex = (n) => Number.isInteger(n) && n >= 0 && n < 5;
const validMode = (n) => n === 1 || n === 2;
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
      version: 1,
      checkpoint: null,
      records: { 1: Array(5).fill(null), 2: Array(5).fill(null) },
    };
    try {
      const saved = JSON.parse(storage?.getItem(KEY) ?? "null");
      if (saved?.version !== 1) return;
      if (
        validMode(saved.checkpoint?.mode) &&
        validIndex(saved.checkpoint?.index)
      )
        this.data.checkpoint = {
          mode: saved.checkpoint.mode,
          index: saved.checkpoint.index,
        };
      for (const mode of [1, 2])
        for (let i = 0; i < 5; i++) {
          const record = saved.records?.[mode]?.[i];
          if (
            record &&
            Number.isInteger(record.stars) &&
            record.stars >= 1 &&
            record.stars <= 3 &&
            Number.isFinite(record.time) &&
            record.time > 0 &&
            Number.isFinite(record.score) &&
            record.score >= 0
          )
            this.data.records[mode][i] = {
              stars: record.stars,
              time: record.time,
              score: Math.floor(record.score),
            };
        }
      if (
        this.data.checkpoint &&
        !this.unlocked(this.data.checkpoint.mode, this.data.checkpoint.index)
      )
        this.data.checkpoint = null;
    } catch {
      this.available = false;
    }
  }
  unlocked(mode, index) {
    return (
      validMode(mode) &&
      validIndex(index) &&
      (index === 0 || this.data.records[mode][index - 1] !== null)
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
    if (!validMode(mode) || !validIndex(index)) return;
    const old = this.record(mode, index);
    this.data.records[mode][index] = {
      stars: Math.max(old?.stars ?? 0, result.stars),
      time: Math.min(old?.time ?? Infinity, result.time),
      score: Math.max(old?.score ?? 0, result.score),
    };
    this.data.checkpoint = index < 4 ? { mode, index: index + 1 } : null;
    this.save();
  }
}
export const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
