import {
  CONFIG,
  GameState,
  PlayerState,
  FlagState,
  GuardState,
} from "./config.js";
import { TILE, tileAt } from "./map.js";
import { ENEMIES, trapPhase } from "./challenges.js";
import { THEMES } from "./missions.js";
import { drawSprite, drawArt } from "./sprites.js";
import { renderPosition, sameTile } from "./grid.js";
import { distance } from "./collisions.js";
const S = CONFIG.tileWidth;
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export const toScreen = (x, y) => ({
  x: CONFIG.originX + x * S,
  y: CONFIG.originY + y * S,
});

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    this.ctx.imageSmoothingEnabled = false;
    this.wideScreen = window.matchMedia("(min-width: 701px)");
    this.viewportSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
    this.resizeObserver = new ResizeObserver(([entry]) => {
      this.viewportSize = entry.contentRect;
    });
    this.resizeObserver.observe(canvas);
    this.time = 0;
    this.particles = [];
    this.palette = THEMES.jungle;
    this.keyArt = new Image();
    this.keyArt.src = new URL(
      "../assets/adventure-key-art.png",
      import.meta.url,
    ).href;
    this.keyArtReady = false;
    this.keyArt
      .decode()
      .then(() => (this.keyArtReady = true))
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
  poly(points, color, stroke) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
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
  text(text, x, y, color = "#f4e5b3", size = 9) {
    const c = this.ctx;
    c.font = `bold ${size}px monospace`;
    c.textAlign = "center";
    c.fillStyle = "#112922";
    c.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
    c.fillStyle = color;
    c.fillText(text, Math.round(x), Math.round(y));
  }
  bar(x, y, t, color = "#a6edcc", width = 25) {
    this.rect(x - width / 2 - 1, y - 1, width + 2, 5, "#122e2b");
    this.rect(x - width / 2, y, width, 3, "#50655c");
    this.rect(x - width / 2, y, width * Math.max(0, Math.min(1, t)), 3, color);
  }
  shadow(x, y, w = 12) {
    const c = this.ctx;
    c.fillStyle = "#10251c50";
    c.beginPath();
    c.ellipse(x, y, w, 5, 0, 0, Math.PI * 2);
    c.fill();
  }
  cell(point, color, alpha = 0.2) {
    const s = toScreen(Math.floor(point.x), Math.floor(point.y)),
      c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    this.rect(s.x + 1, s.y + 1, S - 2, S - 2, color);
    c.restore();
    c.strokeStyle = color;
    c.lineWidth = 1;
    c.strokeRect(s.x + 1.5, s.y + 1.5, S - 3, S - 3);
  }
  rune(x, y, color) {
    this.diamond(x, y, 5, 7, color);
    this.rect(x - 1, y - 3, 2, 6, "#244a40");
  }
  flag(x, y, small = false) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    if (small) c.scale(0.65, 0.65);
    this.diamond(0, -13, 10, 12, "#edc66e", "#fff1b9");
    this.diamond(0, -13, 6, 8, "#248b74", "#a3f3c7");
    this.rect(-4, -16, 2, 2, "#fff0b4");
    this.rect(2, -16, 2, 2, "#fff0b4");
    this.rect(-7, -2, 14, 3, "#ebc56e");
    c.restore();
  }
  wall(x, y, seed) {
    const p = this.palette;
    this.rect(x, y, S, S, p.shadow);
    this.rect(x + 1, y + 1, S - 2, S - 7, p.stone);
    this.rect(x + 2, y + 2, S - 4, 2, p.light);
    this.rect(x + 2, y + S - 7, S - 3, 3, p.line);
    this.line(
      [
        [x + 1, y + 11],
        [x + S - 2, y + 11],
      ],
      p.shadow,
    );
    this.line(
      [
        [x + 9, y + 2],
        [x + 9, y + 10],
      ],
      p.shadow,
    );
    this.line(
      [
        [x + 19, y + 12],
        [x + 19, y + S - 7],
      ],
      p.shadow,
    );
    if (seed > 0.5) {
      this.rect(x + 2, y + 3, 5, 3, "#617d48");
      this.rect(x + 4, y + 5, 8, 2, "#738a4e");
    }
    this.rect(x + 4, y + 15, 2, 2, p.light);
    this.rect(x + 22, y + 6, 2, 2, p.light);
  }
  cacheFloor(map) {
    const previous = this.ctx;
    this.groundLayer = document.createElement("canvas");
    this.groundLayer.width = CONFIG.width;
    this.groundLayer.height = CONFIG.height;
    this.ctx = this.groundLayer.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    const p = this.palette;
    this.rect(0, 0, CONFIG.width, CONFIG.height, p.bg);
    // Dark foliage frames the map without covering its square walkable cells.
    for (let i = 0; i < 140; i++) {
      const horizontal = i < 80,
        x = horizontal ? 54 + hash(i, 4) * 850 : i % 2 ? 60 : 900,
        y = horizontal ? (i % 2 ? 68 : 661) : 90 + hash(i, 6) * 550;
      this.rect(
        x,
        y,
        9 + hash(i, 3) * 16,
        5 + hash(i, 2) * 8,
        ["#193f31", "#254a33", "#33583b"][i % 3],
      );
      this.rect(x + 4, y + 2, 6, 2, "#527747");
    }
    this.rect(
      CONFIG.originX - 5,
      CONFIG.originY - 5,
      map.width * S + 10,
      map.height * S + 10,
      "#091f1b",
    );
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const t = tileAt(map, x, y),
          s = toScreen(x, y),
          seed = hash(x, y);
        if (t === TILE.WALL) {
          this.wall(s.x, s.y, seed);
          continue;
        }
        this.rect(
          s.x,
          s.y,
          S,
          S,
          t === TILE.WATER ? p.water : p.ground[Math.floor(seed * 4)],
        );
        if (t === TILE.WATER) {
          this.rect(s.x + 1, s.y + 1, S - 2, 1, p.waterLight + "60");
          this.rect(s.x, s.y, S, 1, p.line);
          continue;
        }
        // Equal square edges and small stone chips make the movement grid explicit.
        this.rect(s.x, s.y, S, 1, p.line);
        this.rect(s.x, s.y, 1, S, p.line);
        this.rect(s.x + 2, s.y + 2, S - 4, 1, p.light + "b0");
        this.rect(s.x + S - 2, s.y + 2, 1, S - 4, p.shadow + "80");
        this.rect(s.x + 2, s.y + S - 2, S - 3, 1, p.shadow + "80");
        for (let k = 0; k < 4; k++)
          this.rect(
            s.x + 4 + hash(x + k, y) * 19,
            s.y + 4 + hash(x, y + k) * 19,
            2,
            1,
            k % 2 ? p.line : p.light,
          );
        if (t === TILE.BRIDGE) {
          this.rect(s.x + 1, s.y + 1, S - 2, S - 2, "#987349");
          for (let k = 2; k < S; k += 6) {
            this.rect(s.x + 2, s.y + k, S - 4, 4, "#c39b63");
            this.rect(s.x + 3, s.y + k, 1, 2, "#eed2a0");
          }
          this.rect(s.x + 1, s.y + 1, 2, S - 2, "#e1bb80");
          this.rect(s.x + S - 3, s.y + 1, 2, S - 2, "#e1bb80");
        }
        if (t === TILE.BASE) {
          this.rect(s.x + 2, s.y + 2, S - 4, S - 4, "#375d4b30");
          if (x % 2 === 0 && y % 2 === 0)
            this.rect(s.x + 13, s.y + 13, 2, 2, "#a7d5aa");
        }
      }
    const b = toScreen(map.base.x, map.base.y);
    this.rect(b.x - 12, b.y - 12, 24, 24, "#244e40");
    this.ctx.strokeStyle = "#b6d19b";
    this.ctx.strokeRect(b.x - 11.5, b.y - 11.5, 23, 23);
    this.rune(b.x, b.y, "#d6e4ad");
    this.ctx = previous;
    this.cachedMap = map;
    this.cachedRevision = map.revision;
  }
  water(map) {
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (tileAt(map, x, y) === TILE.WATER) {
          const s = toScreen(x, y);
          for (let k = 0; k < 3; k++) {
            const dx = 3 + ((hash(x + k, y) * 17 + this.time * 2) % 18);
            this.rect(
              s.x + dx,
              s.y + 6 + k * 7,
              5,
              1,
              this.palette.waterLight + "80",
            );
          }
        }
  }
  signals(game) {
    for (const trap of game.traps) {
      const phase = trapPhase(trap, game.time),
        c =
          phase === "active"
            ? "#f09a63"
            : phase === "warning"
              ? "#ffe09b"
              : "#779d9c";
      this.cell(trap, c, phase === "idle" ? 0.06 : 0.3);
      const p = toScreen(trap.x, trap.y);
      this.text(
        phase === "active" ? "≈" : phase === "warning" ? "!" : "·",
        p.x,
        p.y + 4,
        c,
        13,
      );
    }
    for (const g of game.guards)
      if (g.attack && [GuardState.WINDUP, GuardState.LUNGE].includes(g.state)) {
        const color = ENEMIES[g.type].color;
        for (const cell of g.attack.cells) {
          this.cell(
            cell,
            color,
            g.state === GuardState.LUNGE
              ? 0.55
              : 0.22 + 0.08 * Math.sin(this.time * 14),
          );
          const p = toScreen(cell.x, cell.y);
          this.text("×", p.x, p.y + 4, color, 13);
        }
      }
    const b = game.bridge;
    if (b && !b.open) {
      this.cell(
        b.charged ? b.winch : b.statue,
        b.charged ? "#9ee5ce" : "#f1cf78",
        0.16,
      );
      for (const [x, y] of b.tiles) {
        const p = toScreen(x + 0.5, y + 0.5);
        this.text("◇", p.x, p.y + 4, "#c2ebd8", 13);
      }
    }
    for (const player of game.players) {
      this.cell(player, player.id ? "#efb18d" : "#92e1f3", 0.12);
      if (player.lightFlash > 0)
        for (let dx = -2; dx <= 2; dx++)
          for (let dy = -2; dy <= 2; dy++)
            if (Math.hypot(dx, dy) <= CONFIG.lightRange)
              this.cell(
                { x: player.x + dx, y: player.y + dy },
                "#ffdf8b",
                player.lightFlash * 0.6,
              );
    }
  }
  objectiveObject(item, isRune) {
    const p = toScreen(item.x, item.y),
      c = isRune ? (item.active ? "#c5f5bb" : "#94e4db") : "#ffdc8f";
    this.shadow(p.x, p.y + 5, 9);
    if (isRune) {
      this.rect(p.x - 9, p.y - 13, 18, 22, "#2c6556");
      this.rect(p.x - 8, p.y - 13, 16, 2, c);
      this.rune(p.x, p.y - 3, c);
      this.text(item.active ? "✓" : `R${item.id + 1}`, p.x, p.y - 19, c, 8);
      if (item.progress > 0 && !item.active)
        this.bar(p.x, p.y + 10, item.progress / CONFIG.runeTime, c);
    } else {
      const bob = Math.sin(this.time * 3 + item.id) * 2;
      this.diamond(p.x, p.y - 5 + bob, 5, 8, c, "#fff4c1");
      this.text("✦", p.x, p.y - 18 + bob, c, 8);
    }
  }
  bridgeObject(bridge, statue, solo) {
    const item = statue ? bridge.statue : bridge.winch,
      p = toScreen(item.x, item.y),
      color = statue
        ? bridge.charged
          ? "#f7dc8b"
          : "#b2d8c0"
        : bridge.litTime > 0 || bridge.open
          ? "#aef5cf"
          : "#d4ba89";
    this.shadow(p.x, p.y + 7, 12);
    if (statue) {
      this.rect(p.x - 11, p.y - 10, 22, 18, "#538b72");
      this.rect(p.x - 11, p.y - 17, 6, 9, "#86b29b");
      this.rect(p.x + 5, p.y - 17, 6, 9, "#86b29b");
      this.rect(p.x - 8, p.y - 6, 5, 3, color);
      this.rect(p.x + 3, p.y - 6, 5, 3, color);
      this.diamond(p.x, p.y + 1, 3, 3, "#173b32");
      this.rect(p.x - 9, p.y + 8, 18, 3, color);
      this.text(
        bridge.charged ? "✓ CARGADA" : "ESTATUA",
        p.x,
        p.y - 23,
        color,
        8,
      );
    } else {
      this.rect(p.x - 9, p.y - 7, 18, 17, "#77593f");
      this.rect(p.x - 12, p.y + 6, 24, 4, "#c7a06c");
      this.line(
        [
          [p.x - 9, p.y - 12],
          [p.x + 9, p.y + 4],
        ],
        color,
        3,
      );
      this.line(
        [
          [p.x + 9, p.y - 12],
          [p.x - 9, p.y + 4],
        ],
        color,
        3,
      );
      this.diamond(p.x, p.y - 4, 4, 4, "#e9d49e");
      this.text(
        bridge.open
          ? "✓ ABIERTO"
          : bridge.litTime > 0
            ? solo
              ? "Q · TIRAR"
              : "ENTER · TIRAR"
            : "E · LUZ",
        p.x,
        p.y - 20,
        color,
        8,
      );
      if (bridge.litTime > 0 && !bridge.open)
        this.bar(p.x, p.y + 13, bridge.litTime / (solo ? 8 : 4), color);
    }
  }
  player(p, game) {
    const pos = renderPosition(p),
      s = toScreen(pos.x, pos.y),
      c = this.ctx,
      captured = p.state === PlayerState.CAPTURED,
      hidden = p.state === PlayerState.HIDDEN;
    if (game.players.some((other) => other !== p && sameTile(other, p)))
      s.x += p.id === 0 ? -5 : 5;
    this.shadow(s.x, s.y + 7, 10);
    c.save();
    if (hidden) c.globalAlpha = 0.45;
    drawSprite(c, "explorer", s.x, s.y + 9, {
      red: p.id === 1,
      scale: 1.5,
      frame: p.moving ? Math.floor(this.time * 9) : 0,
      facing: p.facing,
    });
    if (game.flag.carrier === p.id && !game.flag.flight)
      this.flag(s.x + 13, s.y - 6, true);
    c.restore();
    if (captured || p.protection > 0) {
      c.beginPath();
      c.ellipse(s.x, s.y - 7, 15, 20, 0, 0, Math.PI * 2);
      c.fillStyle = captured ? "#8ad6f13a" : "#ffdd8818";
      c.fill();
      c.strokeStyle = captured ? "#b1f4fc" : "#fce3a0";
      c.stroke();
    }
    this.text(
      hidden ? "OCULTO" : captured ? "RUEDA" : String(p.id + 1),
      s.x,
      s.y - 29,
      p.id ? "#ffd1b0" : "#c0f6ff",
      8,
    );
    if (captured) this.bar(s.x, s.y + 13, p.rescueProgress / CONFIG.rescueTime);
    if (p.dashTime > 0) this.cell(p, "#fff5ce", 0.2);
  }
  guard(g) {
    const pos = renderPosition(g),
      s = toScreen(pos.x, pos.y);
    this.shadow(s.x, s.y + 7, 12);
    drawSprite(this.ctx, g.type, s.x, s.y + 10, {
      scale: g.type === "warden" ? 1.9 : g.type === "hunter" ? 1.1 : 1.55,
      facing: g.facing,
      frame: g.moving ? Math.floor(this.time * 6) : 0,
    });
    if (g.state === GuardState.WINDUP) {
      this.text("!", s.x, s.y - 29, ENEMIES[g.type].color, 13);
      this.bar(
        s.x,
        s.y + 12,
        1 - g.attackTimer / g.attack.duration,
        ENEMIES[g.type].color,
      );
    } else if (g.state === GuardState.STUNNED) {
      this.text("✦ ✦", s.x, s.y - 29, "#c7ffd7", 9);
      this.bar(s.x, s.y + 12, g.stunTime / 2.2);
    } else if (g.state === GuardState.RECOVER)
      this.text("···", s.x, s.y - 29, "#d3e5c5", 10);
    else if (g.state === GuardState.CHASE)
      this.text("!", s.x, s.y - 29, "#ffb488", 10);
    if (g.markedTime > 0) this.text("◇", s.x + 14, s.y - 26, "#ffec9a", 12);
  }
  consume(events) {
    for (const e of events) {
      if (e.type === "start") {
        this.particles = [];
        continue;
      }
      if (e.x === undefined) continue;
      const p = toScreen(e.x, e.y);
      for (let i = 0; i < (e.type === "victory" ? 40 : 8); i++)
        this.particles.push({
          x: p.x,
          y: p.y - 8,
          vx: (Math.random() - 0.5) * 35,
          vy: -15 - Math.random() * 25,
          life: 0.5 + Math.random() * 0.5,
          color: ["#f4d38b", "#9adbc4", "#f0b096"][i % 3],
        });
    }
  }
  draw(game, dt = 1 / 60) {
    this.time += dt;
    const c = this.ctx;
    const expanded = game.state !== GameState.MENU && this.wideScreen.matches;
    const width = expanded
      ? Math.max(1, this.viewportSize.width)
      : CONFIG.width;
    const height = expanded
      ? Math.max(1, this.viewportSize.height)
      : CONFIG.height;
    const density = expanded ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    if (this.canvas.width !== Math.round(width * density))
      this.canvas.width = Math.round(width * density);
    if (this.canvas.height !== Math.round(height * density))
      this.canvas.height = Math.round(height * density);
    c.setTransform(density, 0, 0, density, 0, 0);
    c.imageSmoothingEnabled = false;
    this.palette = THEMES[game.map.theme];
    c.fillStyle = this.palette.bg;
    c.fillRect(0, 0, width, height);
    c.save();
    const scale = expanded
      ? Math.min(
          (width - 24) / (game.map.width * S),
          (height - 24) / (game.map.height * S),
        )
      : 1;
    this.view = {
      scale,
      x: expanded ? (width - game.map.width * S * scale) / 2 : CONFIG.originX,
      y: expanded ? (height - game.map.height * S * scale) / 2 : CONFIG.originY,
    };
    if (expanded) {
      c.translate(
        this.view.x - CONFIG.originX * scale,
        this.view.y - CONFIG.originY * scale,
      );
      c.scale(scale, scale);
    }
    if (game.state === GameState.MENU && this.keyArtReady) {
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
      gradient.addColorStop(0.7, "#09271b08");
      c.fillStyle = gradient;
      c.fillRect(0, 0, CONFIG.width, CONFIG.height);
    } else {
      if (
        this.cachedMap !== game.map ||
        this.cachedRevision !== game.map.revision
      )
        this.cacheFloor(game.map);
      c.drawImage(this.groundLayer, 0, 0);
      this.water(game.map);
      this.signals(game);
      // Ground objects precede sprites, so walls and decorations never hide an explorer.
      for (let y = 0; y < game.map.height; y++)
        for (let x = 0; x < game.map.width; x++)
          if (tileAt(game.map, x, y) === TILE.BUSH) {
            const p = toScreen(x + 0.5, y + 0.5);
            if (!drawArt(c, 7, p.x, p.y + 9, 24)) {
              this.rect(p.x - 10, p.y - 9, 20, 20, this.palette.bush);
            }
          }
      const pos = game.map.pedestal,
        s = toScreen(pos.x, pos.y);
      this.rect(s.x - 13, s.y - 11, 26, 23, this.palette.shadow);
      this.rect(s.x - 11, s.y - 12, 22, 20, this.palette.stone);
      this.rune(s.x, s.y - 3, this.palette.accent);
      if (game.flag.state === FlagState.ON_PEDESTAL) {
        this.flag(s.x, s.y + 1);
        this.text(
          game.sealOpen() ? "RELIQUIA" : "SELLADA",
          s.x,
          s.y - 30,
          "#ffe6a2",
          8,
        );
        if (!game.sealOpen()) this.cell(pos, "#a3f1d1", 0.15);
      }
      if (game.flag.state === FlagState.DROPPED) {
        const p = toScreen(game.flag.x, game.flag.y);
        this.flag(p.x, p.y + 5);
      }
      if (game.bridge) {
        this.bridgeObject(game.bridge, true, game.mode === 1);
        this.bridgeObject(game.bridge, false, game.mode === 1);
      }
      game.runes.forEach((r) => this.objectiveObject(r, true));
      game.relics
        .filter((r) => !r.collected)
        .forEach((r) => this.objectiveObject(r, false));
      const actors = [
        ...game.guards.map((g) => ({ body: g, draw: () => this.guard(g) })),
        ...game.players.map((p) => ({
          body: p,
          draw: () => this.player(p, game),
        })),
      ];
      actors.sort(
        (a, b) => renderPosition(a.body).y - renderPosition(b.body).y,
      );
      actors.forEach((a) => a.draw());
      for (const p of game.players)
        if (p.vineFlash > 0 && p.vineTarget) {
          const from = toScreen(p.x, p.y),
            to = toScreen(p.vineTarget.x, p.vineTarget.y);
          this.line(
            [
              [from.x, from.y - 10],
              [to.x, to.y - 8],
            ],
            "#d2e69a",
            2,
          );
        }
      if (game.flag.flight) {
        const f = game.flag.flight,
          t = 1 - f.remaining / 0.35,
          receiver = game.players[game.flag.carrier],
          a = toScreen(f.from.x, f.from.y),
          b = toScreen(receiver.x, receiver.y);
        this.flag(
          a.x + (b.x - a.x) * t,
          a.y + (b.y - a.y) * t - 10 - Math.sin(t * Math.PI) * 25,
          true,
        );
      }
      const base = toScreen(game.map.base.x, game.map.base.y);
      this.text(
        game.mode === 1 && !game.alarm ? "ENTRADA · ♥" : "ENTRADA",
        base.x,
        base.y + 30,
        "#e9e7a8",
        8,
      );
      if (game.players[0].campProgress > 0)
        this.bar(
          base.x,
          base.y + 16,
          game.players[0].campProgress / 2,
          "#ffb19d",
        );
      if (!expanded)
        this.text(
          "28 × 20 · CUATRO DIRECCIONES",
          CONFIG.width / 2,
          CONFIG.originY + game.map.height * S + 15,
          "#9bba9b",
          8,
        );
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      c.globalAlpha = Math.max(0, p.life);
      this.rect(p.x, p.y, 2, 2, p.color);
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    c.restore();
  }
}
