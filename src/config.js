export const CONFIG = Object.freeze({
  width: 768,
  height: 432,
  tileWidth: 36,
  tileHeight: 18,
  originX: 348,
  originY: 65,
  playerSpeed: 49,
  stoneSpeed: 30,
  spiritSpeed: 33,
  bodyRadius: 0.19,
  detectionRange: 4.25,
  loseRange: 5.5,
  captureRadius: 0.48,
  rescueRadius: 0.8,
  pickupRadius: 0.6,
  protectionTime: 1.5,
  searchTime: 2,
  resetTime: 2.2,
  attempts: 3,
  baseRadius: 1.55,
  pathRefresh: 0.3,
});
export const GameState = Object.freeze({
  MENU: "MENU",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  ROUND_RESET: "ROUND_RESET",
  VICTORY: "VICTORY",
  GAME_OVER: "GAME_OVER",
});
export const PlayerState = Object.freeze({
  NORMAL: "NORMAL",
  HIDDEN: "HIDDEN",
  CAPTURED: "CAPTURED",
  PROTECTED: "PROTECTED",
});
export const FlagState = Object.freeze({
  ON_PEDESTAL: "ON_PEDESTAL",
  CARRIED: "CARRIED",
  DROPPED: "DROPPED",
});
export const GuardState = Object.freeze({
  PATROL: "PATROL",
  CHASE: "CHASE",
  SEARCH: "SEARCH",
  RETURN: "RETURN",
});
