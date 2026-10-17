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
export class Input {
  constructor(onPause, onBlur) {
    this.keys = new Set();
    window.addEventListener("keydown", (e) => {
      if (MOVE_KEYS.has(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
      if ((e.code === "Escape" || e.code === "KeyP") && !e.repeat) {
        e.preventDefault();
        onPause();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (MOVE_KEYS.has(e.code)) e.preventDefault();
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
  }
  read() {
    const k = (code) => (this.keys.has(code) ? 1 : 0);
    return [
      { x: k("KeyD") - k("KeyA"), y: k("KeyS") - k("KeyW") },
      { x: k("ArrowRight") - k("ArrowLeft"), y: k("ArrowDown") - k("ArrowUp") },
    ];
  }
}
