// Original adaptive score and synthesized effects. No recordings or remote requests.
const STORAGE_KEY = "selva-audio-v2";
const DEFAULTS = { music: true, effects: true, volume: 0.55 };
const MELODY = [
  74,
  null,
  77,
  81,
  79,
  77,
  74,
  null,
  72,
  74,
  77,
  null,
  79,
  77,
  72,
  69,
  74,
  null,
  77,
  84,
  81,
  79,
  77,
  null,
  79,
  77,
  74,
  72,
  69,
  72,
  74,
  null,
];
const CHORDS = [
  [50, 57, 65],
  [46, 53, 62],
  [48, 55, 64],
  [45, 52, 60],
];
const frequency = (note) => 440 * 2 ** ((note - 69) / 12);

export class Soundtrack {
  constructor() {
    this.settings = { ...DEFAULTS };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === "object") {
        if (typeof saved.music === "boolean") this.settings.music = saved.music;
        if (typeof saved.effects === "boolean")
          this.settings.effects = saved.effects;
        if (Number.isFinite(saved.volume))
          this.settings.volume = Math.max(0, Math.min(1, saved.volume));
      }
    } catch {
      /* Sound preferences are optional, including in private browsing. */
    }
    this.context = null;
    this.available = true;
    this.state = "MENU";
    this.mission = 0;
    this.step = 0;
    this.notesScheduled = 0;
    this.effectsPlayed = 0;
    this.voices = new Set();
    this.lastAlert = -10;
  }
  async unlock() {
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          this.available = false;
          return false;
        }
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.settings.volume * 0.6;
        this.master.connect(this.context.destination);
        this.musicBus = this.context.createGain();
        this.musicBus.gain.value = 0.6;
        this.musicBus.connect(this.master);
        this.effectsBus = this.context.createGain();
        this.effectsBus.connect(this.master);
        this.nextNote = this.context.currentTime + 0.1;
        this.timer = setInterval(() => this.schedule(), 100);
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context.state === "running";
    } catch {
      this.available = false;
      return false;
    }
  }
  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      /* Nonessential storage. */
    }
  }
  set(key, value) {
    if (key === "volume") value = Math.max(0, Math.min(1, Number(value) || 0));
    if (!(key in this.settings)) return;
    this.settings[key] = value;
    this.persist();
    if (this.context) {
      this.master.gain.setTargetAtTime(
        this.settings.volume * 0.6,
        this.context.currentTime,
        0.03,
      );
      this.musicBus.gain.setTargetAtTime(
        this.settings.music && this.state !== "PAUSED" ? 0.6 : 0,
        this.context.currentTime,
        0.06,
      );
      this.effectsBus.gain.setTargetAtTime(
        this.settings.effects ? 1 : 0,
        this.context.currentTime,
        0.03,
      );
    }
  }
  sync(state, mission) {
    const changed = mission !== this.mission || state !== this.state;
    this.state = state;
    this.mission = mission;
    if (!this.context || !changed) return;
    this.step = 0;
    this.nextNote = this.context.currentTime + 0.15;
    this.musicBus.gain.setTargetAtTime(
      this.settings.music && state !== "PAUSED" ? 0.6 : 0,
      this.context.currentTime,
      0.1,
    );
    this.effectsBus.gain.setTargetAtTime(
      this.settings.effects ? 1 : 0,
      this.context.currentTime,
      0.03,
    );
  }
  tone(
    note,
    start,
    duration,
    volume = 0.1,
    type = "sine",
    bus = this.musicBus,
  ) {
    const c = this.context;
    if (!c || !bus) return;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(note);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }
  schedule() {
    if (
      !this.context ||
      this.context.state !== "running" ||
      !this.settings.music ||
      this.state === "PAUSED"
    )
      return;
    const c = this.context,
      beat = 60 / (88 + this.mission * 4),
      period = beat / 2;
    if (this.nextNote < c.currentTime) this.nextNote = c.currentTime + 0.03;
    while (this.nextNote < c.currentTime + 0.25) {
      const step = this.step % 32,
        note = MELODY[step],
        chord = CHORDS[Math.floor(step / 8)];
      const shift = this.mission === 3 ? -2 : this.mission === 4 ? 2 : 0;
      if (note !== null) {
        this.tone(note + shift, this.nextNote, period * 1.8, 0.11, "sine");
        this.tone(
          note + shift + 12,
          this.nextNote,
          period * 0.8,
          0.015,
          "sine",
        );
      }
      if (step % 4 === 0) {
        this.tone(
          chord[0] + shift,
          this.nextNote,
          beat * 1.7,
          0.12,
          "triangle",
        );
        for (const n of chord.slice(1))
          this.tone(n + shift, this.nextNote, beat * 1.9, 0.035, "sine");
      }
      if (step % 2 === 1)
        this.tone(46 + this.mission, this.nextNote, 0.055, 0.045, "triangle");
      this.notesScheduled++;
      this.step++;
      this.nextNote += period;
    }
  }
  consume(events) {
    if (!this.context || !this.settings.effects) return;
    const c = this.context;
    for (const event of events) {
      let notes,
        duration = 0.15;
      switch (event.type) {
        case "leaves":
          notes = [91, 86];
          duration = 0.045;
          break;
        case "capture":
          notes = [74, 69, 62];
          duration = 0.2;
          break;
        case "rescue":
          notes = [69, 74, 81, 86];
          duration = 0.18;
          break;
        case "flag":
          notes = [74, 77, 81, 86];
          duration = 0.23;
          break;
        case "start":
          notes = [62, 69, 74];
          duration = 0.2;
          break;
        case "victory":
          notes = [62, 65, 69, 74, 77, 81, 86];
          duration = 0.4;
          break;
        case "round":
          notes = [65, 62, 57, 50];
          duration = 0.3;
          break;
        case "alert":
          if (c.currentTime - this.lastAlert < 1.5) continue;
          this.lastAlert = c.currentTime;
          notes = [69, 70];
          duration = 0.12;
          break;
        default:
          continue;
      }
      notes.forEach((n, i) =>
        this.tone(
          n,
          c.currentTime + 0.015 + i * 0.095,
          duration,
          event.type === "leaves" ? 0.025 : 0.13,
          "sine",
          this.effectsBus,
        ),
      );
      this.effectsPlayed++;
    }
  }
  destroy() {
    clearInterval(this.timer);
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* already ended */
      }
    }
    this.context?.close();
  }
}
