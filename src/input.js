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
    this.presses = [null, null];
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
        if (!e.repeat) {
          const i = e.code.startsWith("Arrow") ? 1 : 0;
          this.presses[i] = e.code;
        }
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
    this.presses = [null, null];
  }
  read() {
    const directions = {
      KeyW: { x: 0, y: -1 },
      KeyS: { x: 0, y: 1 },
      KeyA: { x: -1, y: 0 },
      KeyD: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const held = (index) =>
      directions[
        [...this.keys]
          .filter((key) => key.startsWith("Arrow") === (index === 1))
          .at(-1)
      ] ?? { x: 0, y: 0 };
    const input = [
      {
        ...held(0),
        pressed: directions[this.presses[0]] ?? null,
        dash: this.actions.has("Space"),
        light: this.actions.has("KeyE"),
        vine: this.actions.has("KeyQ"),
        pass: this.actions.has("KeyF"),
      },
      {
        ...held(1),
        pressed: directions[this.presses[1]] ?? null,
        dash: this.actions.has("ShiftRight"),
        vine: this.actions.has("Enter"),
        pass: this.actions.has("KeyL"),
      },
    ];
    this.actions.clear();
    this.presses = [null, null];
    return input;
  }
}
