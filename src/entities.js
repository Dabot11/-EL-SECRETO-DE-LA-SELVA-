import { CONFIG, PlayerState, GuardState, FlagState } from "./config.js";
import { ENEMIES } from "./challenges.js";
export function createPlayers(map) {
  return map.spawns.map((spawn, id) => ({
    id,
    ...spawn,
    state: PlayerState.PROTECTED,
    protection: CONFIG.protectionTime,
    dashTime: 0,
    dashCooldown: 0,
    dashVector: { x: 0, y: 0 },
    slowTime: 0,
    rescueProgress: 0,
    moving: false,
    facing: 1,
    aiState: "FOLLOW",
  }));
}
export function createGuards(map) {
  return map.patrols.map((data, id) => ({
    id,
    type: map.mission.enemyTypes[id] ?? data.type,
    speed:
      map.mission.speed +
      ENEMIES[map.mission.enemyTypes[id] ?? data.type].speed,
    attack: null,
    attackTimer: 0,
    recovery: 0,
    attackCooldown: 1 + id * 0.25,
    detectionRange: map.mission.detection,
    searchTime: map.mission.search,
    route: data.route.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })),
    x: data.route[0][0] + 0.5,
    y: data.route[0][1] + 0.5,
    state: GuardState.PATROL,
    waypoint: 1,
    target: null,
    lastSeen: null,
    searchTimer: 0,
    alert: 0,
    moving: false,
    facing: 1,
  }));
}
export const createFlag = (map) => ({
  ...map.pedestal,
  state: FlagState.ON_PEDESTAL,
  carrier: null,
});
