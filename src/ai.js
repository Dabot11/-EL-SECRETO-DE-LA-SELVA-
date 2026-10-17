import { CONFIG, PlayerState, GuardState, FlagState } from "./config.js";
import {
  distance,
  hasLineOfSight,
  canTravelStraight,
  moveBody,
  projectVector,
  unprojectVector,
  canOccupy,
} from "./collisions.js";
import { navigate, findPath } from "./navigation.js";
import { isBush } from "./map.js";
import { ENEMIES, trapPhase } from "./challenges.js";

export function canDetect(
  guard,
  player,
  map,
  range = guard.detectionRange ?? CONFIG.detectionRange,
) {
  return (
    player.state !== PlayerState.CAPTURED &&
    player.protection <= 0 &&
    !isBush(map, player.x, player.y) &&
    distance(player, map.base) > CONFIG.safeRadius &&
    (!guard.route ||
      guard.route.some(
        (point) => distance(player, point) <= CONFIG.guardLeash,
      )) &&
    distance(guard, player) <= range &&
    hasLineOfSight(map, guard, player)
  );
}
export function segmentDistance(point, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    den = dx * dx + dy * dy;
  const t = den
    ? Math.max(
        0,
        Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / den),
      )
    : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export function dangerAt(game, point, padding = 0) {
  for (const guard of game.guards) {
    if (
      !guard.attack ||
      ![GuardState.WINDUP, GuardState.LUNGE].includes(guard.state)
    )
      continue;
    if (!hasLineOfSight(game.map, guard, point)) continue;
    const a = guard.attack;
    if (a.kind === "hunter") {
      if (segmentDistance(point, a.origin, a.end) < 0.55 + padding) return true;
    } else if (distance(point, a.origin) < a.radius + padding) return true;
  }
  return game.traps.some(
    (t) =>
      trapPhase(t, game.time) !== "idle" && distance(point, t) < 0.65 + padding,
  );
}
export function entersDanger(game, body, target) {
  if (
    body.protection > 0 ||
    body.state === PlayerState.HIDDEN ||
    dangerAt(game, body, 0.2)
  )
    return false;
  const length = distance(body, target);
  if (!length) return false;
  const step = Math.min(0.3, length),
    next = {
      x: body.x + ((target.x - body.x) / length) * step,
      y: body.y + ((target.y - body.y) / length) * step,
    };
  return dangerAt(game, next, 0.2);
}
export function escapeTarget(game, body, target = body) {
  const candidates = [];
  for (const scale of [1, 2, 3])
    for (const dx of [-1, 0, 1])
      for (const dy of [-1, 0, 1]) {
        if (!dx && !dy) continue;
        const point = {
          x: body.x + dx * 0.9 * scale,
          y: body.y + dy * 0.9 * scale,
        };
        if (
          canOccupy(game.map, point.x, point.y) &&
          canTravelStraight(game.map, body, point) &&
          !dangerAt(game, point, 0.2)
        )
          candidates.push(point);
      }
  // Escape time matters more than the follow target; otherwise the companion
  // can choose the far side of an attack to stay closer to the human.
  const cost = (point) => {
    const v = projectVector(point.x - body.x, point.y - body.y);
    return Math.hypot(v.x, v.y) + distance(point, target) * 6;
  };
  return candidates.sort((a, b) => cost(a) - cost(b))[0] ?? null;
}
function beginAttack(guard, game, player) {
  const spec = ENEMIES[guard.type];
  const direction = projectVector(player.x - guard.x, player.y - guard.y),
    length = Math.hypot(direction.x, direction.y) || 1;
  const delta = unprojectVector(
    (direction.x / length) * 48,
    (direction.y / length) * 48,
  );
  guard.attack = {
    kind: guard.type,
    origin: { x: guard.x, y: guard.y },
    end: { x: guard.x + delta.x, y: guard.y + delta.y },
    radius: spec.radius,
    duration: spec.windup,
  };
  guard.attackTimer = spec.windup;
  guard.state = GuardState.WINDUP;
  guard.moving = false;
  game.emit("warning", guard);
}
function recover(guard) {
  guard.state = GuardState.RECOVER;
  guard.recovery = ENEMIES[guard.type].recovery;
  guard.attackCooldown = 0.55;
  guard.moving = false;
}
export function updateGuard(guard, game, dt) {
  const { map, players } = game,
    spec = ENEMIES[guard.type];
  guard.moving = false;
  guard.alert = Math.max(0, guard.alert - dt);
  guard.attackCooldown = Math.max(0, guard.attackCooldown - dt);
  if (guard.state === GuardState.RECOVER) {
    guard.recovery -= dt;
    if (guard.recovery <= 0) {
      guard.state = GuardState.RETURN;
      guard.attack = null;
    }
    return;
  }
  if (guard.state === GuardState.WINDUP) {
    guard.attackTimer -= dt;
    if (guard.attackTimer <= 0) {
      if (guard.type === "hunter") {
        guard.state = GuardState.LUNGE;
        guard.attackTimer = 0.32;
      } else {
        for (const player of players)
          if (canDetect(guard, player, map, spec.radius)) game.capture(player);
        game.emit("impact", guard);
        recover(guard);
      }
    }
    return;
  }
  if (guard.state === GuardState.LUNGE) {
    const previous = { x: guard.x, y: guard.y },
      direction = projectVector(
        guard.attack.end.x - guard.attack.origin.x,
        guard.attack.end.y - guard.attack.origin.y,
      ),
      length = Math.hypot(direction.x, direction.y) || 1;
    const step = Math.min(dt, Math.max(0, guard.attackTimer));
    const delta = unprojectVector(
      (direction.x / length) * 150 * step,
      (direction.y / length) * 150 * step,
    );
    const next = { x: guard.x + delta.x, y: guard.y + delta.y };
    // A warned charge stays on its line: collision stops it instead of sliding around a corner.
    if (canTravelStraight(map, guard, next))
      moveBody(guard, delta.x, delta.y, map);
    else guard.attackTimer = 0;
    guard.attackTimer -= dt;
    for (const player of players)
      if (
        segmentDistance(player, previous, guard) < CONFIG.captureRadius &&
        canDetect(guard, player, map, 3)
      )
        game.capture(player);
    if (guard.attackTimer <= 0 || !guard.moving) {
      game.emit("impact", guard);
      recover(guard);
    }
    return;
  }
  const range =
    (guard.detectionRange ?? CONFIG.detectionRange) +
    (game.alarm ? 0.55 : 0) +
    (guard.state === GuardState.CHASE ? 1 : 0);
  const seen = players
    .filter((p) => canDetect(guard, p, map, range))
    .sort((a, b) => distance(guard, a) - distance(guard, b))[0];
  if (seen) {
    if (guard.state !== GuardState.CHASE) {
      guard.alert = 1.1;
      game.emit("alert", guard);
    }
    guard.state = GuardState.CHASE;
    guard.target = seen.id;
    guard.lastSeen = { x: seen.x, y: seen.y };
    if (
      guard.attackCooldown <= 0 &&
      distance(guard, seen) <= spec.reach &&
      !game.guards.some(
        (other) =>
          other !== guard &&
          [GuardState.WINDUP, GuardState.LUNGE].includes(other.state) &&
          distance(other, guard) < 3,
      ) &&
      canTravelStraight(map, guard, seen)
    ) {
      beginAttack(guard, game, seen);
      return;
    }
  } else if (guard.state === GuardState.CHASE) {
    guard.state = GuardState.SEARCH;
    guard.target = null;
    guard.searchTimer = guard.searchTime ?? CONFIG.searchTime;
  }
  let target;
  switch (guard.state) {
    case GuardState.CHASE:
      target = guard.lastSeen;
      break;
    case GuardState.SEARCH:
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) {
        guard.state = GuardState.RETURN;
        guard.waypoint = guard.route.reduce(
          (best, p, i) =>
            distance(guard, p) < distance(guard, guard.route[best]) ? i : best,
          0,
        );
      } else target = guard.lastSeen;
      break;
    case GuardState.RETURN:
      target = guard.route[guard.waypoint];
      if (distance(guard, target) < 0.2) guard.state = GuardState.PATROL;
      break;
    case GuardState.PATROL:
      target = guard.route[guard.waypoint];
      if (distance(guard, target) < 0.18)
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
      break;
  }
  if (target)
    navigate(
      guard,
      target,
      guard.speed * (game.alarm && guard.state === GuardState.CHASE ? 1.12 : 1),
      dt,
      map,
    );
}
export function updateCompanion(game, dt) {
  const [human, bot] = game.players;
  bot.moving = false;
  if (bot.state === PlayerState.CAPTURED) {
    bot.aiState = "CAPTURED";
    return;
  }
  if (bot.dashTime > 0) {
    bot.aiState = "DODGE";
    game.movePlayer(bot, { x: 0, y: 0 }, dt);
    return;
  }
  let target = human;
  if (human.state === PlayerState.CAPTURED) bot.aiState = "RESCUE";
  else if (
    game.flag.state === FlagState.CARRIED &&
    distance(human, game.map.base) < CONFIG.baseRadius
  ) {
    bot.aiState = "RETURN";
    target = game.map.base;
  } else {
    bot.aiState = "FOLLOW";
    if (human.state === PlayerState.HIDDEN) {
      const group = game.map.bushGroups.find((g) =>
        g.some(
          ([x, y]) => x === Math.floor(human.x) && y === Math.floor(human.y),
        ),
      );
      if (group)
        target = group
          .map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }))
          .sort((a, b) => distance(bot, a) - distance(bot, b))[0];
      bot.aiState = "HIDE";
    }
  }
  if (
    bot.protection <= 0 &&
    !isBush(game.map, bot.x, bot.y) &&
    dangerAt(game, bot, 0.2)
  ) {
    const escape = escapeTarget(game, bot, target);
    if (escape) {
      bot.aiState = "DODGE";
      const direction = projectVector(escape.x - bot.x, escape.y - bot.y);
      game.movePlayer(bot, { ...direction, dash: bot.dashCooldown <= 0 }, dt);
      return;
    }
  }
  if (
    human.state === PlayerState.CAPTURED &&
    distance(bot, human) < CONFIG.rescueRadius * 0.85 &&
    canTravelStraight(game.map, bot, human)
  )
    return;
  if (
    bot.aiState === "FOLLOW" &&
    distance(bot, human) < 0.72 &&
    canTravelStraight(game.map, bot, human)
  )
    return;
  const path = findPath(game.map, bot, target);
  const next = canTravelStraight(game.map, bot, target)
    ? target
    : (path[1] ?? path[0]);
  if (next && entersDanger(game, bot, next)) {
    bot.aiState = "WAIT";
    return;
  }
  if (path.length)
    navigate(
      bot,
      target,
      CONFIG.playerSpeed *
        (bot.slowTime > 0 ? 0.62 : 1) *
        (game.flag.carrier === bot.id ? 0.93 : 1),
      dt,
      game.map,
    );
}
