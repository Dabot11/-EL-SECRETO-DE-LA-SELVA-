import { EXTRA_MISSIONS } from "./expansion.js";
import { DIFFICULTY } from "./difficulty.js";
// Objectives deliberately pull explorers into different parts of each authored map.
// Coordinates refer to tile centers; no objective replaces collision geometry.
export const CHALLENGES = [
  {
    par: 65,
    briefing:
      "Camina hasta la bandera y llévala a la entrada. Cuando aparezcan cuadros de ataque, sal de ellos.",
    runes: [],
    relics: [
      [2, 2],
      [10, 11],
      [15, 9],
    ],
    enemyTypes: ["stone", "stone"],
    traps: [],
  },
  {
    par: 90,
    extraBridges: [
      [4, 7],
      [11, 7],
    ],
    briefing:
      "Quédate junto a la runa para liberar la bandera. Hay varios cruces: observa por dónde pasan los centinelas.",
    runes: [[5, 2]],
    relics: [
      [2, 2],
      [14, 10],
      [15, 5],
    ],
    enemyTypes: ["stone", "stone", "stone"],
    traps: [],
  },
  {
    par: 105,
    briefing:
      "El jaguar salta en línea recta. Al ver su aviso, muévete a un lado. Activa las dos runas y captura la bandera.",
    runes: [
      [3, 2],
      [13, 11],
    ],
    relics: [
      [7, 1],
      [10, 10],
      [15, 5],
    ],
    enemyTypes: ["stone", "hunter", "stone", "stone"],
    traps: [],
  },
  {
    par: 120,
    briefing:
      "El espíritu avisa un pulso azul: sal de los cuadros marcados. Activa las dos runas y vuelve con la bandera.",
    runes: [
      [5, 2],
      [9, 11],
    ],
    relics: [
      [2, 2],
      [12, 2],
      [16, 10],
    ],
    enemyTypes: ["stone", "hunter", "spirit", "stone"],
    traps: [],
  },
  {
    par: 140,
    extraBridges: [
      [6, 4],
      [12, 3],
    ],
    briefing:
      "El suelo brillante avisa una trampa que te frena. Espera o usa el impulso; activa tres runas y elige por dónde volver.",
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
    enemyTypes: ["stone", "hunter", "stone", "spirit", "hunter"],
    traps: [
      { x: 7, y: 10, offset: 0.7, type: "sun" },
      { x: 13, y: 9, offset: 3.2, type: "sun" },
    ],
  },
  ...EXTRA_MISSIONS,
].map((mission, index) => ({ ...mission, ...DIFFICULTY[index] }));
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
    reach: 3.1,
    radius: 0.48,
    windup: 0.85,
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
