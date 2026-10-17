import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import { createMap, isBush, isWalkable, TILE } from "./map.js";
import { MISSIONS } from "./missions.js";
import { createPlayers, createGuards, createFlag } from "./entities.js";
import {
  distance,
  hasLineOfSight,
  canTravelStraight,
  moveBody,
  unprojectVector,
} from "./collisions.js";
import { updateGuard, segmentDistance } from "./ai.js";
import { Progress } from "./progress.js";
import { useLight, useVine, passFlag } from "./abilities.js";
import { trapPhase } from "./challenges.js";

export class Game {
  constructor(progress = new Progress()) {
    this.progress = progress;
    this.stats = {
      time: 0,
      captures: 0,
      rescues: 0,
      dashes: 0,
      lights: 0,
      vines: 0,
      passes: 0,
      combos: 0,
    };
    this.result = null;
    this.map = createMap(0, 1);
    this.missionIndex = 0;
    this.mode = 1;
    this.state = GameState.MENU;
    this.attempts = CONFIG.attempts;
    this.time = 0;
    this.events = [];
    this.message = "";
    this.messageTimer = 0;
    this.resetTimer = 0;
    this.round = 0;
    this.resetLevel();
  }
  emit(type, position = {}) {
    this.events.push({ type, x: position.x, y: position.y });
  }
  notify(message) {
    this.message = message;
    this.messageTimer = 3.5;
  }
  resetLevel() {
    this.players = createPlayers(this.map, this.mode);
    this.guards = createGuards(this.map, this.mode);
    this.flag = createFlag(this.map);
    const layout = this.map.mission.bridge;
    this.bridge = layout
      ? { ...layout, charged: false, open: false, litTime: 0 }
      : null;
    if (this.bridge) {
      for (const [x, y] of this.bridge.tiles) this.map.cells[y][x] = TILE.WATER;
      this.map.revision++;
    }
    this.runes = this.map.mission.runes.map(([x, y], id) => ({
      id,
      x: x + 0.5,
      y: y + 0.5,
      active: false,
      progress: 0,
    }));
    this.relics = this.map.mission.relics.map(([x, y], id) => ({
      id,
      x: x + 0.5,
      y: y + 0.5,
      collected: false,
    }));
    this.traps = this.map.mission.traps.map((t) => ({
      ...t,
      x: t.x + 0.5,
      y: t.y + 0.5,
    }));
    this.alarm = false;
    this.lockHintTimer = 0;
    this.round++;
  }
  start(mode = 1, missionIndex = 0) {
    if (mode !== 1 && mode !== 2) throw new RangeError("Modalidad inválida");
    this.map = createMap(missionIndex, mode);
    this.missionIndex = missionIndex;
    this.mode = mode;
    this.attempts = CONFIG.attempts;
    this.events = [];
    this.stats = {
      time: 0,
      captures: 0,
      rescues: 0,
      dashes: 0,
      lights: 0,
      vines: 0,
      passes: 0,
      combos: 0,
    };
    this.result = null;
    this.resetLevel();
    this.time = 0;
    this.state = GameState.PLAYING;
    this.notify(`Misión ${missionIndex + 1}: ${this.map.mission.briefing}`);
    this.messageTimer = 8;
    this.emit("start");
    this.progress.checkpoint(mode, missionIndex);
  }
  nextMission() {
    if (this.state !== GameState.MISSION_COMPLETE) return false;
    this.start(this.mode, this.missionIndex + 1);
    return true;
  }
  retryMission() {
    this.start(this.mode, this.missionIndex);
  }
  menu() {
    this.state = GameState.MENU;
    this.missionIndex = 0;
    this.map = createMap(0, this.mode ?? 1);
    this.attempts = CONFIG.attempts;
    this.resetLevel();
    this.events = [];
  }
  togglePause() {
    if (this.state === GameState.PLAYING) this.state = GameState.PAUSED;
    else if (this.state === GameState.PAUSED) this.state = GameState.PLAYING;
  }
  refreshPlayerStates(dt = 0) {
    for (const p of this.players) {
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.dashTime = Math.max(0, p.dashTime - dt);
      p.slowTime = Math.max(0, p.slowTime - dt);
      for (const key of [
        "lightCooldown",
        "vineCooldown",
        "lightFlash",
        "vineFlash",
      ])
        p[key] = Math.max(0, p[key] - dt);
      if (p.state === PlayerState.CAPTURED) continue;
      p.protection = Math.max(0, p.protection - dt);
      const previous = p.state;
      p.state = isBush(this.map, p.x, p.y)
        ? PlayerState.HIDDEN
        : p.protection > 0
          ? PlayerState.PROTECTED
          : PlayerState.NORMAL;
      if (p.state === PlayerState.HIDDEN && previous !== PlayerState.HIDDEN)
        this.emit("leaves", p);
    }
  }
  sealOpen() {
    return (
      (!this.bridge || this.bridge.open) && this.runes.every((r) => r.active)
    );
  }
  openBridge() {
    if (!this.bridge || this.bridge.open) return false;
    this.bridge.open = true;
    for (const [x, y] of this.bridge.tiles) this.map.cells[y][x] = TILE.BRIDGE;
    this.map.revision++;
    this.emit("bridge", this.bridge.winch);
    this.notify(
      this.mode === 1
        ? "¡Puente abierto! Recupera la reliquia y vuelve."
        : "¡Puente abierto! Recuperen la reliquia y pásensela durante la huida.",
    );
  }
  strikeStatue(guard, previous) {
    if (
      !this.bridge ||
      this.bridge.charged ||
      guard.type !== "hunter" ||
      guard.state !== GuardState.LUNGE ||
      segmentDistance(this.bridge.statue, previous, guard) > 0.65
    )
      return false;
    this.bridge.charged = true;
    guard.state = GuardState.RECOVER;
    guard.recovery = 2.5;
    guard.attack = null;
    guard.attackCooldown = 1;
    this.emit("statue", this.bridge.statue);
    this.notify(
      this.mode === 1
        ? "¡Estatua cargada! Ve al mecanismo junto al puente: E ilumina, Q tira."
        : "¡Estatua cargada! Azul ilumina el mecanismo con E y rojo tira con ENTER.",
    );
    return true;
  }
  useLight(player) {
    return useLight(this, player);
  }
  useVine(player) {
    return useVine(this, player);
  }
  passFlag(player) {
    return passFlag(this, player);
  }
  takeFlag(player) {
    this.alarm = true;
    Object.assign(this.flag, {
      state: FlagState.CARRIED,
      carrier: player.id,
      x: player.x,
      y: player.y,
    });
    this.emit("flag", player);
    this.notify(
      this.mode === 1
        ? "¡La reliquia es tuya! Regresa a la entrada."
        : "¡Reliquia recuperada! Azul: F para pasar. Rojo: L para pasar.",
    );
  }
  movePlayer(player, input, dt) {
    player.moving = false;
    if (player.state === PlayerState.CAPTURED) {
      const length = Math.hypot(input.x, input.y);
      if (length) {
        const d = unprojectVector(
          (input.x / length) * CONFIG.bubbleSpeed * dt,
          (input.y / length) * CONFIG.bubbleSpeed * dt,
        );
        moveBody(player, d.x, d.y, this.map);
      }
      return;
    }
    const length = Math.hypot(input.x, input.y);
    if (input.dash && length && player.dashCooldown <= 0) {
      player.dashTime = CONFIG.dashDuration;
      player.dashCooldown = CONFIG.dashCooldown;
      player.dashVector = { x: input.x / length, y: input.y / length };
      this.stats.dashes++;
      this.emit("dash", player);
    }
    const dashing = player.dashTime > 0;
    if (!length && !dashing) return;
    const direction = dashing
      ? player.dashVector
      : { x: input.x / length, y: input.y / length };
    const speed = dashing
      ? CONFIG.dashSpeed
      : CONFIG.playerSpeed *
        (player.slowTime > 0 ? 0.62 : 1) *
        (this.flag.carrier === player.id ? (this.mode === 1 ? 0.93 : 0.78) : 1);
    const delta = unprojectVector(
      direction.x * speed * dt,
      direction.y * speed * dt,
    );
    moveBody(player, delta.x, delta.y, this.map);
  }
  collectObjectives(dt) {
    const near = (p, item, r = 0.72) =>
      p.state !== PlayerState.CAPTURED &&
      distance(p, item) < r &&
      canTravelStraight(this.map, p, item);
    if (this.mode === 1) {
      const p = this.players[0];
      p.campProgress =
        p.hearts < CONFIG.hearts &&
        !this.alarm &&
        distance(p, this.map.base) <= CONFIG.safeRadius
          ? p.campProgress + dt
          : 0;
      if (p.campProgress >= 2) {
        p.hearts = CONFIG.hearts;
        p.campProgress = 0;
        this.emit("heal", p);
        this.notify("Campamento: corazones recuperados.");
      }
    }
    for (const rune of this.runes) {
      if (rune.active) continue;
      rune.progress = this.players.some((p) => near(p, rune))
        ? Math.min(CONFIG.runeTime, rune.progress + dt)
        : 0;
      if (rune.progress >= CONFIG.runeTime) {
        rune.active = true;
        this.emit("rune", rune);
        const count = this.runes.filter((r) => r.active).length;
        this.notify(
          count === this.runes.length
            ? "¡El sello se abrió! La reliquia ya está disponible."
            : `Runa ${count} de ${this.runes.length} activada.`,
        );
      }
    }
    for (const relic of this.relics)
      if (!relic.collected && this.players.some((p) => near(p, relic, 0.6))) {
        relic.collected = true;
        this.emit("relic", relic);
        this.notify(
          `Tesoro ${this.relics.filter((r) => r.collected).length} de 3. ¡Buen hallazgo!`,
        );
      }
    for (const trap of this.traps)
      if (trapPhase(trap, this.time) === "active")
        for (const p of this.players) {
          if (
            p.state !== PlayerState.CAPTURED &&
            p.dashTime <= 0 &&
            p.protection <= 0 &&
            distance(p, trap) < 0.62
          ) {
            if (p.slowTime <= 0) this.emit("trap", p);
            p.slowTime = 1.1;
          }
        }
  }
  finishMission() {
    const relics = this.relics.filter((r) => r.collected).length,
      clean =
        this.mode === 1
          ? this.stats.captures <= 1
          : this.attempts === CONFIG.attempts && this.stats.captures <= 2;
    this.result = {
      ...this.stats,
      time: Math.max(0.01, this.stats.time),
      relics,
      clean,
      stars: 1 + (relics === 3 ? 1 : 0) + (clean ? 1 : 0),
      score: Math.max(
        100,
        Math.round(
          1000 +
            relics * 200 +
            Math.max(0, this.map.mission.par - this.stats.time) * 5 -
            this.stats.captures * 35 -
            (CONFIG.attempts - this.attempts) * 200,
        ),
      ),
    };
    this.progress.complete(this.mode, this.missionIndex, this.result);
  }
  capture(player) {
    if (
      this.state !== GameState.PLAYING ||
      player.state === PlayerState.CAPTURED ||
      player.state === PlayerState.HIDDEN ||
      player.protection > 0 ||
      player.dashTime > 0
    )
      return false;
    if (this.mode === 1) {
      player.hearts--;
      this.stats.captures++;
      player.dashTime = 0;
      this.emit("hurt", player);
      if (player.hearts <= 0) {
        this.attempts = 0;
        this.state = GameState.GAME_OVER;
        player.moving = false;
        this.emit("round");
        this.notify("Sin corazones. Puedes reintentar esta misión.");
      } else {
        player.protection = 1.7;
        player.state = PlayerState.PROTECTED;
        this.notify(
          `Quedan ${player.hearts} corazones. Antes de tomar la reliquia puedes curarte en la entrada.`,
        );
      }
      return true;
    }
    player.state = PlayerState.CAPTURED;
    player.rescueProgress = 0;
    player.dashTime = 0;
    this.stats.captures++;
    player.moving = false;
    this.emit("capture", player);
    if (this.flag.carrier === player.id) {
      // The carrier is already on navigable ground; keep the dropped flag there.
      Object.assign(this.flag, {
        state: FlagState.DROPPED,
        carrier: null,
        flight: null,
        x: player.x,
        y: player.y,
      });
      this.notify("¡La reliquia cayó! Acércate para recuperarla.");
    } else this.notify("¡Tu compañero necesita un rescate!");
    for (const guard of this.guards)
      if (guard.target === player.id) {
        guard.target = null;
        if (
          ![GuardState.WINDUP, GuardState.LUNGE, GuardState.RECOVER].includes(
            guard.state,
          )
        )
          guard.state = GuardState.RETURN;
      }
    return true;
  }
  rescue(dt = 0) {
    for (const captive of this.players) {
      if (captive.state !== PlayerState.CAPTURED) continue;
      const rescuer = this.players.find(
        (p) => p.id !== captive.id && p.state !== PlayerState.CAPTURED,
      );
      if (
        rescuer &&
        distance(rescuer, captive) <= CONFIG.rescueRadius &&
        hasLineOfSight(this.map, rescuer, captive) &&
        canTravelStraight(this.map, rescuer, captive)
      ) {
        captive.rescueProgress = Math.min(
          CONFIG.rescueTime,
          captive.rescueProgress + dt,
        );
        if (captive.rescueProgress < CONFIG.rescueTime) continue;
        this.stats.rescues++;
        captive.rescueProgress = 0;
        captive.protection = CONFIG.protectionTime;
        rescuer.protection = Math.max(rescuer.protection, 0.8);
        if (rescuer.state !== PlayerState.HIDDEN)
          rescuer.state = PlayerState.PROTECTED;
        captive.state = PlayerState.PROTECTED;
        this.emit("rescue", captive);
        this.notify("¡Juntos otra vez!");
      } else captive.rescueProgress = 0;
    }
  }
  collectFlag() {
    if (this.flag.state === FlagState.CARRIED) {
      const carrier = this.players[this.flag.carrier];
      this.flag.x = carrier.x;
      this.flag.y = carrier.y;
      return;
    }
    const collector = this.players.find(
      (p) =>
        p.state !== PlayerState.CAPTURED &&
        distance(p, this.flag) < CONFIG.pickupRadius &&
        canTravelStraight(this.map, p, this.flag),
    );
    if (
      collector &&
      this.flag.state === FlagState.ON_PEDESTAL &&
      !this.sealOpen()
    ) {
      if (this.lockHintTimer <= 0) {
        this.notify(
          this.bridge && !this.bridge.open
            ? "La reliquia está sellada. Abre el puente del jaguar."
            : "La reliquia está sellada. Activa las runas de jade.",
        );
        this.lockHintTimer = 4;
      }
      return;
    }
    if (collector) this.takeFlag(collector);
  }

