// Drives the real movement/update API. No position edits, invulnerability or disabled guardians.
import { findPath } from "../src/navigation.js";
import {
  distance,
  canTravelStraight,
  projectVector,
  canOccupy,
} from "../src/collisions.js";

function steer(game, player, target) {
  if (distance(player, target) < 0.1) return { x: 0, y: 0 };
  let waypoint = target;
  if (!canTravelStraight(game.map, player, target)) {
    const path = findPath(game.map, player, target);
    if (!path.length)
      throw Error("No existe una ruta para el recorrido de aceptación");
    waypoint = path[0];
    for (const candidate of path.slice(1)) {
      if (canTravelStraight(game.map, player, candidate)) waypoint = candidate;
      else break;
    }
  }
  return projectVector(waypoint.x - player.x, waypoint.y - player.y);
}

export function playJourney(game, mode, missionIndex = 0, resume = false) {
  if (!resume) game.start(mode, missionIndex);
  let captures = 0,
    rescues = 0,
    flags = 0,
    frames = 0;
  for (
    ;
    frames < 18000 &&
    !["VICTORY", "MISSION_COMPLETE", "GAME_OVER"].includes(game.state);
    frames++
  ) {
    const [a, b] = game.players;
    let target = game.flag.state === "CARRIED" ? game.map.base : game.flag;
    if (b.state === "CAPTURED") target = b;
    const companionTarget =
      a.state === "CAPTURED"
        ? a
        : game.flag.state === "CARRIED" && distance(a, game.map.base) < 1.5
          ? game.map.base
          : a;
    const second =
      distance(a, b) < 0.5 && a.state !== "CAPTURED"
        ? { x: 0, y: 0 }
        : steer(game, b, companionTarget);
    game.update(1 / 60, [steer(game, a, target), second]);
    for (const player of game.players)
      if (!canOccupy(game.map, player.x, player.y))
        throw Error("Un explorador atravesó un obstáculo");
    for (const guard of game.guards)
      if (!canOccupy(game.map, guard.x, guard.y))
        throw Error("Un guardián atravesó un obstáculo");
    for (const event of game.events) {
      if (event.type === "capture") captures++;
      if (event.type === "rescue") rescues++;
      if (event.type === "flag") flags++;
    }
    game.events = [];
  }
  // Keep the real victory effect visible when this helper is used in the browser.
  if (["VICTORY", "MISSION_COMPLETE"].includes(game.state))
    game.emit("victory", game.map.base);
  return {
    mode,
    missionIndex: game.missionIndex,
    state: game.state,
    attempts: game.attempts,
    frames,
    captures,
    rescues,
    flags,
  };
}
