import { CONFIG, PlayerState, GuardState } from "./config.js";
import { distance, hasLineOfSight, canTravelStraight } from "./collisions.js";
import { stepBody, tickMotion, sameTile, cardinal } from "./grid.js";
import { navigate, findPath } from "./navigation.js";
import { isBush, isWalkable } from "./map.js";
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
export const attackHits = (attack, point) =>
  attack.cells.some((cell) => sameTile(cell, point));
export function dangerAt(game, point) {
  return (
    game.guards.some(
      (g) =>
        g.attack &&
        [GuardState.WINDUP, GuardState.LUNGE].includes(g.state) &&
        attackHits(g.attack, point),
    ) ||
    game.traps.some(
      (t) => trapPhase(t, game.time) !== "idle" && sameTile(t, point),
    )
  );
}
export function escapeTarget(game, body, target = body) {
  const candidates = [];
  for (let dx = -3; dx <= 3; dx++)
    for (let dy = -3; dy <= 3; dy++) {
      const point = { x: body.x + dx, y: body.y + dy };
      if (!isWalkable(game.map, point.x, point.y) || dangerAt(game, point))
        continue;
      const path = findPath(game.map, body, point);
      if (path.length > 1 && path.length <= 5)
        candidates.push({
          point,
          cost: path.length * 10 + distance(point, target),
        });
    }
  return candidates.sort((a, b) => a.cost - b.cost)[0]?.point ?? null;
}
export function attackCells(guard, player, map) {
  const cells = [{ x: guard.x, y: guard.y }];
  if (guard.type === "hunter") {
    const d = cardinal(player.x - guard.x, player.y - guard.y);
    // At overlap, keep the last cardinal heading instead of creating a diagonal.
    const direction = d.x || d.y ? d : (guard.direction ?? { x: 1, y: 0 });
    for (let i = 1; i <= 3; i++) {
      const p = { x: guard.x + direction.x * i, y: guard.y + direction.y * i };
      if (!isWalkable(map, p.x, p.y)) break;
      cells.push(p);
    }
  } else {
    const r = guard.type === "stone" ? 1 : 2;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        if (!dx && !dy) continue;
        if (guard.type !== "warden" && Math.abs(dx) + Math.abs(dy) > r)
          continue;
        const p = { x: guard.x + dx, y: guard.y + dy };
        if (isWalkable(map, p.x, p.y) && hasLineOfSight(map, guard, p))
          cells.push(p);
      }
  }
  return cells;
}
function beginAttack(guard, game, player) {
  const spec = ENEMIES[guard.type];
  const cells = attackCells(guard, player, game.map);
  guard.attackTimer = spec.windup * (game.mode === 1 ? 1.15 : 1);
  guard.attack = {
    kind: guard.type,
    origin: { x: guard.x, y: guard.y },
    end: { ...cells.at(-1) },
    cells,
    radius: spec.radius,
    duration: guard.attackTimer,
  };
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
  tickMotion(guard, dt);
  guard.markedTime = Math.max(0, (guard.markedTime ?? 0) - dt);
  if (guard.state === GuardState.STUNNED) {
    guard.stunTime -= dt;
    if (guard.stunTime <= 0) {
      guard.state = GuardState.RETURN;
      guard.attackCooldown = 0.5;
    }
    return;
  }
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
        guard.lungeIndex = 0;
        for (const player of players)
          if (
            sameTile(guard, player) &&
            distance(player, map.base) > CONFIG.safeRadius
          )
            game.capture(player);
      } else {
        for (const player of players)
          if (
            attackHits(guard.attack, player) &&
            distance(player, map.base) > CONFIG.safeRadius
          )
            game.capture(player);
        game.emit("impact", guard);
        recover(guard);
      }
    }
    return;
  }
  if (guard.state === GuardState.LUNGE) {
    if (guard.motion) return;
    const previous = { x: guard.x, y: guard.y },
      next = guard.attack.cells[guard.lungeIndex + 1];
    if (!next) {
      game.emit("impact", guard);
      recover(guard);
      return;
    }
    if (
      !stepBody(guard, { x: next.x - guard.x, y: next.y - guard.y }, 168, map)
    ) {
      recover(guard);
      return;
    }
    guard.lungeIndex++;
    if (game.strikeStatue(guard, previous)) return;
    for (const p of players)
      if (sameTile(p, guard) && distance(p, map.base) > CONFIG.safeRadius)
        game.capture(p);
    return;
  }
  const range =
    (guard.detectionRange ?? CONFIG.detectionRange) +
    (game.alarm ? 0.55 : 0) +
    (guard.state === GuardState.CHASE ? 1 : 0);
  const seen = players
    .filter((p) => canDetect(guard, p, map, range))
    .sort(
      (a, b) =>
        distance(guard, a) -
        (game.flag.carrier === a.id ? 1.2 : 0) -
        (distance(guard, b) - (game.flag.carrier === b.id ? 1.2 : 0)),
    )[0];
  if (seen) {
    if (guard.state !== GuardState.CHASE) {
      guard.alert = 1.1;
      game.emit("alert", guard);
    }
    guard.state = GuardState.CHASE;
    guard.target = seen.id;
    guard.lastSeen = { x: seen.x, y: seen.y };
    if (
      !guard.motion &&
      guard.attackCooldown <= 0 &&
      distance(guard, seen) <= spec.reach &&
      attackCells(guard, seen, map).some((cell) => sameTile(cell, seen)) &&
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
      guard.speed *
        (game.mode === 1 ? 0.92 : 1) *
        (game.alarm && guard.state === GuardState.CHASE ? 1.12 : 1),
      0,
      map,
    );
}
