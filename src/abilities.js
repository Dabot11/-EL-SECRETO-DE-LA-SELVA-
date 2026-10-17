import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import {
  distance,
  hasLineOfSight,
  canTravelStraight,
  moveBody,
} from "./collisions.js";

const free = (p) => p && p.state !== PlayerState.CAPTURED;
const visible = (g, p, target, range) =>
  distance(p, target) <= range && hasLineOfSight(g.map, p, target);
export function stun(guard, seconds) {
  guard.state = GuardState.STUNNED;
  guard.stunTime = Math.max(guard.stunTime ?? 0, seconds);
  guard.attack = null;
  guard.target = null;
  guard.moving = false;
}
export function useLight(game, player) {
  if (
    game.state !== GameState.PLAYING ||
    !free(player) ||
    !(game.mode === 1 || player.id === 0) ||
    player.lightCooldown > 0
  )
    return false;
  player.lightCooldown = CONFIG.lightCooldown;
  player.lightFlash = 0.35;
  game.stats.lights++;
  game.emit("light", player);
  for (const guard of game.guards)
    if (visible(game, player, guard, CONFIG.lightRange)) {
      guard.markedTime = game.mode === 1 ? 6 : 4;
      stun(guard, 0.7);
    }
  const bridge = game.bridge;
  if (
    bridge &&
    !bridge.open &&
    bridge.charged &&
    visible(game, player, bridge.winch, CONFIG.lightRange)
  ) {
    bridge.litTime = game.mode === 1 ? 8 : 4;
    game.notify(
      game.mode === 1
        ? "¡Mecanismo revelado! Pulsa Q para tirar con la liana."
        : "¡Mecanismo revelado! Rojo: usa ENTER para tirar con la liana.",
    );
  }
  return true;
}
export function useVine(game, player) {
  if (
    game.state !== GameState.PLAYING ||
    !free(player) ||
    !(game.mode === 1 || player.id === 1) ||
    player.vineCooldown > 0
  )
    return false;
  const bridge = game.bridge;
  const cast = (target) => {
    player.vineCooldown = CONFIG.vineCooldown;
    player.vineFlash = 0.3;
    player.vineTarget = { x: target.x, y: target.y };
    game.stats.vines++;
    game.emit("vine", player);
  };
  const captive = game.players.find(
    (p) =>
      p.id !== player.id &&
      !free(p) &&
      visible(game, player, p, CONFIG.vineRange) &&
      canTravelStraight(game.map, player, p),
  );
  if (captive) {
    cast(captive);
    const d = distance(player, captive),
      amount = Math.max(0, d - 0.45) / Math.max(0.01, d);
    moveBody(
      captive,
      (player.x - captive.x) * amount,
      (player.y - captive.y) * amount,
      game.map,
    );
    game.notify("¡Burbuja a salvo! Quédate cerca para completar el rescate.");
    return true;
  }
  const nearWinch =
    bridge &&
    !bridge.open &&
    visible(game, player, bridge.winch, CONFIG.vineRange);
  if (nearWinch && bridge.charged && bridge.litTime > 0) {
    cast(bridge.winch);
    game.openBridge();
    return true;
  }
  const guards = game.guards
    .filter((g) => visible(game, player, g, CONFIG.vineRange))
    .sort((a, b) => distance(player, a) - distance(player, b));
  const catchGuard = (guard) => {
    cast(guard);
    const combo = guard.markedTime > 0;
    stun(guard, combo ? 2.2 : 0.6);
    guard.markedTime = 0;
    if (combo) {
      game.stats.combos++;
      game.emit("combo", guard);
      game.notify("¡Luz + liana! Guardián inmovilizado.");
    }
    return true;
  };
  // A light mark is an explicit combat target; optional loot must not steal that action.
  const marked = guards.find((g) => g.markedTime > 0);
  if (marked) return catchGuard(marked);
  if (
    game.flag.state !== FlagState.CARRIED &&
    game.sealOpen() &&
    visible(game, player, game.flag, CONFIG.vineRange)
  ) {
    cast(game.flag);
    game.takeFlag(player);
    return true;
  }
  const relic = game.relics.find(
    (r) => !r.collected && visible(game, player, r, CONFIG.vineRange),
  );
  if (relic) {
    cast(relic);
    relic.collected = true;
    game.emit("relic", relic);
    game.notify("¡Tesoro recuperado con la liana!");
    return true;
  }
  if (guards.length) return catchGuard(guards[0]);
  if (nearWinch) {
    game.notify(
      !bridge.charged
        ? "Primero atrae al jaguar hacia la estatua."
        : game.mode === 1
          ? "Ilumina el mecanismo con E y después tira con Q."
          : "Azul: ilumina con E. Rojo: tira con ENTER.",
    );
    return false;
  }
  game.notify("La liana alcanza guardianes, tesoros y burbujas cercanas.");
  return false;
}
export function passFlag(game, player) {
  if (
    game.state !== GameState.PLAYING ||
    game.mode !== 2 ||
    game.flag.state !== FlagState.CARRIED ||
    !free(player) ||
    game.flag.carrier !== player.id ||
    game.flag.passCooldown > 0
  )
    return false;
  const receiver = game.players.find((p) => p.id !== player.id && free(p));
  if (!receiver || !visible(game, player, receiver, CONFIG.passRange)) {
    game.notify(
      "Acérquense y busquen una línea libre de muros para pasar la reliquia.",
    );
    return false;
  }
  game.flag.flight = {
    from: { x: player.x, y: player.y },
    to: { x: receiver.x, y: receiver.y },
    remaining: 0.35,
  };
  game.flag.carrier = receiver.id;
  game.flag.x = receiver.x;
  game.flag.y = receiver.y;
  game.flag.passCooldown = 0.8;
  receiver.protection = Math.max(receiver.protection, 0.45);
  game.stats.passes++;
  game.emit("pass", receiver);
  game.notify(
    `¡Pase al explorador ${receiver.id + 1}! Cambien de papel y sigan avanzando.`,
  );
  return true;
}
