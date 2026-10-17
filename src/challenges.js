// Objectives deliberately pull explorers into different parts of each authored map.
// Coordinates refer to tile centers; no objective replaces collision geometry.
export const CHALLENGES = [
  {
    speed: 25,
    par: 65,
    briefing:
      "Atrae al jaguar hacia la estatua, ilumina el mecanismo y abre el puente con la liana.",
    runes: [],
    bridge: {
      statue: { x: 6.5, y: 5.5 },
      winch: { x: 7.5, y: 9.5 },
      tiles: [
        [8, 4],
        [8, 10],
      ],
    },
    relics: [
      [2, 2],
      [10, 11],
      [15, 9],
    ],
    enemyTypes: ["hunter", "stone", "spirit"],
    traps: [],
  },
  {
    speed: 27,
    par: 90,
    extraBridges: [
      [4, 7],
      [11, 7],
    ],
    briefing:
      "Activa las dos runas a ambos lados del río. El jaguar avisa antes de saltar.",
    runes: [
      [10, 11],
      [5, 2],
    ],
    relics: [
      [2, 2],
      [14, 10],
      [15, 5],
    ],
    enemyTypes: ["stone", "hunter", "spirit"],
    traps: [{ x: 12, y: 6, offset: 1, type: "mist" }],
  },
  {
    speed: 29,
    par: 105,
    briefing:
      "Explora los tres senderos. Evita las esporas cuando el suelo se ilumine.",
    runes: [
      [3, 2],
      [13, 11],
    ],
    relics: [
      [7, 1],
      [10, 10],
      [15, 5],
    ],
    enemyTypes: ["stone", "hunter", "stone", "spirit"],
    traps: [
      { x: 6, y: 5, offset: 0, type: "spores" },
      { x: 12, y: 8, offset: 2.7, type: "spores" },
    ],
  },
  {
    speed: 31,
    par: 120,
    briefing:
      "Enciende tres runas lunares. Los círculos azules anuncian el pulso de los espíritus.",
    runes: [
      [5, 2],
      [9, 11],
      [14, 5],
    ],
    relics: [
      [2, 2],
      [12, 2],
      [16, 10],
    ],
    enemyTypes: ["stone", "hunter", "stone", "spirit", "spirit"],
    traps: [
      { x: 8, y: 10, offset: 1.2, type: "frost" },
      { x: 11, y: 5, offset: 3, type: "frost" },
    ],
  },
  {
    speed: 33,
    par: 140,
    extraBridges: [
      [6, 4],
      [12, 3],
    ],
    briefing:
      "Despierta las tres runas del santuario. El Guardián Solar prepara un gran golpe: sal del círculo.",
    runes: [
      [4, 1],
      [10, 11],
      [14, 7],
    ],
    relics: [
      [1, 3],
      [9, 2],
      [16, 11],
    ],
    enemyTypes: ["stone", "hunter", "stone", "warden", "spirit", "hunter"],
    traps: [
      { x: 7, y: 10, offset: 0.7, type: "sun" },
      { x: 13, y: 9, offset: 3.2, type: "sun" },
    ],
  },
];
export const ENEMIES = Object.freeze({
  stone: {
    name: "Centinela de piedra",
    speed: 0,
    reach: 1.65,
    radius: 1.05,
    windup: 0.85,
    recovery: 1.25,
    color: "#edbb6e",
  },
  spirit: {
    name: "Espíritu del río",
    speed: 5,
    reach: 2,
    radius: 1.45,
    windup: 1.05,
    recovery: 1.4,
    color: "#77dded",
  },
  hunter: {
    name: "Jaguar de jade",
    speed: 9,
    reach: 2.5,
    radius: 0.48,
    windup: 0.7,
    recovery: 1.55,
    color: "#f2b85c",
  },
  warden: {
    name: "Guardián Solar",
    speed: -2,
    reach: 2.65,
    radius: 1.95,
    windup: 1.25,
    recovery: 1.8,
    color: "#ff9870",
  },
});
export function trapPhase(trap, time) {
  const phase = (time + trap.offset) % 6.5;
  return phase < 4.1 ? "idle" : phase < 5.4 ? "warning" : "active";
}
