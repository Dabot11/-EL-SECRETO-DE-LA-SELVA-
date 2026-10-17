import { GameState, PlayerState, FlagState } from "./config.js";
import { MISSIONS } from "./missions.js";
import { paintPortrait, drawSprite } from "./sprites.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(game, input, audio) {
    this.audio = audio;
    this.game = game;
    this.input = input;
    this.previousState = null;
    this.howOpen = false;
    this.lastToast = "";
    this.paintPortraits();
    $("mission-route").innerHTML = MISSIONS.map(
      (mission, i) =>
        `<li data-mission="${i}"><span class="route-number">0${i + 1}</span><strong>${mission.name}</strong><small>${mission.subtitle}</small><span class="difficulty" aria-label="Dificultad ${i + 1} de 5">${"◆".repeat(i + 1)}<span>${"◇".repeat(4 - i)}</span></span></li>`,
    ).join("");
    for (const [id, key] of [
      ["music-toggle", "music"],
      ["effects-toggle", "effects"],
    ]) {
      $(id).checked = audio.settings[key];
      $(id).onchange = () => {
        audio.set(key, $(id).checked);
        this.unlockAudio();
      };
    }
    $("volume").value = Math.round(audio.settings.volume * 100);
    $("volume-value").textContent = `${$("volume").value}%`;
    $("volume").oninput = () => {
      audio.set("volume", Number($("volume").value) / 100);
      $("volume-value").textContent = `${$("volume").value}%`;
      this.unlockAudio();
    };
    $("play-solo").onclick = () => this.start(1);
    $("play-duo").onclick = () => this.start(2);
    $("how-to").onclick = () => this.showHow();
    $("close-how").onclick = () => this.closeHow();
    $("pause").onclick = () => this.pause();
    $("state-primary").onclick = () => {
      if (game.state === GameState.PAUSED) this.pause();
      else if (game.state === GameState.MISSION_COMPLETE) {
        input.clear();
        game.nextMission();
        this.unlockAudio();
        this.update();
        $("game-canvas").focus({ preventScroll: true });
      } else
        this.start(
          game.mode,
          game.state === GameState.GAME_OVER ? game.missionIndex : 0,
        );
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
  paintPortraits() {
    paintPortrait($("portrait-blue"));
    paintPortrait($("portrait-red"), true);
  }
  async unlockAudio() {
    const available = await this.audio.unlock();
    $("audio-status").textContent = available
      ? "Tus preferencias se guardan en este navegador."
      : "El audio no está disponible en este navegador.";
  }
  start(mode, missionIndex = 0) {
    this.unlockAudio();
    this.input.clear();
    this.closeHow(false);
    this.game.start(mode, missionIndex);
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
    const menu = state === GameState.MENU;
    $("chapter-name").textContent = menu
      ? "01—05 · CINCO MISIONES, UN GRAN SECRETO"
      : `0${g.missionIndex + 1} / 05 · ${g.map.mission.name.toUpperCase()}`;
    $("mission-progress").textContent =
      `MISIÓN ${g.missionIndex + 1} DE ${MISSIONS.length}`;
    for (const item of $("mission-route").children) {
      const index = Number(item.dataset.mission),
        done =
          !menu &&
          (index < g.missionIndex ||
            (index === g.missionIndex &&
              [GameState.MISSION_COMPLETE, GameState.VICTORY].includes(state)));
      item.classList.toggle("current", !menu && index === g.missionIndex);
      item.classList.toggle("completed", done);
      if (!menu && index === g.missionIndex)
        item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
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
      GameState.MISSION_COMPLETE,
      GameState.VICTORY,
      GameState.GAME_OVER,
    ].includes(state);
    $("state-screen").hidden = !modal;
    if (state !== this.previousState) {
      this.previousState = state;
      if (modal) {
        const won = state === GameState.VICTORY,
          completed = state === GameState.MISSION_COMPLETE,
          lost = state === GameState.GAME_OVER;
        $("state-eyebrow").textContent = won
          ? "EL SECRETO ESTABA EN HACERLO JUNTOS"
          : completed
            ? `MISIÓN ${g.missionIndex + 1} DE 5 · ${g.map.mission.name.toUpperCase()}`
            : lost
              ? "CADA AVENTURA TRAE UN NUEVO COMIENZO"
              : "UN MOMENTO PARA RESPIRAR";
        $("state-title").textContent = won
          ? "¡AVENTURA COMPLETADA!"
          : completed
            ? "¡MISIÓN COMPLETADA!"
            : lost
              ? "¡MISIÓN FALLIDA!"
              : "Aventura en pausa";
        $("state-description").textContent = won
          ? "¡Cinco banderas recuperadas y cinco mapas explorados juntos!"
          : completed
            ? `¡Recuperaron la bandera! Sigue ${MISSIONS[g.missionIndex + 1].name}, con tres nuevos intentos.`
            : lost
              ? `Pueden reintentar ${g.map.mission.name} sin volver a la primera misión.`
              : "La selva puede esperar. Continúen cuando estén listos.";
        $("state-primary").textContent = won
          ? "Volver a jugar →"
          : completed
            ? "Siguiente misión →"
            : lost
              ? "Reintentar esta misión →"
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
    const victory = [GameState.VICTORY, GameState.MISSION_COMPLETE].includes(
      this.game.state,
    );
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
