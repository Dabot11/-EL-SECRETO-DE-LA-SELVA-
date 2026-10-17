import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import { TILE, tileAt } from "./map.js";
import { THEMES } from "./missions.js";
import { drawSprite, drawArt } from "./sprites.js";
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function toScreen(x, y) {
  return {
    x: CONFIG.originX + ((x - y) * CONFIG.tileWidth) / 2,
    y: CONFIG.originY + ((x + y) * CONFIG.tileHeight) / 2,
  };
}
const W = CONFIG.tileWidth / 2,
  H = CONFIG.tileHeight / 2;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    this.ctx.imageSmoothingEnabled = false;
    this.time = 0;
    this.particles = [];
    this.palette = THEMES.jungle;
    this.cachedMission = -1;
    this.keyArt = new Image();
    this.keyArt.src = new URL(
      "../assets/adventure-key-art.png",
      import.meta.url,
    ).href;
    this.keyArtReady = false;
    this.keyArt
      .decode()
      .then(() => {
        this.keyArtReady = true;
      })
      .catch(() => {});
  }
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
  }
  poly(points, color, stroke) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? c.lineTo(Math.round(x), Math.round(y))
        : c.moveTo(Math.round(x), Math.round(y)),
    );
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }
  diamond(x, y, w, h, color, stroke) {
    this.poly(
      [
        [x, y - h],
        [x + w, y],
        [x, y + h],
        [x - w, y],
      ],
      color,
      stroke,
    );
  }
  line(points, color, width = 1) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? c.lineTo(Math.round(x), Math.round(y))
        : c.moveTo(Math.round(x), Math.round(y)),
    );
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  text(text, x, y, color = "#ece2af", size = 9) {
    const c = this.ctx;
    c.font = `bold ${size}px monospace`;
    c.textAlign = "center";
    c.fillStyle = "#102c2b";
    c.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
    c.fillStyle = color;
    c.fillText(text, Math.round(x), Math.round(y));
  }
  shadow(x, y, w = 13, h = 5) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.28;
    this.diamond(x, y, w, h, "#10241e");
    this.ctx.restore();
  }
  leaf(x, y, size, color, flip = 1) {
    this.poly(
      [
        [x, y],
        [x + flip * size * 0.2, y - size * 0.65],
        [x + flip * size * 0.6, y - size],
        [x + flip * size, y - size * 0.7],
        [x + flip * size * 0.7, y - size * 0.2],
      ],
      color,
    );
    this.line(
      [
        [x, y],
        [x + flip * size * 0.7, y - size * 0.7],
      ],
      "#72984c",
    );
  }
  fern(x, y, seed = 0, scale = 1) {
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? -1 : 1;
      this.leaf(
        x,
        y,
        scale * (9 + (i % 3) * 4),
        ["#28553b", "#497c43", "#648c46"][i % 3],
        side,
      );
      x += side * 2;
      y -= 2;
    }
    if (seed > 0.7) {
      this.rect(x + 3, y + 2, 3, 5, "#bc674b");
      this.rect(x + 3, y, 3, 2, "#e4a058");
    }
  }
  foliage(x, y, seed, scale = 1) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    this.rect(-4, -35, 8, 40, "#3c4930");
    this.rect(-2, -32, 3, 38, "#6b6944");
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4,
        rx = Math.cos(angle) * 24,
        ry = -43 + Math.sin(angle) * 15;
      this.poly(
        [
          [rx - 16, ry],
          [rx - 19, ry - 8],
          [rx - 12, ry - 17],
          [rx - 2, ry - 21],
          [rx + 9, ry - 18],
          [rx + 17, ry - 9],
          [rx + 15, ry + 1],
          [rx + 4, ry + 7],
        ],
        ["#183e2e", "#285b36", "#386c3b"][i % 3],
      );
      for (let k = 0; k < 10; k++) {
        const xx = rx - 12 + hash(i * 10 + k, seed) * 25,
          yy = ry - 15 + hash(k, seed + i) * 19;
        this.rect(
          xx,
          yy,
          3 + (k % 3),
          2,
          ["#628d48", "#42753c", "#7a9d4e"][k % 3],
        );
      }
    }
    c.restore();
  }
  bush(x, y, seed = 0, active = false) {
    this.shadow(x, y, 20, 7);
    const sway = active ? Math.round(Math.sin(this.time * 9)) : 0;
    if (!drawArt(this.ctx, 7, x + sway, y + 3, 29)) {
      for (let i = 0; i < 5; i++) this.fern(x - 12 + i * 6, y - 4, seed, 1.15);
    }
    if (active) {
      for (let i = 0; i < 3; i++)
        this.rect(
          x - 8 + i * 7 + Math.sin(this.time * 8 + i) * 2,
          y - 25 - (i % 2) * 5,
          3,
          2,
          "#b1cd69",
        );
    }
  }
  rune(x, y, color) {
    this.line(
      [
        [x - 3, y - 5],
        [x + 3, y - 5],
        [x + 5, y],
        [x, y + 5],
        [x - 5, y],
        [x - 3, y - 5],
      ],
      color,
    );
    this.rect(x - 1, y - 2, 2, 4, color);
  }
  wall(x, y, seed, border = false, back = false) {
    const p = this.palette,
      h = border ? (back ? 32 : 15) : 25;
    this.poly(
      [
        [x - W, y],
        [x, y + H],
        [x, y + H - h],
        [x - W, y - h],
      ],
      p.stone,
    );
    this.poly(
      [
        [x, y + H],
        [x + W, y],
        [x + W, y - h],
        [x, y + H - h],
      ],
      p.shadow,
    );
    for (let level = 7; level < h; level += 8) {
      this.line(
        [
          [x - W, y - level],
          [x, y + H - level],
          [x + W, y - level],
        ],
        p.line,
      );
      this.line(
        [
          [x - W / 2, y + H / 2 - level],
          [x - W / 2, y + H / 2 - level - 7],
        ],
        p.line,
      );
      this.line(
        [
          [x + W / 2, y + H / 2 - level],
          [x + W / 2, y + H / 2 - level - 7],
        ],
        p.line,
      );
    }
    this.diamond(x, y - h, W, H, p.light, p.stone);
    this.diamond(x, y - h, W - 3, H - 2, p.stone);
    this.poly(
      [
        [x - 21, y - h],
        [x - 10, y - h - 5],
        [x - 1, y - h - 1],
        [x - 6, y - h + 4],
      ],
      p.light,
    );
    for (let i = 0; i < 9; i++) {
      const xx = x - 16 + hash(i, seed) * 30,
        yy = y - h + 3 + hash(i + 3, seed) * 10;
      this.rect(xx, yy, 2, 1, i % 2 ? p.light : p.shadow);
    }
    if (seed > 0.25) {
      this.poly(
        [
          [x - 22, y - h],
          [x - 15, y - h - 4],
          [x - 8, y - h - 3],
          [x - 9, y - h + 3],
          [x - 15, y - h + 5],
        ],
        "#587a3c",
      );
      for (let i = 0; i < 4; i++) {
        this.rect(x - 18 + i * 3, y - h - 2 + (i % 2) * 3, 3, 2, "#93a855");
        this.rect(x - 16 + i * 3, y - h + 4 + i * 3, 2, 4, "#3e6538");
      }
    }
    if (seed > 0.7 && !border) this.rune(x + 11, y + 5 - h / 2, "#96b994");
    if (back && seed > 0.82) this.column(x, y, 44);
  }
  column(x, y, height = 45) {
    const p = this.palette;
    this.shadow(x, y, 14, 6);
    this.diamond(x, y, 16, 8, p.shadow);
    this.poly(
      [
        [x - 8, y - 4],
        [x, y],
        [x, y - height],
        [x - 8, y - height - 4],
      ],
      p.stone,
    );
    this.poly(
      [
        [x, y],
        [x + 8, y - 4],
        [x + 8, y - height - 4],
        [x, y - height],
      ],
      p.shadow,
    );
    for (let k = 10; k < height; k += 9)
      this.line(
        [
          [x - 8, y - k - 4],
          [x, y - k],
          [x + 8, y - k - 4],
        ],
        p.line,
      );
    this.diamond(x, y - height - 4, 12, 6, p.light);
    this.diamond(x, y - height - 6, 9, 4, p.stone);
    this.line(
      [
        [x - 5, y - height + 4],
        [x - 5, y - 9],
      ],
      p.light,
    );
    this.rune(x + 3, y - height + 17, p.accent);
  }
  torch(x, y) {
    this.shadow(x, y, 5, 2);
    this.rect(x - 3, y - 20, 6, 20, "#705839");
    this.rect(x - 4, y - 23, 8, 5, "#c5a46b");
    const f = Math.round(Math.sin(this.time * 14 + x) * 2);
    this.poly(
      [
        [x - 4, y - 24],
        [x - 4, y - 29],
        [x, y - 37 - f],
        [x + 4, y - 28],
        [x + 3, y - 23],
      ],
      "#e99439",
    );
    this.poly(
      [
        [x - 2, y - 24],
        [x - 1, y - 31 - f],
        [x + 2, y - 28],
        [x + 2, y - 24],
      ],
      "#fff0a6",
    );
    this.rect(x - 1, y - 28, 2, 3, "#fff7cf");
  }
  flag(x, y, small = false) {
    const h = small ? 32 : 41;
    this.rect(x, y - h, 2, h, "#dec58a");
    const f = Math.round(Math.sin(this.time * 7) * 2);
    this.poly(
      [
        [x + 2, y - h + 1],
        [x + 24, y - h + 2 + f],
        [x + 18, y - h + 10 + f],
        [x + 24, y - h + 16 + f],
        [x + 2, y - h + 15],
      ],
      "#c8493e",
    );
    this.poly(
      [
        [x + 2, y - h + 1],
        [x + 24, y - h + 2 + f],
        [x + 20, y - h + 5 + f],
        [x + 2, y - h + 5],
      ],
      "#f48259",
    );
    this.rune(x + 10, y - h + 8, "#f8d981");
    this.rect(x - 1, y - h - 3, 4, 4, "#e9ce88");
  }
  pedestal(x, y, hasFlag) {
    const p = this.palette;
    this.shadow(x, y, 26, 10);
    for (let i = 0; i < 3; i++) {
      this.diamond(x, y - i * 4, 26 - i * 4, 13 - i * 2, p.shadow);
      this.diamond(x, y - i * 4 - 3, 26 - i * 4, 13 - i * 2, p.light);
    }
    this.diamond(x, y - 15, 15, 7, p.stone);
    this.rune(x, y - 15, p.accent);
    if (hasFlag) {
      this.flag(x, y - 17);
      this.text("BANDERA", x + 6, y - 66, "#f5dc96", 8);
    }
  }
  floor(map) {
    const p = this.palette;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const s = toScreen(x + 0.5, y + 0.5),
          t = tileAt(map, x, y),
          seed = hash(x, y);
        if (x === 17 || y === 13) {
          this.poly(
            [
              [s.x - W, s.y],
              [s.x, s.y + H],
              [s.x + W, s.y],
              [s.x + W, s.y + 16],
              [s.x, s.y + H + 20],
              [s.x - W, s.y + 16],
            ],
            p.shadow,
          );
          for (let k = 0; k < 4; k++)
            this.rect(s.x - 15 + k * 9, s.y + 13 + (k % 2) * 3, 5, 3, p.line);
        }
        if (t === TILE.WATER) {
          this.diamond(s.x, s.y, W, H, p.water, p.waterLight);
          continue;
        }
        this.diamond(
          s.x,
          s.y,
          W,
          H,
          t === TILE.BASE ? p.light : p.ground[Math.floor(seed * 4)],
          p.line,
        );
        this.line(
          [
            [s.x - W + 2, s.y],
            [s.x, s.y - H + 1],
            [s.x + W - 2, s.y],
          ],
          p.light,
        );
        this.line(
          [
            [s.x, s.y - H],
            [s.x - 1, s.y + H],
          ],
          p.line,
        );
        this.line(
          [
            [s.x - W / 2, s.y - H / 2],
            [s.x + W / 2, s.y + H / 2],
          ],
          p.line,
        );
        for (let k = 0; k < 10; k++) {
          const rx = (hash(x * 11 + k, y) - 0.5) * 35,
            ry = (hash(x, y * 17 + k) - 0.5) * 15;
          if (Math.abs(rx) / W + Math.abs(ry) / H < 0.85)
            this.rect(
              s.x + rx,
              s.y + ry,
              1 + (k % 2),
              1,
              k % 3 ? p.ground[(k + 1) % 4] : p.light,
            );
        }
        if (seed > 0.56 && t !== TILE.BASE) {
          this.line(
            [
              [s.x + 5, s.y - 5],
              [s.x + 3, s.y - 1],
              [s.x + 7, s.y + 1],
              [s.x + 5, s.y + 4],
            ],
            p.line,
          );
          this.rect(s.x - 17, s.y - 1, 5, 2, "#6b8850");
          this.rect(s.x - 15, s.y + 1, 3, 2, "#7e9556");
        }
        if (t === TILE.BRIDGE) {
          this.diamond(s.x, s.y - 1, W, H, "#b8925a", "#e0ba76");
          for (let k = -3; k <= 3; k++)
            this.line(
              [
                [s.x - 19 + k * 3, s.y - 1 - k * 1.5],
                [s.x - 1 + k * 3, s.y + 8 - k * 1.5],
              ],
              "#6c5339",
              2,
            );
          this.line(
            [
              [s.x - 22, s.y - 3],
              [s.x, s.y - 14],
              [s.x + 22, s.y - 3],
            ],
            "#d7b282",
            2,
          );
          for (const dx of [-20, 20]) {
            this.rect(s.x + dx, s.y - 12, 3, 12, "#856443");
            this.rect(s.x + dx - 1, s.y - 14, 5, 3, "#c8a875");
          }
        }
      }
    const base = toScreen(map.base.x, map.base.y);
    this.diamond(base.x, base.y, 33, 17, p.stone, p.accent);
    this.diamond(base.x, base.y, 27, 13, p.ground[0], p.accent);
    this.rune(base.x, base.y, p.accent);
  }
  scenery(map) {
    const c = this.ctx;
    c.save();
    for (let i = 0; i < 52; i++) {
      let x, y;
      if (i < 18) {
        x = i - 1;
        y = -1.7;
      } else if (i < 32) {
        x = -1.8;
        y = i - 18;
      } else if (i < 44) {
        x = 19;
        y = i - 32;
      } else {
        x = (i - 44) * 2;
        y = 15.2;
      }
      const s = toScreen(x, y);
      c.globalAlpha = i > 31 ? 0.48 : 0.8;
      this.foliage(s.x, s.y, hash(i, 5), 0.85 + hash(i, 4) * 0.45);
    }
    c.restore();
  }
  cacheFloor(map) {
    const previous = this.ctx;
    this.groundLayer = document.createElement("canvas");
    this.groundLayer.width = CONFIG.width;
    this.groundLayer.height = CONFIG.height;
    this.ctx = this.groundLayer.getContext("2d");
    this.rect(0, 0, CONFIG.width, CONFIG.height, this.palette.bg);
    this.scenery(map);
    this.floor(map);
    this.ctx = previous;
    this.cachedMission = map.index;
  }
  water(map) {
    for (let y = 1; y < 13; y++)
      for (let x = 1; x < 17; x++)
        if (tileAt(map, x, y) === TILE.WATER) {
          const s = toScreen(x + 0.5, y + 0.5);
          for (let k = 0; k < 6; k++) {
            const xx =
                s.x -
                15 +
                (k % 3) * 11 +
                Math.round(Math.sin(this.time * 2 + y + k) * 3),
              yy = s.y - 5 + Math.floor(k / 3) * 6;
            this.rect(
              xx,
              yy,
              3 + (k % 3),
              1,
              k % 2 ? this.palette.waterLight : "#439f9e",
            );
          }
          if (hash(x, y) > 0.7) {
            this.diamond(s.x + 4, s.y + 3, 4, 2, "#609c62");
            this.rect(s.x + 4, s.y, 2, 2, "#d4d7a4");
          }
          if (y === 12 || x === 16) {
            for (let k = 0; k < 6; k++) {
              const xx = s.x - 11 + k * 4,
                height = 18 + (k % 2) * 4;
              this.rect(xx, s.y + 7, 3, height, this.palette.water);
              this.rect(
                xx,
                s.y + 7 + ((this.time * 24 + k * 3) % 15),
                2,
                6,
                this.palette.waterLight,
              );
            }
          }
        }
  }
  player(p, game) {
    const s = toScreen(p.x, p.y),
      c = this.ctx,
      hidden = p.state === PlayerState.HIDDEN,
      captured = p.state === PlayerState.CAPTURED;
    const celebrating = [
      GameState.VICTORY,
      GameState.MISSION_COMPLETE,
    ].includes(game.state);
    const bob = celebrating
      ? -Math.abs(Math.sin(this.time * 6 + p.id)) * 6
      : p.moving
        ? Math.round(Math.sin(this.time * 13))
        : Math.sin(this.time * 2 + p.id) > 0.5
          ? -1
          : 0;
    this.shadow(s.x, s.y, 11, 4);
    c.save();
    if (hidden) c.globalAlpha = 0.38;
    drawSprite(c, "explorer", s.x, s.y + bob, {
      red: p.id === 1,
      frame: p.moving ? Math.floor(this.time * 7) : 0,
      facing: p.facing,
      scale: 1.9,
    });
    if (game.flag.carrier === p.id) this.flag(s.x + 14, s.y - 19 + bob, true);
    c.restore();
    this.diamond(s.x, s.y + 4, 5, 2, p.id ? "#ed9676" : "#6fd3dc");
    if (hidden) {
      this.bush(s.x, s.y + 3, 1, true);
      this.text("OCULTO", s.x, s.y - 46, "#d0e59a", 8);
    }
    if (captured || (p.protection > 0 && !hidden)) {
      c.save();
      c.strokeStyle = captured ? "#aaf8ff" : "#f6d590";
      c.fillStyle = captured ? "#66bce839" : "#f6d59011";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(
        Math.round(s.x),
        Math.round(s.y - 23),
        19,
        27,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.stroke();
      if (captured) {
        this.rect(s.x - 13, s.y - 39, 3, 8, "#e6fffa");
        this.rect(s.x - 8, s.y - 44, 5, 2, "#e6fffa");
      }
      c.restore();
    }
    if (captured) this.text("¡AYUDA!", s.x, s.y - 56, "#c9f5ee", 9);
    else if (!hidden)
      this.text(`${p.id + 1}`, s.x, s.y - 48, p.id ? "#ffd0a3" : "#b3eeef", 10);
  }
  guard(g) {
    const s = toScreen(g.x, g.y),
      float = g.type === "spirit" ? Math.sin(this.time * 3 + g.id) * 3 - 4 : 0;
    this.shadow(s.x, s.y, g.type === "stone" ? 17 : 10, 5);
    drawSprite(this.ctx, g.type, s.x, s.y + float, {
      frame: g.moving ? Math.floor(this.time * 4) : 0,
      facing: g.facing,
      scale: g.type === "stone" ? 2.4 : 1.8,
    });
    if (g.state === GuardState.CHASE) {
      this.rect(s.x - 6, s.y - 72, 12, 15, "#c26744");
      this.text("!", s.x, s.y - 60, "#ffdf93", 13);
    } else if (g.state === GuardState.SEARCH)
      this.text("?", s.x, s.y - 63, "#ecd99c", 12);
  }
  consume(events) {
    for (const e of events) {
      if (e.type === "start") {
        this.particles = [];
        continue;
      }
      if (e.x === undefined) continue;
      const s = toScreen(e.x, e.y),
        count = e.type === "victory" ? 100 : e.type === "rescue" ? 30 : 10;
      const colors =
        e.type === "leaves"
          ? ["#c1db70", "#76ab53"]
          : e.type === "rescue" || e.type === "capture"
            ? ["#bdfaf0", "#66bde6"]
            : ["#f3cc7b", "#8fd5bb", "#f2a275"];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2,
          speed = 10 + Math.random() * 40;
        this.particles.push({
          x: s.x,
          y: s.y - 24,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 10,
          life: 1 + Math.random(),
          color: colors[i % colors.length],
        });
      }
    }
  }
  draw(game, dt = 1 / 60) {
    this.time += dt;
    const c = this.ctx,
      menu = game.state === GameState.MENU;
    this.palette = THEMES[game.map.theme];
    c.clearRect(0, 0, CONFIG.width, CONFIG.height);
    if (menu && this.keyArtReady) {
      // Show the chosen concept as the cover, excluding its proposal caption.
      c.drawImage(
        this.keyArt,
        0,
        100,
        this.keyArt.width,
        this.keyArt.height - 100,
        0,
        0,
        CONFIG.width,
        CONFIG.height,
      );
      const gradient = c.createLinearGradient(0, 0, CONFIG.width, 0);
      gradient.addColorStop(0, "#09271bed");
      gradient.addColorStop(0.38, "#09271b9c");
      gradient.addColorStop(0.72, "#09271b08");
      c.fillStyle = gradient;
      c.fillRect(0, 0, CONFIG.width, CONFIG.height);
    } else {
      if (this.cachedMission !== game.map.index) this.cacheFloor(game.map);
      c.drawImage(this.groundLayer, 0, 0);
      this.water(game.map);
      const objects = [],
        add = (x, y, draw, offset = 0) =>
          objects.push({ depth: x + y + offset, draw });
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < 18; x++) {
          const s = toScreen(x + 0.5, y + 0.5),
            tile = tileAt(game.map, x, y),
            seed = hash(x, y);
          if (tile === TILE.WALL) {
            const border = x === 0 || y === 0 || x === 17 || y === 13,
              back = x === 0 || y === 0;
            add(x + 0.5, y + 0.5, () => {
              // Fade foreground masonry when an explorer is behind it; never hide a player.
              const occludes = game.players.some((p) => {
                const a = toScreen(p.x, p.y);
                return (
                  p.x + p.y < x + y + 1 &&
                  Math.abs(a.x - s.x) < 26 &&
                  a.y > s.y - 35 &&
                  a.y < s.y + 8
                );
              });
              c.save();
              if (occludes) c.globalAlpha = 0.38;
              this.wall(s.x, s.y, seed, border, back);
              c.restore();
            });
          }
          if (tile === TILE.BUSH)
            add(x + 0.5, y + 0.5, () => this.bush(s.x, s.y, seed), -0.05);
          if (tile === TILE.WALL && seed > 0.86 && !borderTile(x, y))
            add(x + 0.5, y + 0.5, () => this.column(s.x, s.y, 38));
        }
      const pos = game.map.pedestal,
        s = toScreen(pos.x, pos.y);
      add(
        pos.x,
        pos.y,
        () =>
          this.pedestal(s.x, s.y, game.flag.state === FlagState.ON_PEDESTAL),
        -0.3,
      );
      for (const [x, y] of [
        [1.5, 10],
        [3.6, 12.5],
        [pos.x - 1, pos.y - 1],
        [pos.x + 1, pos.y + 1],
      ]) {
        const p = toScreen(x, y);
        add(x, y, () => this.torch(p.x, p.y));
      }
      if (game.flag.state === FlagState.DROPPED) {
        const p = toScreen(game.flag.x, game.flag.y);
        add(game.flag.x, game.flag.y, () => {
          this.diamond(p.x, p.y, 12, 5, this.palette.accent);
          this.flag(p.x, p.y);
        });
      }
      for (const guard of game.guards)
        add(guard.x, guard.y, () => this.guard(guard));
      for (const player of game.players)
        add(player.x, player.y, () => this.player(player, game), 0.02);
      objects.sort((a, b) => a.depth - b.depth);
      objects.forEach((o) => o.draw());
      const base = toScreen(game.map.base.x, game.map.base.y);
      this.text("ENTRADA", base.x - 30, base.y + 41, "#f3dea3", 10);
      if (game.map.theme === "moon") {
        for (const [x, y] of [
          [1.5, 10],
          [3.6, 12.5],
          [pos.x - 1, pos.y - 1],
          [pos.x + 1, pos.y + 1],
        ]) {
          const p = toScreen(x, y),
            glow = c.createRadialGradient(p.x, p.y - 27, 2, p.x, p.y - 27, 42);
          glow.addColorStop(0, "#ffd18b2a");
          glow.addColorStop(1, "#ffd18b00");
          c.fillStyle = glow;
          c.fillRect(p.x - 42, p.y - 69, 84, 84);
        }
      }
      this.text(
        game.map.mission.name.toUpperCase(),
        760,
        550,
        this.palette.accent,
        9,
      );
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 14 * dt;
      c.globalAlpha = Math.max(0, Math.min(1, p.life));
      this.rect(p.x, p.y, 2, 2, p.color);
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (let i = 0; i < 18; i++) {
      c.globalAlpha = 0.25 + 0.2 * Math.sin(this.time * 1.4 + i);
      this.rect(
        hash(i, 4) * CONFIG.width + Math.sin(this.time * 0.4 + i) * 9,
        hash(i, 5) * CONFIG.height,
        2,
        1,
        "#e5dc97",
      );
    }
    c.globalAlpha = 1;
  }
}
const borderTile = (x, y) => x === 0 || y === 0 || x === 17 || y === 13;
