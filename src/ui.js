import { CONFIG, GameState, PlayerState, FlagState } from "./config.js";
import { formatTime } from "./progress.js";
import { MISSIONS, THEMES } from "./missions.js";
import { createMap, TILE } from "./map.js";
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
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.previewImages = MISSIONS.map((_, i) => this.mapPreview(i));
    this.paintPortraits();
    this.routeMode = 1;
    this.routeKey = "";
    $("route-mode").onchange = () => {
      this.routeMode = Number($("route-mode").value);
      this.update();
    };
    $("continue-game").onclick = () => {
      const saved = game.progress.data.checkpoint;
      if (saved) this.start(saved.mode, saved.index);
    };
    $("mission-route").onclick = (e) => {
      const button = e.target.closest("button[data-mission]");
      if (!button || game.state !== GameState.MENU) return;
      const index = Number(button.dataset.mission);
      if (game.progress.unlocked(this.routeMode, index))
        this.start(this.routeMode, index);
    };
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
    $("fullscreen").hidden = !document.fullscreenEnabled;
    $("fullscreen").onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        game.notify(
          "El navegador no pudo abrir la pantalla completa. Puedes seguir jugando en toda la ventana.",
        );
      }
      $("game-canvas").focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", () => {
      const active = !!document.fullscreenElement;
      $("fullscreen").setAttribute("aria-pressed", String(active));
      $("fullscreen-label").textContent = active
        ? "Salir de pantalla completa"
        : "Pantalla completa";
    });
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
    for (const type of ["stone", "hunter", "spirit", "warden"]) {
      const canvas = $(`enemy-${type}`),
        c = canvas.getContext("2d");
      c.clearRect(0, 0, 80, 86);
      drawSprite(c, type, 40, 80, {
        scale: type === "hunter" ? 2 : type === "warden" ? 3.4 : 2.8,
      });
    }
  }
  mapPreview(index) {
    const map = createMap(index),
      palette = THEMES[map.theme];
    const canvas = document.createElement("canvas");
    canvas.width = map.width * 4;
    canvas.height = map.height * 4;
    const c = canvas.getContext("2d");
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const tile = map.cells[y][x];
        c.fillStyle =
          tile === TILE.WALL
            ? palette.stone
            : tile === TILE.WATER
              ? palette.water
              : tile === TILE.BRIDGE
                ? "#d4ac6b"
                : tile === TILE.BUSH
                  ? palette.bush
                  : palette.shadow;
        c.fillRect(
          x * 4,
          y * 4,
          tile === TILE.WALL ? 3 : 4,
          tile === TILE.WALL ? 3 : 4,
        );
      }
    for (const [point, color] of [
      [map.base, "#b5ffe3"],
      [map.pedestal, "#ffe29e"],
    ]) {
      c.fillStyle = color;
      c.fillRect(point.x * 4 - 2, point.y * 4 - 2, 4, 4);
    }
    return canvas.toDataURL();
  }
  setupAbilities(solo) {
    if (this.abilityMode === solo) return;
    this.abilityMode = solo;
    this.abilities = [];
    const add = (parent, id, key, name, cooldown, maximum, player) => {
      const node = document.createElement("div");
      node.className = "ability";
      node.setAttribute("role", "group");
      node.id = id;
      node.innerHTML = `<kbd>${key}</kbd><span>${name}</span><b>LISTA</b><i aria-hidden="true"></i>`;
      parent.append(node);
      this.abilities.push({
        node,
        label: node.querySelector("b"),
        name,
        cooldown,
        maximum,
        player,
      });
    };
    for (const suffix of ["one", "two"]) {
      $(`tools-${suffix}`).replaceChildren();
      $(`dash-${suffix}`).replaceChildren();
    }
    add(
      $("tools-one"),
      "ability-light",
      "E",
      "Luz",
      "lightCooldown",
      CONFIG.lightCooldown,
      0,
    );
    if (solo)
      add(
        $("tools-one"),
        "ability-vine",
        "Q",
        "Liana",
        "vineCooldown",
        CONFIG.vineCooldown,
        0,
      );
    else {
      add(
        $("tools-two"),
        "ability-vine",
        "ENTER",
        "Liana",
        "vineCooldown",
        CONFIG.vineCooldown,
        1,
      );
      add(
        $("tools-one"),
        "ability-pass-one",
        "F",
        "Pase",
        "passCooldown",
        0.8,
        0,
      );
      add(
        $("tools-two"),
        "ability-pass-two",
        "L",
        "Pase",
        "passCooldown",
        0.8,
        1,
      );
    }
    add(
      $("dash-one"),
      "ability-dash-one",
      "ESPACIO",
      "Impulso",
      "dashCooldown",
      CONFIG.dashCooldown,
      0,
    );
    if (!solo)
      add(
        $("dash-two"),
        "ability-dash-two",
        "SHIFT DER.",
        "Impulso",
        "dashCooldown",
        CONFIG.dashCooldown,
        1,
      );
  }
  updateAbilities(game) {
    for (const a of this.abilities) {
      const p = game.players[a.player];
      const pass = a.cooldown === "passCooldown";
      const value = pass ? game.flag.passCooldown : p[a.cooldown];
      const unavailable =
        p.state === PlayerState.CAPTURED ||
        (pass && game.flag.carrier !== p.id);
      const status = unavailable
        ? "—"
        : value > 0
          ? `${value.toFixed(1)}s`
          : "LISTO";
      if (a.status !== status) {
        a.status = status;
        a.label.textContent = status;
        a.node.classList.toggle("unavailable", unavailable);
        a.node.classList.toggle("recharging", !unavailable && value > 0);
        a.node.setAttribute(
          "aria-label",
          `${a.name}: ${unavailable ? "no disponible" : value > 0 ? `RECARGA ${status}` : "lista"}`,
        );
        // Keep the keyboard hint and countdown legible without announcing every frame.
        a.node.title = a.node.getAttribute("aria-label");
      }
      a.node.style.setProperty(
        "--ready",
        unavailable ? 0 : Math.max(0, 1 - value / a.maximum),
      );
    }
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
    this.routeMode = mode;
    $("route-mode").value = mode;
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
    if (this.inGame !== !menu) {
      if (!menu) this.menuScroll = window.scrollY;
      document.body.classList.toggle("playing", !menu);
      if (menu && this.inGame) {
        window.scrollTo(0, this.menuScroll ?? 0);
        if (document.fullscreenElement)
          document.exitFullscreen().catch(() => {});
      }
      this.inGame = !menu;
    }
    $("chapter-name").textContent = menu
      ? `01—${MISSIONS.length} · DIEZ MISIONES, UN GRAN SECRETO`
      : `${String(g.missionIndex + 1).padStart(2, "0")} / ${MISSIONS.length} · ${g.map.mission.name.toUpperCase()}`;
    $("mission-progress").textContent =
      `MISIÓN ${g.missionIndex + 1} DE ${MISSIONS.length}`;
    const checkpoint = g.progress.data.checkpoint;
    $("continue-game").hidden = !checkpoint;
    if (checkpoint)
      $("continue-game").textContent =
        `Continuar misión ${checkpoint.index + 1} · ${checkpoint.mode === 1 ? "un jugador" : "de a dos"} →`;
    $("save-status").textContent = g.progress.available
      ? "Tu avance se guarda en este navegador. Continuar reinicia la misión pendiente."
      : "El navegador no permite guardar. Puedes jugar y avanzar durante esta sesión.";
    const routeKey = JSON.stringify([
      menu,
      g.missionIndex,
      this.routeMode,
      g.progress.data.records,
      g.progress.data.unlocked,
    ]);
    if (routeKey !== this.routeKey) {
      this.routeKey = routeKey;
      $("mission-route").innerHTML = MISSIONS.map((mission, i) => {
        const record = g.progress.record(this.routeMode, i),
          unlocked = g.progress.unlocked(this.routeMode, i),
          current = !menu && i === g.missionIndex;
        return `<li class="${record ? "completed " : ""}${unlocked ? "unlocked " : "locked "}${current ? "current" : ""}" style="--region-color:${THEMES[mission.theme].accent}" ${current ? 'aria-current="step"' : ""}><button data-mission="${i}" ${!menu || !unlocked ? "disabled" : ""} aria-label="${unlocked ? "Jugar" : "Bloqueada"}: ${mission.name}"><div class="route-preview"><img src="${this.previewImages[i]}" alt="" /><span class="route-number">${String(i + 1).padStart(2, "0")}</span><span class="route-badge">${record ? "EXPLORADA" : unlocked ? "DISPONIBLE" : "POR DESCUBRIR"}</span></div><div class="route-copy"><strong>${mission.name}</strong><small>${mission.subtitle}</small><span class="difficulty" aria-label="Dificultad ${mission.difficulty} de ${MISSIONS.length}">${"◆".repeat(mission.difficulty)}<span>${"◇".repeat(MISSIONS.length - mission.difficulty)}</span></span><small class="route-record">${record ? `${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)} · ${formatTime(record.time)} · ${record.score} pts` : unlocked ? "EMPEZAR EXPEDICIÓN →" : "Completa la misión anterior"}</small></div></button></li>`;
      }).join("");
    }
    $("hud").hidden = state === GameState.MENU;
    $("round-screen").hidden = state !== GameState.ROUND_RESET;
    $("round-description").textContent =
      `Quedan ${g.attempts} ${g.attempts === 1 ? "intento" : "intentos"}. ¡La aventura continúa!`;
    const solo = g.mode === 1,
      carrying = g.flag.state === FlagState.CARRIED,
      bridge = g.bridge;
    $("hud-mission-name").textContent = g.map.mission.name;
    const stage = carrying ? 2 : g.sealOpen() ? 1 : 0;
    ["step-seal", "step-relic", "step-home"].forEach((id, i) => {
      $(id).classList.toggle("complete", i < stage);
      $(id).classList.toggle("active", i === stage);
      if (i === stage) $(id).setAttribute("aria-current", "step");
      else $(id).removeAttribute("aria-current");
    });
    this.setupAbilities(solo);
    this.updateAbilities(g);
    const bridgeStep =
      bridge && !bridge.open
        ? !bridge.charged
          ? 1
          : bridge.litTime <= 0
            ? 2
            : 3
        : 0;
    $("objective").textContent =
      bridgeStep === 1
        ? "Atrae el salto hacia la estatua"
        : bridgeStep === 2
          ? "Ilumina el mecanismo del puente"
          : bridgeStep === 3
            ? "¡Tira del mecanismo con la liana!"
            : carrying
              ? solo
                ? "¡Vuelve a la entrada!"
                : "¡Regresen juntos a la entrada!"
              : g.flag.state === FlagState.DROPPED
                ? "Recupera la reliquia caída"
                : g.sealOpen()
                  ? "¡Busca la reliquia!"
                  : "Activa las runas de jade";
    $("flag-status").textContent =
      bridgeStep === 1
        ? "Ponte tras la estatua y esquiva al ver el aviso"
        : bridgeStep === 2
          ? "Acércate al mecanismo y pulsa E"
          : bridgeStep === 3
            ? solo
              ? "Q · liana"
              : "Rojo: ENTER · liana"
            : carrying
              ? solo
                ? "◆ La llevas contigo · el campamento ya no cura"
                : `◆ La lleva ${g.flag.carrier === 0 ? "azul · F" : "rojo · L"} para pasar`
              : g.sealOpen()
                ? "◆ Sello abierto · contacto o liana para recoger"
                : "◆ Quédate cerca de cada runa para activarla";
    $("rune-count").textContent = bridge
      ? bridge.open
        ? "◇ PUENTE ABIERTO"
        : `◇ PUENTE · PASO ${bridgeStep}/3`
      : `◇ RUNAS ${g.runes.filter((r) => r.active).length}/${g.runes.length}`;
    $("relic-count").textContent =
      `✦ TESOROS ${g.relics.filter((r) => r.collected).length}/3`;
    $("mission-clock").textContent = formatTime(g.stats.time);
    $("hud").classList.toggle("alarm", g.alarm);
    $("hud").classList.toggle("solo", solo);
    $("player-two-panel").hidden = solo;
    $("player-one-role").textContent = solo ? "EXPLORADOR" : "AZUL · LINTERNA";
    $("lives-label").textContent = solo ? "CORAZONES" : "INTENTOS COMPARTIDOS";
    const lives = solo ? g.players[0].hearts : g.attempts;
    $("attempts").setAttribute(
      "aria-label",
      `${lives} ${solo ? "corazones" : "intentos compartidos"}`,
    );
    [...$("attempts").children].forEach((crystal, i) =>
      crystal.classList.toggle("spent", i >= lives),
    );
    for (const p of g.players) {
      const first = p.id === 0,
        captured = p.state === PlayerState.CAPTURED;
      $(first ? "player-one-status" : "player-two-status").textContent =
        captured
          ? "¡ATRAPADO! · RUEDA Y ACÉRCATE"
          : p.campProgress > 0
            ? `CURANDO · ${Math.ceil(2 - p.campProgress)}s`
            : p.state === PlayerState.HIDDEN
              ? "OCULTO ENTRE LAS HOJAS"
              : p.protection > 0
                ? "PROTECCIÓN MÁGICA"
                : first
                  ? "W A S D"
                  : "↑ ← ↓ →";
      $(first ? "player-one-panel" : "player-two-panel").classList.toggle(
        "captured",
        captured,
      );
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
          ? solo
            ? "EL SECRETO ESTABA EN SEGUIR EXPLORANDO"
            : "EL SECRETO ESTABA EN HACERLO JUNTOS"
          : completed
            ? `MISIÓN ${g.missionIndex + 1} DE ${MISSIONS.length} · ${g.map.mission.name.toUpperCase()}`
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
          ? solo
            ? `¡${MISSIONS.length} reliquias recuperadas con tu ingenio y tus dos herramientas!`
            : `¡${MISSIONS.length} reliquias recuperadas en equipo!`
          : completed
            ? `¡Reliquia recuperada! Sigue ${MISSIONS[g.missionIndex + 1].name}, con ${solo ? "tres corazones" : "tres nuevos intentos"}.`
            : lost
              ? `${solo ? "Puedes" : "Pueden"} reintentar ${g.map.mission.name} desde el comienzo de esta misión.`
              : solo
                ? "La selva puede esperar. Continúa cuando estés listo."
                : "La selva puede esperar. Continúen cuando estén listos.";
        const result = g.result;
        $("result-stats").hidden = !(won || completed) || !result;
        if ((won || completed) && result)
          $("result-stats").innerHTML =
            `<div class="result-stars" aria-label="${result.stars} de 3 estrellas">${"★".repeat(result.stars)}<span>${"☆".repeat(3 - result.stars)}</span></div><div class="result-metrics"><span><b>${result.score}</b>PUNTOS</span><span><b>${formatTime(result.time)}</b>TIEMPO</span><span><b>${result.relics}/3</b>TESOROS</span><span><b>${result.captures}</b>${solo ? "GOLPES" : "CAPTURAS"}</span></div><small>${result.clean ? "★ Expedición limpia" : solo ? "☆ Expedición limpia: máximo 1 golpe" : "☆ Expedición limpia: sin perder intentos, máximo 2 capturas"} · ${result.relics === 3 ? "★ Todos los tesoros" : "☆ Encuentra los 3 tesoros"}</small>${solo ? "" : `<small>${result.passes} ${result.passes === 1 ? "pase" : "pases"} · ${result.combos} ${result.combos === 1 ? "combo" : "combos"} · ${result.rescues} ${result.rescues === 1 ? "rescate" : "rescates"}</small>`}`;
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
    if (this.reducedMotion.matches) time = 0;
    const c = $("result-art").getContext("2d");
    c.clearRect(0, 0, 180, 80);
    c.imageSmoothingEnabled = false;
    const victory = [GameState.VICTORY, GameState.MISSION_COMPLETE].includes(
      this.game.state,
    );
    for (let i = 0; i < this.game.players.length; i++)
      drawSprite(
        c,
        "explorer",
        this.game.mode === 1 ? 90 : 62 + i * 56,
        72 - (victory ? Math.abs(Math.sin(time * 5 + i)) * 7 : 0),
        { red: i === 1, scale: 2, frame: victory ? Math.floor(time * 4) : 0 },
      );
    if (victory) {
      for (let i = 0; i < 16; i++) {
        c.fillStyle = ["#d3c47f", "#91ccb2", "#d99475"][i % 3];
        c.fillRect((i * 47) % 180, (time * 18 + i * 11) % 70, 2, 3);
      }
    } else if (
      this.game.state === GameState.GAME_OVER &&
      this.game.mode === 2
    ) {
      c.strokeStyle = "#8cd2e2";
      for (const x of [62, 118]) {
        c.beginPath();
        c.ellipse(x, 47, 22, 30, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
  }
}
