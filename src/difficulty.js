// Authored escape checkpoints use the original 18 × 14 map coordinates.
// Patrols travel to these crossings; they never teleport or know a hidden carrier's position.
const stages = [
  {
    speed: 32,
    posts: [
      [10, 4],
      [7, 9],
    ],
  },
  {
    speed: 36,
    posts: [
      [4, 6],
      [11, 8],
      [8, 9],
    ],
  },
  {
    speed: 40,
    posts: [
      [4, 5],
      [10, 8],
      [12, 7],
      [7, 11],
    ],
  },
  {
    speed: 44,
    posts: [
      [5, 10],
      [9, 5],
      [15, 6],
      [9, 9],
    ],
  },
  {
    speed: 47,
    posts: [
      [5, 10],
      [10, 4],
      [11, 9],
      [13, 5],
      [10, 11],
    ],
  },
  {
    speed: 50,
    posts: [
      [3, 8],
      [6, 4],
      [6, 6],
      [14, 4],
      [13, 8],
      [6, 10],
    ],
  },
  {
    speed: 53,
    posts: [
      [4, 7],
      [9, 4],
      [6, 8],
      [9, 11],
      [12, 5],
      [12, 7],
      [12, 10],
    ],
  },
  {
    speed: 56,
    posts: [
      [4, 8],
      [4, 10],
      [8, 6],
      [10, 10],
      [12, 2],
      [14, 8],
      [6, 10],
    ],
  },
  {
    speed: 59,
    posts: [
      [3, 7],
      [6, 2],
      [15, 5],
      [9, 7],
      [5, 9],
      [12, 9],
      [7, 11],
      [8, 9],
    ],
  },
  {
    speed: 62,
    posts: [
      [5, 6],
      [8, 3],
      [12, 5],
      [12, 9],
      [10, 8],
      [5, 10],
      [8, 10],
      [15, 10],
      [6, 11],
    ],
  },
];

export const DIFFICULTY = stages.map(({ speed, posts }, index) =>
  Object.freeze({
    speed,
    detection: 2.7 + index * 0.25,
    search: 1.4 + index * 0.2,
    windupScale: 1.5 - index * 0.05,
    recoveryScale: 1.3 - index * 0.03,
    attackSpacing: index < 4 ? 4 : 3,
    alarmDelay: 2.4 - index * 0.1,
    alarmSpeed: 1.02 + index * 0.01,
    alarmDetection: 0.2 + index * 0.05,
    escapePosts: posts,
  }),
);