  checkOutcome() {
    if (this.state !== GameState.PLAYING) return;
    if (
      this.mode === 2 &&
      this.players.every((p) => p.state === PlayerState.CAPTURED)
    ) {
      this.attempts--;
      this.emit("round");
      this.state =
        this.attempts > 0 ? GameState.ROUND_RESET : GameState.GAME_OVER;
      this.resetTimer = CONFIG.resetTime;
      this.notify("¡Los guardianes los atraparon!");
      return;
    }
    if (
      this.flag.state === FlagState.CARRIED &&
      this.players.every(
        (p) =>
          p.state !== PlayerState.CAPTURED &&
          distance(p, this.map.base) <= CONFIG.baseRadius,
      )
    ) {
      this.state =
        this.missionIndex === MISSIONS.length - 1
          ? GameState.VICTORY
          : GameState.MISSION_COMPLETE;
      this.finishMission();
      this.emit("victory", this.map.base);
    }
  }
  update(
    dt,
    inputs = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  ) {
    dt = Math.min(Math.max(0, dt), 0.05);
    if (
      this.state === GameState.PAUSED ||
      this.state === GameState.MENU ||
      this.state === GameState.VICTORY ||
      this.state === GameState.MISSION_COMPLETE ||
      this.state === GameState.GAME_OVER
    )
      return;
    this.time += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.state === GameState.ROUND_RESET) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetLevel();
        this.state = GameState.PLAYING;
        this.notify("¡Un nuevo intento! La selva guarda su secreto.");
      }
      return;
    }
    if (this.bridge)
      this.bridge.litTime = Math.max(0, this.bridge.litTime - dt);
    this.flag.passCooldown = Math.max(0, this.flag.passCooldown - dt);
    if (this.flag.flight) {
      this.flag.flight.remaining -= dt;
      if (this.flag.flight.remaining <= 0) this.flag.flight = null;
    }
    this.refreshPlayerStates(dt);
    this.movePlayer(this.players[0], inputs[0] ?? { x: 0, y: 0 }, dt);
    this.refreshPlayerStates();
    if (this.mode === 2)
      this.movePlayer(this.players[1], inputs[1] ?? { x: 0, y: 0 }, dt);
    for (const p of this.players) {
      const action = inputs[p.id] ?? {};
      if (action.light) this.useLight(p);
      if (action.vine) this.useVine(p);
      if (action.pass) this.passFlag(p);
    }
    this.refreshPlayerStates();
    this.stats.time += dt;
    this.lockHintTimer = Math.max(0, this.lockHintTimer - dt);
    this.collectObjectives(dt);
    // Attacks resolve before rescue progress, so one simultaneous capture costs one attempt.
    this.collectFlag();
    for (const guard of this.guards) updateGuard(guard, this, dt);
    this.checkOutcome();
    if (this.state !== GameState.PLAYING) return;
    this.rescue(dt);
    this.collectFlag();
    this.checkOutcome();
  }
  assertValid() {
    return (
      this.players.every((p) => isWalkable(this.map, p.x, p.y)) &&
      isWalkable(this.map, this.flag.x, this.flag.y)
    );
  }
}
