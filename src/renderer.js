import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import { TILE, tileAt } from "./map.js";
import { drawSprite } from "./sprites.js";

const COLORS = {
  floor: ["#566755", "#5d6e59", "#61715d", "#536553"],
  line: "#3b5145",
  gold: "#d1b16a",
  cream: "#e9e2be",
  moss: "#7f9360",
};
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

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    this.ctx.imageSmoothingEnabled = false;
    this.particles = [];
    this.time = 0;
    this.celebration = 0;
  }
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
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
  text(text, x, y, color = "#e9e2be", size = 8) {
    const c = this.ctx;
    c.font = `bold ${size}px monospace`;
    c.textAlign = "center";
    c.fillStyle = "#112f29";
    c.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
    c.fillStyle = color;
    c.fillText(text, Math.round(x), Math.round(y));
  }
  shadow(x, y, w = 9, h = 3) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.diamond(x, y, w, h, "#0b211c");
    this.ctx.restore();
  }
  leaf(x, y, size, color, flip = 1) {
    this.poly(
      [
        [x, y],
        [x + flip * size * 0.2, y - size * 0.65],
        [x + flip * size * 0.8, y - size],
        [x + flip * size, y - size * 0.5],
        [x + flip * size * 0.7, y - size * 0.2],
      ],
      color,
    );
  }
  tree(x, y, seed = 0, scale = 1) {
    const c = this.ctx;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    this.shadow(0, 0, 20, 7);
    this.poly(
      [
        [-4, 1],
        [-2, -33],
        [3, -33],
        [5, 1],
      ],
      "#4c5535",
    );
    this.rect(-1, -26, 2, 23, "#788056");
    this.rect(2, -14, 2, 4, "#333f2c");
    const sway = Math.round(Math.sin(this.time * 0.65 + seed));
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const xx = Math.cos(angle) * 15 + sway,
        yy = -33 + Math.sin(angle) * 8;
      this.poly(
        [
          [0, -31],
          [xx * 0.5, yy - 8],
          [xx * 1.3, yy - 5],
          [xx * 1.55, yy + 4],
          [xx, yy + 2],
          [xx * 0.5, yy + 3],
        ],
        ["#244b38", "#315d3e", "#42774a"][i % 3],
      );
      this.poly(
        [
          [0, -31],
          [xx * 0.6, yy - 4],
          [xx * 1.35, yy - 1],
          [xx * 0.4, yy],
        ],
        i % 2 ? "#689251" : "#507f47",
      );
    }
    this.rect(-4 + sway, -38, 6, 3, "#93ac63");
    this.rect(-2, -30, 3, 3, "#c0a45e");
    c.restore();
  }
  bush(x, y, seed = 0, active = false) {
    this.shadow(x, y, 14, 4);
    const sway = active
      ? Math.round(Math.sin(this.time * 10))
      : Math.round(Math.sin(this.time + seed) * 0.4);
    for (let i = 0; i < 5; i++) {
      const bx = x - 11 + i * 5 + sway,
        by = y - Math.abs(2 - i) * 1.5;
      this.poly(
        [
          [bx - 5, by - 2],
          [bx - 4, by - 8],
          [bx, by - 12 + (i % 2) * 2],
          [bx + 4, by - 8],
          [bx + 5, by - 2],
          [bx, by + 1],
        ],
        ["#285f3c", "#3e7b45", "#4f8b46"][i % 3],
      );
      this.rect(bx - 2, by - 8, 3, 2, i % 2 ? "#77a751" : "#659749");
      this.rect(bx + 2, by - 5, 2, 2, "#275e3b");
    }
    if (seed % 3 === 0) {
      this.rect(x + 8, y - 7, 2, 2, "#d6bc65");
      this.rect(x - 8, y - 4, 2, 2, "#a9ba66");
    }
  }
  wall(x, y, seed, border = false) {
    const h = border ? 13 : 22;
    this.poly(
      [
        [x - 17, y],
        [x, y + 8],
        [x, y + 8 - h],
        [x - 17, y - h],
      ],
      "#44594e",
    );
    this.poly(
      [
        [x, y + 8],
        [x + 17, y],
        [x + 17, y - h],
        [x, y + 8 - h],
      ],
      "#344e43",
    );
    this.diamond(x, y - h, 17, 8, "#81907a", "#98a38a");
    this.poly(
      [
        [x - 16, y - h],
        [x - 6, y - h - 4],
        [x + 3, y - h],
        [x - 4, y - h + 4],
      ],
      "#8e9c7f",
    );
    this.rect(x - 9, y - h + 10, 6, 2, "#627565");
    this.rect(x + 5, y - h + 8, 7, 1, "#233c33");
    this.poly(
      [
        [x - 16, y - h],
        [x - 10, y - h - 3],
        [x - 7, y - h],
        [x - 9, y - h + 4],
        [x - 13, y - h + 3],
      ],
      "#68854b",
    );
    if (seed > 0.5) {
      this.rect(x + 5, y - h - 1, 6, 2, "#9ba56a");
      this.rect(x + 9, y - h + 1, 2, 6, "#547442");
    }
  }
  torch(x, y) {
    this.shadow(x, y, 4, 2);
    this.rect(x - 2, y - 14, 4, 15, "#424b34");
    this.rect(x - 3, y - 17, 6, 4, "#b09455");
    const flicker = Math.floor(Math.sin(this.time * 13 + x) * 2);
    this.poly(
      [
        [x - 3, y - 18],
        [x - 3, y - 22],
        [x, y - 27 - flicker],
        [x + 3, y - 21],
        [x + 2, y - 17],
      ],
      "#dc8c44",
    );
    this.rect(x - 1, y - 23, 2, 6, "#ffe097");
  }
  flag(x, y, small = false) {
    this.rect(x, y - 27, 2, 27, "#dac282");
    const flutter = Math.round(Math.sin(this.time * 7) * 2);
    this.poly(
      [
        [x + 2, y - 26],
        [x + 16, y - 25 + flutter],
        [x + 12, y - 19 + flutter],
        [x + 2, y - 18],
      ],
      "#d86e54",
    );
    this.poly(
      [
        [x + 2, y - 26],
        [x + 16, y - 25 + flutter],
        [x + 12, y - 23 + flutter],
        [x + 2, y - 23],
      ],
      "#f59b73",
    );
    if (!small) this.rect(x - 1, y - 29, 4, 3, "#f0d794");
  }
  pedestal(x, y, flag) {
    this.shadow(x, y, 17, 7);
    this.diamond(x, y + 1, 18, 9, "#314d42");
    this.diamond(x, y - 2, 17, 8, "#a9a686");
    this.poly(
      [
        [x - 11, y - 4],
        [x, y + 1],
        [x + 11, y - 4],
        [x + 11, y - 12],
        [x - 11, y - 12],
      ],
      "#748674",
    );
    this.diamond(x, y - 12, 12, 6, "#c2bd93");
    this.diamond(x, y - 12, 8, 4, "#7d8c72");
    this.rect(x - 2, y - 5, 4, 3, "#8edfc2");
    if (flag) {
      this.flag(x, y - 13);
      this.text("LA BANDERA", x, y - 49, "#ead48c", 7);
    }
  }
  ground(map) {
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const p = toScreen(x + 0.5, y + 0.5),
          tile = tileAt(map, x, y),
          seed = hash(x, y);
        if (x === map.width - 1 || y === map.height - 1) {
          this.poly(
            [
              [p.x - 18, p.y],
              [p.x, p.y + 9],
              [p.x + 18, p.y],
              [p.x + 18, p.y + 12],
              [p.x, p.y + 23],
              [p.x - 18, p.y + 12],
            ],
            "#193d32",
          );
          this.rect(p.x - 1, p.y + 12, 2, 4, "#36533c");
        }
        if (tile === TILE.WATER) {
          this.diamond(p.x, p.y, 18, 9, "#245b5b", "#2b6f68");
          for (let k = 0; k < 3; k++) {
            const wave = Math.sin(this.time * 1.6 + y + k * 2) * 3;
            this.rect(
              p.x - 8 + k * 6 + wave,
              p.y - 4 + k * 3,
              6,
              1,
              k % 2 ? "#42887e" : "#35766e",
            );
          }
        } else {
          this.diamond(
            p.x,
            p.y,
            18,
            9,
            tile === TILE.BASE ? "#797f5b" : COLORS.floor[Math.floor(seed * 4)],
            COLORS.line,
          );
          if (seed > 0.3)
            this.poly(
              [
                [p.x - 11, p.y],
                [p.x - 5, p.y - 3],
                [p.x + 3, p.y + 1],
                [p.x - 3, p.y + 3],
              ],
              seed > 0.7 ? "#6d7e61" : "#5e7358",
            );
          if (seed > 0.7) {
            this.rect(p.x + 7, p.y, 2, 1, "#9aa17b");
            this.rect(p.x - 4, p.y + 4, 3, 1, "#455d45");
          }
          if (tile === TILE.BRIDGE) {
            this.diamond(p.x, p.y, 18, 9, "#9b8055", "#b89d6b");
            for (let k = -2; k <= 2; k++)
              this.poly(
                [
                  [p.x - 15 + k * 3, p.y - 1 - k * 1.5],
                  [p.x - 2 + k * 3, p.y + 6 - k * 1.5],
                  [p.x + k * 3, p.y + 5 - k * 1.5],
                  [p.x - 13 + k * 3, p.y - 2 - k * 1.5],
                ],
                "#6c6043",
              );
            this.rect(p.x - 16, p.y - 7, 2, 9, "#c5a276");
            this.rect(p.x + 14, p.y - 7, 2, 9, "#c5a276");
          }
        }
      }
    const base = toScreen(map.base.x, map.base.y);
    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.diamond(base.x, base.y, 32, 16, "#849475", "#cfc28c");
    this.diamond(base.x, base.y, 24, 12, "#788664", "#aebb86");
    this.ctx.restore();
    this.poly(
      [
        [base.x - 8, base.y],
        [base.x, base.y - 6],
        [base.x + 8, base.y],
        [base.x + 4, base.y],
        [base.x + 4, base.y + 5],
        [base.x - 4, base.y + 5],
        [base.x - 4, base.y],
      ],
      "#d8ce97",
    );
    this.text("ENTRADA", base.x - 12, base.y + 30, "#e4d99f", 8);
  }
  player(p, game) {
    const pos = toScreen(p.x, p.y),
      c = this.ctx;
    this.shadow(pos.x, pos.y, 8, 3);
    const hidden = p.state === PlayerState.HIDDEN,
      captured = p.state === PlayerState.CAPTURED;
    const celebration =
      game.state === GameState.VICTORY
        ? Math.abs(Math.sin(this.time * 6 + p.id)) * 5
        : 0;
    const bob = p.moving
      ? Math.round(Math.sin(this.time * 13) * 0.7)
      : Math.sin(this.time * 2 + p.id) > 0.5
        ? -1
        : 0;
    c.save();
    if (hidden) c.globalAlpha = 0.4;
    drawSprite(c, "explorer", pos.x, pos.y + bob - celebration, {
      red: p.id === 1,
      frame: p.moving ? Math.floor(this.time * 9) : 0,
      facing: p.facing,
      scale: 1.25,
    });
    if (game.flag.carrier === p.id)
      this.flag(pos.x + 9, pos.y - 10 - celebration, true);
    c.restore();
    if (hidden) {
      this.bush(pos.x, pos.y + 2, 1, true);
      this.text("OCULTO", pos.x, pos.y - 35, "#b6dc93", 7);
    }
    if (p.protection > 0 && !hidden && !captured) {
      c.save();
      c.globalAlpha = 0.35 + 0.2 * Math.sin(this.time * 9);
      c.strokeStyle = "#f6d692";
      c.beginPath();
      c.ellipse(pos.x, pos.y - 14, 12, 17, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    this.diamond(pos.x, pos.y + 5, 3, 2, p.id === 0 ? "#8bd6df" : "#ed9b7d");
    if (captured) {
      c.save();
      c.fillStyle = "#69bbdf40";
      c.strokeStyle = "#a1ecf4";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(
        Math.round(pos.x),
        Math.round(pos.y - 14),
        15,
        19,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.stroke();
      this.rect(pos.x - 10, pos.y - 25, 2, 6, "#d8ffff");
      this.rect(pos.x - 7, pos.y - 29, 4, 2, "#d8ffff");
      c.restore();
      this.text("¡AYUDA!", pos.x, pos.y - 39, "#c9f3ef", 7);
    } else if (!hidden)
      this.text(
        String(p.id + 1),
        pos.x,
        pos.y - 34,
        p.id === 0 ? "#a2dfdd" : "#f2b18c",
        8,
      );
  }
  guard(g) {
    const p = toScreen(g.x, g.y),
      float = g.type === "spirit" ? Math.sin(this.time * 3 + g.id) * 3 - 4 : 0;
    this.shadow(p.x, p.y, g.type === "stone" ? 11 : 8, 4);
    if (g.type === "spirit") {
      const c = this.ctx;
      c.save();
      c.globalAlpha = 0.1;
      this.diamond(p.x, p.y - 12, 18, 15, "#74e5cf");
      c.restore();
    }
    drawSprite(this.ctx, g.type, p.x, p.y + float, {
      frame: g.moving ? Math.floor(this.time * 5) : 0,
      facing: g.facing,
      scale: g.type === "stone" ? 1.3 : 1.4,
    });
    if (g.state === GuardState.CHASE) {
      this.rect(p.x - 4, p.y - 45, 8, 11, "#d28656");
      this.text("!", p.x, p.y - 36, "#fff1bf", 10);
    } else if (g.state === GuardState.SEARCH)
      this.text("?", p.x, p.y - 37, "#dacb91", 10);
  }
  consume(events) {
    for (const e of events) {
      if (e.x === undefined) continue;
      const p = toScreen(e.x, e.y);
      const count = e.type === "victory" ? 100 : e.type === "rescue" ? 26 : 12;
      const colors =
        e.type === "leaves"
          ? ["#99ba68", "#5f9658"]
          : e.type === "rescue"
            ? ["#c8fbeb", "#7bbfd7"]
            : ["#e5c37d", "#8ad2b1", "#d68c6c"];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2,
          speed = 8 + Math.random() * 30;
        this.particles.push({
          x: p.x,
          y: p.y - 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 10,
          life: 1 + Math.random(),
          max: 2,
          color: colors[i % colors.length],
        });
      }
    }
  }
  draw(game, dt = 1 / 60) {
    this.time += dt;
    const c = this.ctx,
      menu = game.state === GameState.MENU;
    c.clearRect(0, 0, CONFIG.width, CONFIG.height);
    this.rect(0, 0, CONFIG.width, CONFIG.height, "#0d2a25");
    // Atmospheric jungle silhouettes and original layered foliage frame the diorama.
    for (let i = 0; i < 55; i++) {
      const x = hash(i, 1) * CONFIG.width,
        y = hash(i, 2) * CONFIG.height;
      if (i < 22) {
        c.save();
        c.globalAlpha = 0.25;
        this.tree(x, y + 20, i, 1.7);
        c.restore();
      }
      if (i % 3 === 0) this.rect(x, y, 1, 1, "#35533d");
    }
    c.save();
    if (menu) {
      c.translate(148, -12);
      c.scale(0.94, 0.94);
    }
    // A shaded earth slab makes the isometric level read as a miniature lost temple.
    const center = toScreen(9, 7);
    c.save();
    c.globalAlpha = 0.4;
    this.diamond(center.x, center.y + 25, 290, 155, "#071b18");
    c.restore();
    this.ground(game.map);
    const objects = [];
    const add = (x, y, draw, offset = 0) =>
      objects.push({ depth: x + y + offset, draw });
    for (let y = 0; y < game.map.height; y++)
      for (let x = 0; x < game.map.width; x++) {
        const p = toScreen(x + 0.5, y + 0.5),
          t = tileAt(game.map, x, y),
          seed = hash(x, y);
        if (t === TILE.WALL)
          add(x + 0.5, y + 0.5, () => {
            const border = x === 0 || y === 0 || x === 17 || y === 13;
            // Lower foreground ruins keep the explorers visible while preserving depth.
            this.wall(p.x, p.y, seed, border);
            if (border && (x + y) % 3 !== 0 && !(x < 5 && y > 9))
              this.tree(
                p.x,
                p.y - 11,
                seed * 10,
                x === 17 || y === 13 ? 0.7 : 1.1,
              );
            if (!border && seed > 0.75) this.bush(p.x + 2, p.y - 22, 0);
          });
        if (t === TILE.BUSH)
          add(x + 0.5, y + 0.5, () => this.bush(p.x, p.y, x + y), -0.05);
      }
    const pedestal = toScreen(game.map.pedestal.x, game.map.pedestal.y);
    add(
      game.map.pedestal.x,
      game.map.pedestal.y,
      () =>
        this.pedestal(
          pedestal.x,
          pedestal.y,
          game.flag.state === FlagState.ON_PEDESTAL,
        ),
      -0.3,
    );
    for (const [x, y] of [
      [1.5, 10],
      [3.8, 12.5],
      [13.5, 1.5],
      [15.5, 3.5],
      [7.5, 4.3],
      [9.5, 10.6],
    ]) {
      const p = toScreen(x, y);
      add(x, y, () => this.torch(p.x, p.y));
    }
    if (game.flag.state === FlagState.DROPPED) {
      const p = toScreen(game.flag.x, game.flag.y);
      add(game.flag.x, game.flag.y, () => {
        this.diamond(p.x, p.y, 9, 4, "#b1a16c");
        this.flag(p.x, p.y);
      });
    }
    for (const g of game.guards) add(g.x, g.y, () => this.guard(g));
    for (const p of game.players)
      add(p.x, p.y, () => this.player(p, game), 0.02);
    objects.sort((a, b) => a.depth - b.depth);
    objects.forEach((obj) => obj.draw());
    if (!menu) {
      const base = toScreen(game.map.base.x, game.map.base.y);
      this.text("ENTRADA", base.x - 28, base.y + 34, "#e4d99f", 8);
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
    c.restore();
    // A tiny compass is both decoration and a reminder that movement is screen-relative.
    if (!menu) {
      this.text("N", 704, 326, "#afbc91", 8);
      this.poly(
        [
          [704, 333],
          [700, 348],
          [704, 344],
          [708, 348],
        ],
        "#b6c19c",
      );
      this.text("EL TEMPLO PERDIDO", 640, 377, "#708e77", 7);
    }
    for (let i = 0; i < 12; i++) {
      const x = hash(i, 4) * 768 + Math.sin(this.time * 0.4 + i) * 9,
        y = hash(i, 5) * 432;
      c.globalAlpha = 0.3 + 0.25 * Math.sin(this.time * 1.5 + i);
      this.rect(x, y, 1, 1, "#d5d78d");
    }
    c.globalAlpha = 1;
  }
}
