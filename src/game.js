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
import { updateGuard, updateCompanion, canDetect } from "./ai.js";

export class Game {
  constructor() {
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
    this.round++;
  }
  start(mode = 1, missionIndex = 0) {
    this.map = createMap(missionIndex);
    this.missionIndex = missionIndex;
    this.mode = mode;
    this.attempts = CONFIG.attempts;
    this.events = [];
    this.resetLevel();
    this.time = 0;
    this.state = GameState.PLAYING;
    this.notify(`Misión ${missionIndex + 1}: ${this.map.mission.briefing}`);
    this.messageTimer = 6;
    this.emit("start");
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
    if (!length) return;
    const delta = unprojectVector(
      (input.x / length) * CONFIG.playerSpeed * dt,
      (input.y / length) * CONFIG.playerSpeed * dt,
    );
    moveBody(player, delta.x, delta.y, this.map);
  }
  capture(player) {
    if (
      player.state === PlayerState.CAPTURED ||
      player.state === PlayerState.HIDDEN ||
      player.protection > 0
    )
      return false;
    player.state = PlayerState.CAPTURED;
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
        guard.state = GuardState.RETURN;
      }
    return true;
  }
  rescue() {
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
        captive.protection = CONFIG.protectionTime;
        captive.state = PlayerState.PROTECTED;
        this.emit("rescue", captive);
        this.notify("¡Juntos otra vez!");
      }
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
    if (collector) {
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
    // The arriving free explorer picks up a dropped flag before releasing its former carrier.
    this.collectFlag();
    this.rescue();
    for (const guard of this.guards) updateGuard(guard, this, dt);
    // Resolve all contacts before rescues/outcome: one double capture costs one attempt.
    for (const guard of this.guards)
      for (const player of this.players) {
        if (
          canDetect(guard, player, this.map, CONFIG.captureRadius) &&
          canTravelStraight(this.map, guard, player)
        )
          this.capture(player);
      }
    this.checkOutcome();
    if (this.state !== GameState.PLAYING) return;
    this.collectFlag();
    this.rescue();
    this.checkOutcome();
  }
  assertValid() {
    return (
      this.players.every((p) => isWalkable(this.map, p.x, p.y)) &&
      isWalkable(this.map, this.flag.x, this.flag.y)
    );
  }
}
