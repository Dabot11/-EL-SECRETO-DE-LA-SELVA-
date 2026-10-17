import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import { createMap, isBush, isWalkable } from "./map.js";
import { MISSIONS } from "./missions.js";
import { createPlayers, createGuards, createFlag } from "./entities.js";
import {
  distance,
  hasLineOfSight,
  canTravelStraight,
  moveBody,
  unprojectVector,
} from "./collisions.js";
import { updateGuard, updateCompanion } from "./ai.js";
import { Progress } from "./progress.js";
import { trapPhase } from "./challenges.js";

export class Game {
  constructor(progress = new Progress()) {
    this.progress = progress;
    this.stats = { time: 0, captures: 0, rescues: 0, dashes: 0 };
    this.result = null;
    this.map = createMap();
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
    this.players = createPlayers(this.map);
    this.guards = createGuards(this.map);
    this.flag = createFlag(this.map);
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
    this.map = createMap(missionIndex);
    this.missionIndex = missionIndex;
    this.mode = mode;
    this.attempts = CONFIG.attempts;
    this.events = [];
    this.stats = { time: 0, captures: 0, rescues: 0, dashes: 0 };
    this.result = null;
    this.resetLevel();
    this.time = 0;
    this.state = GameState.PLAYING;
    this.notify(`Misión ${missionIndex + 1}: ${this.map.mission.briefing}`);
    this.messageTimer = 6;
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
    this.map = createMap();
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
  movePlayer(player, input, dt) {
    player.moving = false;
    if (player.state === PlayerState.CAPTURED) return;
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
        (this.flag.carrier === player.id ? 0.93 : 1);
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
            ? "¡El sello se abrió! Busquen la bandera."
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
      clean = this.attempts === CONFIG.attempts && this.stats.captures <= 2;
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
      player.state === PlayerState.CAPTURED ||
      player.state === PlayerState.HIDDEN ||
      player.protection > 0 ||
      player.dashTime > 0
    )
      return false;
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
        x: player.x,
        y: player.y,
      });
      this.notify("¡La bandera cayó! Acércate para recuperarla.");
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
      !this.runes.every((r) => r.active)
    ) {
      if (this.lockHintTimer <= 0) {
        this.notify("La bandera está sellada. Activa las runas de jade.");
        this.lockHintTimer = 4;
      }
      return;
    }
    if (collector) {
      this.alarm = true;
      this.flag.state = FlagState.CARRIED;
      this.flag.carrier = collector.id;
      this.flag.x = collector.x;
      this.flag.y = collector.y;
      this.emit("flag", collector);
      this.notify("¡Tienen la bandera! Regresen juntos a la entrada.");
    }
  }
  checkOutcome() {
    if (this.state !== GameState.PLAYING) return;
    if (this.players.every((p) => p.state === PlayerState.CAPTURED)) {
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
    this.refreshPlayerStates(dt);
    this.movePlayer(this.players[0], inputs[0], dt);
    this.refreshPlayerStates();
    if (this.mode === 1) updateCompanion(this, dt);
    else this.movePlayer(this.players[1], inputs[1], dt);
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
