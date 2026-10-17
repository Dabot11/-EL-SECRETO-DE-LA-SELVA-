// Drives the real movement/update API. No position edits, invulnerability or disabled guardians.
import { centered } from "../src/grid.js";
import { dangerAt, escapeTarget } from "../src/ai.js";
import { findPath } from "../src/navigation.js";
import {
  distance,
  canTravelStraight,
  projectVector,
  canOccupy,
} from "../src/collisions.js";

function steer(game, player, target) {
  const path = findPath(game.map, player, target);
  if (!path.length)
    throw Error("No existe una ruta para el recorrido de aceptación");
  if (path.length === 1) return { x: 0, y: 0 };
  return { x: path[1].x - player.x, y: path[1].y - player.y };
}

export function playJourney(
  game,
  mode,
  missionIndex = 0,
  resume = false,
  collectTreasures = false,
) {
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
    const remaining = game.runes.filter((r) => !r.active);
    const treasures = collectTreasures
      ? game.relics.filter((r) => !r.collected)
      : [];
    const objectives = [...remaining, ...treasures].sort(
      (x, y) => distance(a, x) - distance(a, y),
    );
    let target =
      objectives[0] ??
      (game.flag.state === "CARRIED" ? game.map.base : game.flag);
    if (game.bridge && !game.bridge.open)
      target = game.bridge.charged ? game.bridge.winch : game.bridge.statue;
    if (b?.state === "CAPTURED") target = b;
    const companionTarget =
      a.state === "CAPTURED"
        ? a
        : game.flag.state === "CARRIED" && distance(a, game.map.base) < 1.5
          ? game.map.base
          : a;
    if (a.state === "CAPTURED") target = b;
    const inputs = game.players.map((player, index) => {
      const destination = index === 0 ? target : companionTarget;
      let input =
        distance(player, destination) < 0.25
          ? { x: 0, y: 0 }
          : steer(game, player, destination);
      if (
        player.state !== "CAPTURED" &&
        player.state !== "HIDDEN" &&
        player.protection <= 0 &&
        dangerAt(game, player, 0.15)
      ) {
        const escape = escapeTarget(game, player, destination);
        if (escape)
          input = {
            ...steer(game, player, escape),
            dash: player.dashCooldown <= 0,
          };
        // The first jaguar must actually hit the statue; interrupting its lunge would reset the puzzle.
        if (!game.bridge || game.bridge.open) input.light = true;
      }
      if (
        game.bridge?.charged &&
        !game.bridge.open &&
        distance(player, game.bridge.winch) < 2
      ) {
        input.light = true;
        input.vine = true;
      }
      if (game.players.some((p) => p !== player && p.state === "CAPTURED"))
        input.vine = true;
      if (
        game.guards.some((g) => g.markedTime > 0 && distance(player, g) < 2.5)
      )
        input.vine = true;
      // One deliberate handoff on the way home; no endless pass loop or score farming.
      if (
        game.flag.carrier === player.id &&
        game.stats.passes === 0 &&
        game.flag.state === "CARRIED"
      )
        input.pass = true;
      return input;
    });
    game.update(1 / 60, inputs);
    for (const player of game.players)
      if (!centered(player) || !canOccupy(game.map, player.x, player.y))
        throw Error("Un explorador atravesó un obstáculo");
    for (const guard of game.guards)
      if (!centered(guard) || !canOccupy(game.map, guard.x, guard.y))
        throw Error("Un guardián atravesó un obstáculo");
    for (const event of game.events) {
      if (event.type === "capture" || event.type === "hurt") captures++;
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
    time: game.stats.time,
    stars: game.result?.stars ?? 0,
    runes: game.runes.filter((r) => r.active).length,
    relics: game.relics.filter((r) => r.collected).length,
    dashes: game.stats.dashes,
    hearts: game.players[0].hearts,
    bridge: game.bridge?.open ?? null,
    passes: game.stats.passes,
    combos: game.stats.combos,
  };
}
