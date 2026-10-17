const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
const ACTION_KEYS = new Set([
  "Space",
  "ShiftRight",
  "KeyE",
  "KeyQ",
  "KeyF",
  "Enter",
  "KeyL",
]);
export class Input {
  constructor(onPause, onBlur, isPlaying = () => true) {
    this.keys = new Set();
    this.actions = new Set();
    window.addEventListener("keydown", (e) => {
      const editing =
        e.target instanceof Element &&
        e.target.closest("input,textarea,select");
      if (
        (e.code === "Escape" || (e.code === "KeyP" && !editing)) &&
        !e.repeat
      ) {
        e.preventDefault();
        onPause();
        return;
      }
      if (editing || !isPlaying()) return;
      if (MOVE_KEYS.has(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
      if (
        (e.code === "Space" || e.code === "Enter") &&
        e.target instanceof Element &&
        e.target.closest("button,a,summary")
      )
        return;
      if (ACTION_KEYS.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) this.actions.add(e.code);
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener("blur", () => {
      this.clear();
      onBlur();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clear();
        onBlur();
      }
    });
  }
  clear() {
    this.keys.clear();
    this.actions.clear();
  }
  read() {
    const k = (c) => (this.keys.has(c) ? 1 : 0);
    const input = [
      {
        x: k("KeyD") - k("KeyA"),
        y: k("KeyS") - k("KeyW"),
        dash: this.actions.has("Space"),
        light: this.actions.has("KeyE"),
        vine: this.actions.has("KeyQ"),
        pass: this.actions.has("KeyF"),
      },
      {
        x: k("ArrowRight") - k("ArrowLeft"),
        y: k("ArrowDown") - k("ArrowUp"),
        dash: this.actions.has("ShiftRight"),
        vine: this.actions.has("Enter"),
        pass: this.actions.has("KeyL"),
      },
    ];
    this.actions.clear();
    return input;
  }
}
