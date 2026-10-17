import { CONFIG, PlayerState, GuardState, FlagState } from "./config.js";
export function createPlayers(map) {
  return map.spawns.map((spawn, id) => ({
    id,
    ...spawn,
    state: PlayerState.PROTECTED,
    protection: CONFIG.protectionTime,
    moving: false,
    facing: 1,
    aiState: "FOLLOW",
  }));
}
export function createGuards(map) {
  return map.patrols.map((data, id) => ({
    id,
    type: data.type,
    speed: map.mission.speed + (data.type === "spirit" ? 3 : 0),
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
