import { GameState, PlayerState, FlagState } from "./config.js";
import { paintPortrait, drawSprite } from "./sprites.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.previousState = null;
    this.howOpen = false;
    this.lastToast = "";
    paintPortrait($("portrait-blue"));
    paintPortrait($("portrait-red"), true);
    $("play-solo").onclick = () => this.start(1);
    $("play-duo").onclick = () => this.start(2);
    $("how-to").onclick = () => this.showHow();
    $("close-how").onclick = () => this.closeHow();
    $("pause").onclick = () => this.pause();
    $("state-primary").onclick = () => {
      if (game.state === GameState.PAUSED) this.pause();
      else this.start(game.mode);
    };
    $("state-menu").onclick = () => {
      input.clear();
      game.menu();
      this.update();
      $("play-solo").focus({ preventScroll: true });
    };
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const modal = this.howOpen
        ? $("how-screen")
        : !$("state-screen").hidden
          ? $("state-screen")
          : null;
      if (!modal) return;
      const nodes = [...modal.querySelectorAll("button")],
        first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    });
  }
  start(mode) {
    this.input.clear();
    this.closeHow(false);
    this.game.start(mode);
    this.update();
    $("game-canvas").focus({ preventScroll: true });
  }
  showHow() {
    this.howOpen = true;
    $("how-screen").hidden = false;
    $("close-how").focus({ preventScroll: true });
  }
  closeHow(focus = true) {
    this.howOpen = false;
    $("how-screen").hidden = true;
    if (focus) $("how-to").focus({ preventScroll: true });
  }
  pause() {
    if (this.howOpen) {
      this.closeHow();
      return;
    }
    this.input.clear();
    this.game.togglePause();
    this.update();
    if (this.game.state === GameState.PLAYING)
      $("game-canvas").focus({ preventScroll: true });
  }
  update() {
    const g = this.game,
      state = g.state;
    $("menu").hidden = state !== GameState.MENU;
    $("hud").hidden = state === GameState.MENU;
    $("round-screen").hidden = state !== GameState.ROUND_RESET;
    $("round-description").textContent =
      `Quedan ${g.attempts} ${g.attempts === 1 ? "intento" : "intentos"}. ¡La aventura continúa!`;
    const carrying = g.flag.state === FlagState.CARRIED;
    $("objective").textContent = carrying
      ? "¡Regresen juntos a la entrada!"
      : g.flag.state === FlagState.DROPPED
        ? "Recupera la bandera caída"
        : "Encuentra la bandera";
    $("flag-status").textContent = carrying
      ? `⚑ La lleva el explorador ${g.flag.carrier + 1}`
      : g.flag.state === FlagState.DROPPED
        ? "⚑ En el suelo · acércate para recogerla"
        : "⚑ En el pedestal";
    $("attempts").setAttribute(
      "aria-label",
      `${g.attempts} intentos compartidos`,
    );
    [...$("attempts").children].forEach((crystal, i) =>
      crystal.classList.toggle("spent", i >= g.attempts),
    );
    for (const p of g.players) {
      const label =
        p.state === PlayerState.CAPTURED
          ? "¡ATRAPADO! · ACÉRCATE"
          : p.state === PlayerState.HIDDEN
            ? "OCULTO ENTRE LAS HOJAS"
            : p.protection > 0
              ? "PROTECCIÓN MÁGICA"
              : p.id === 0
                ? "W A S D"
                : g.mode === 1
                  ? p.aiState === "RESCUE"
                    ? "VOY A RESCATARTE"
                    : "COMPAÑERO IA"
                  : "↑ ← ↓ →";
      $(p.id === 0 ? "player-one-status" : "player-two-status").textContent =
        label;
    }
    const toastVisible = g.messageTimer > 0 && state === GameState.PLAYING;
    $("toast").hidden = !toastVisible;
    if (this.lastToast !== g.message) {
      $("toast").textContent = g.message;
      this.lastToast = g.message;
    }
    const modal = [
      GameState.PAUSED,
      GameState.VICTORY,
      GameState.GAME_OVER,
    ].includes(state);
    $("state-screen").hidden = !modal;
    if (state !== this.previousState) {
      this.previousState = state;
      if (modal) {
        const won = state === GameState.VICTORY,
          lost = state === GameState.GAME_OVER;
        $("state-eyebrow").textContent = won
          ? "EL SECRETO ESTABA EN HACERLO JUNTOS"
          : lost
            ? "CADA AVENTURA TRAE UN NUEVO COMIENZO"
            : "UN MOMENTO PARA RESPIRAR";
        $("state-title").textContent = won
          ? "¡MISIÓN COMPLETADA!"
          : lost
            ? "¡MISIÓN FALLIDA!"
            : "Aventura en pausa";
        $("state-description").textContent = won
          ? "¡Recuperaron la bandera y escaparon juntos del templo!"
          : lost
            ? "¡Los guardianes atraparon a los dos exploradores!"
            : "La selva puede esperar. Continúen cuando estén listos.";
        $("state-primary").textContent = won
          ? "Volver a jugar →"
          : lost
            ? "Reintentar →"
            : "Continuar la aventura →";
        $("state-primary").focus({ preventScroll: true });
      }
    }
  }
  animate(time) {
    if ($("state-screen").hidden) return;
    const c = $("result-art").getContext("2d");
    c.clearRect(0, 0, 180, 80);
    c.imageSmoothingEnabled = false;
    const victory = this.game.state === GameState.VICTORY;
    for (let i = 0; i < 2; i++)
      drawSprite(
        c,
        "explorer",
        62 + i * 56,
        72 - (victory ? Math.abs(Math.sin(time * 5 + i)) * 7 : 0),
        { red: i === 1, scale: 2, frame: victory ? Math.floor(time * 4) : 0 },
      );
    if (victory) {
      for (let i = 0; i < 16; i++) {
        c.fillStyle = ["#d3c47f", "#91ccb2", "#d99475"][i % 3];
        c.fillRect((i * 47) % 180, (time * 18 + i * 11) % 70, 2, 3);
      }
    } else if (this.game.state === GameState.GAME_OVER) {
      c.strokeStyle = "#8cd2e2";
      for (const x of [62, 118]) {
        c.beginPath();
        c.ellipse(x, 47, 22, 30, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
  }
}
