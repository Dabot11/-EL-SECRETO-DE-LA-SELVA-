import { CONFIG, PlayerState, GuardState, FlagState } from "./config.js";
import { distance, hasLineOfSight, canTravelStraight } from "./collisions.js";
import { navigate, findPath } from "./navigation.js";
import { isBush } from "./map.js";

export function canDetect(guard, player, map, range = CONFIG.detectionRange) {
  return (
    player.state !== PlayerState.CAPTURED &&
    player.protection <= 0 &&
    !isBush(map, player.x, player.y) &&
    distance(guard, player) <= range &&
    hasLineOfSight(map, guard, player)
  );
}

export function updateGuard(guard, game, dt) {
  const { map, players } = game;
  guard.alert = Math.max(0, guard.alert - dt);
  let seen = players
    .filter((p) =>
      canDetect(
        guard,
        p,
        map,
        guard.state === GuardState.CHASE
          ? CONFIG.loseRange
          : CONFIG.detectionRange,
      ),
    )
    .sort((a, b) => distance(guard, a) - distance(guard, b))[0];
  if (seen) {
    if (guard.state !== GuardState.CHASE) {
      guard.alert = 1.1;
      game.emit("alert", guard);
    }
    guard.state = GuardState.CHASE;
    guard.target = seen.id;
    guard.lastSeen = { x: seen.x, y: seen.y };
  } else if (guard.state === GuardState.CHASE) {
    guard.state = GuardState.SEARCH;
    guard.target = null;
    guard.searchTimer = CONFIG.searchTime;
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
  guard.moving = false;
  if (target)
    navigate(
      guard,
      target,
      guard.type === "stone" ? CONFIG.stoneSpeed : CONFIG.spiritSpeed,
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
    // Share the human's hiding place, instead of standing exposed beside it.
    if (human.state === PlayerState.HIDDEN) {
      const group = game.map.bushGroups.find((g) =>
        g.some(
          ([x, y]) => x === Math.floor(human.x) && y === Math.floor(human.y),
        ),
      );
      if (group) {
        const spots = group.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
        target = spots.sort((a, b) => distance(bot, a) - distance(bot, b))[0];
      }
      bot.aiState = "HIDE";
    } else if (
      distance(bot, human) < 0.68 &&
      canTravelStraight(game.map, bot, human)
    )
      return;
  }
  // No teleportation: even a rescue must follow a valid walkable path.
  if (findPath(game.map, bot, target).length)
    navigate(bot, target, CONFIG.playerSpeed, dt, game.map);
}
