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
import { explorerPose } from "./explorer-animation.js";
import { enemyPose } from "./enemy-animation.js";
import { paintTerrain, paintWater, paintAtmosphere } from "./terrain.js";
const S = CONFIG.tileWidth;
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
    this.effects = [];
    this.lastMotion = new WeakMap();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    const wave = this.reducedMotion.matches
      ? 0
      : Math.round(Math.sin(this.time * 4) * 1.5);
    this.rect(-7, -25, 2, 26, "#edc66e");
    this.rect(-8, -27, 4, 3, "#fff1b9");
    this.poly(
      [
        [-5, -24],
        [4, -24 + wave],
        [12, -23 + wave],
        [9, -17 + wave],
        [12, -12 + wave],
        [4, -13 + wave],
        [-5, -13],
      ],
      "#248b74",
      "#f4d78d",
    );
    this.diamond(2, -19 + wave, 3, 3, "#ffe5a3");
    this.rect(-10, 0, 8, 2, "#ebc56e");
    c.restore();
  }
  cacheFloor(map) {
    if (!this.groundLayer) this.groundLayer = document.createElement("canvas");
    this.groundLayer.width = CONFIG.width;
    this.groundLayer.height = CONFIG.height;
    const previous = this.ctx;
    this.ctx = this.groundLayer.getContext("2d");
    paintTerrain(this, map);
    this.ctx = previous;
    this.cachedMap = map;
    this.cachedRevision = map.revision;
  }
  glow(x, y, color, radius = 20, strength = 0.2) {
    const c = this.ctx;
    c.save();
    c.globalAlpha *= strength;
    const gradient = c.createRadialGradient(x, y, 1, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + "00");
    c.fillStyle = gradient;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    c.restore();
  }
  actor(body, type, screen, options) {
    const c = this.ctx,
      reduced = this.reducedMotion.matches;
    const step = body.motion
      ? 1 - body.motion.remaining / body.motion.duration
      : 0;
    const stopped = [
      GuardState.STUNNED,
      GuardState.WINDUP,
      GuardState.RECOVER,
    ].includes(body.state);
    const stride = reduced || stopped ? 0 : Math.sin(step * Math.PI);
    if (body.motion && this.lastMotion.get(body) !== body.motion) {
      this.lastMotion.set(body, body.motion);
      if (!reduced && type !== "spirit") {
        const start = toScreen(body.motion.from.x, body.motion.from.y);
        for (const side of [-1, 1])
          this.particles.push({
            x: start.x + side * 4,
            y: start.y + 6,
            vx: side * 5,
            vy: -3,
            life: 0.22,
            duration: 0.22,
            size: 1,
            color: this.palette.light,
          });
      }
    }
    const windup = body.state === GuardState.WINDUP;
    const anticipation =
      windup && body.attack ? 1 - body.attackTimer / body.attack.duration : 0;
    const float =
      type === "spirit" && !reduced && !stopped
        ? Math.sin(this.time * 3 + body.id) * 2
        : 0;
    const explorer = type === "explorer";
    const bob =
      type === "spirit"
        ? float
        : stride * (explorer ? 0.5 : type === "warden" ? 0.45 : 0.8);
    const squish = reduced || explorer ? 0 : windup ? anticipation * 0.1 : 0;
    c.save();
    c.translate(screen.x, screen.y + 9 - bob);
    if (!reduced && !explorer && body.state === GuardState.STUNNED)
      c.rotate(Math.sin(this.time * 6) * 0.045);
    c.scale(1 + squish, 1 - squish);
    drawSprite(c, type, 0, 0, {
      ...options,
      facing: body.facing,
      ...(explorer
        ? explorerPose(body, reduced || body.state === PlayerState.CAPTURED)
        : enemyPose(body, reduced, this.time)),
    });
    c.restore();
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
          // Strong corner marks remain readable on foliage and every biome.
          for (const dx of [-1, 1])
            for (const dy of [-1, 1]) {
              this.rect(
                p.x + dx * 12 - (dx > 0 ? 4 : 0),
                p.y + dy * 12,
                5,
                2,
                color,
              );
              this.rect(
                p.x + dx * 12,
                p.y + dy * 12 - (dy > 0 ? 4 : 0),
                2,
                5,
                color,
              );
            }
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
    this.glow(
      p.x,
      p.y - 5,
      c,
      isRune ? 24 : 17,
      isRune && item.active ? 0.38 : 0.25,
    );
    if (isRune) {
      this.rect(p.x - 11, p.y + 5, 22, 5, "#233d34");
      this.rect(p.x - 9, p.y - 13, 18, 21, "#2c6556");
      this.rect(p.x - 7, p.y - 14, 14, 2, "#7baf94");
      this.rect(p.x - 8, p.y - 11, 2, 16, "#477e66");
      this.rect(p.x + 7, p.y - 11, 2, 18, "#1c4239");
      this.rect(p.x - 7, p.y + 5, 14, 2, c + "80");
      this.rune(p.x, p.y - 3, c);
      this.text(item.active ? "✓" : `R${item.id + 1}`, p.x, p.y - 19, c, 8);
      if (item.progress > 0 && !item.active)
        this.bar(p.x, p.y + 10, item.progress / CONFIG.runeTime, c);
    } else {
      const bob = Math.sin(this.time * 3 + item.id) * 2;
      this.diamond(p.x, p.y - 5 + bob, 5, 8, c, "#fff4c1");
      this.poly(
        [
          [p.x, p.y - 13 + bob],
          [p.x + 5, p.y - 5 + bob],
          [p.x, p.y + 3 + bob],
        ],
        "#dda950",
      );
      this.rect(p.x - 2, p.y - 8 + bob, 2, 3, "#fff6ca");
      const sparkle = Math.sin(this.time * 4 + item.id) > 0.5;
      if (sparkle || this.reducedMotion.matches)
        this.text("✦", p.x + 7, p.y - 15, c, 8);
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
    const color = p.id ? "#ffb296" : "#89dff4";
    this.shadow(s.x, s.y + 7, 10);
    c.beginPath();
    c.ellipse(s.x, s.y + 7, 11, 5, 0, 0, Math.PI * 2);
    c.strokeStyle = color;
    c.lineWidth = 1.2;
    c.stroke();
    if (p.dashTime > 0 && p.motion && !this.reducedMotion.matches) {
      const start = toScreen(p.motion.from.x, p.motion.from.y);
      for (const t of [0.3, 0.6]) {
        c.save();
        c.globalAlpha = t * 0.32;
        drawSprite(
          c,
          "explorer",
          start.x + (s.x - start.x) * t,
          start.y + (s.y - start.y) * t + 9,
          {
            red: p.id === 1,
            scale: 1.5,
            ...explorerPose(p, this.reducedMotion.matches),
          },
        );
        c.restore();
      }
    }
    c.save();
    if (hidden) c.globalAlpha = 0.45;
    this.actor(p, "explorer", s, {
      red: p.id === 1,
      scale: 1.5,
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
      c.beginPath();
      c.ellipse(s.x - 6, s.y - 15, 4, 7, -0.5, Math.PI, Math.PI * 1.8);
      c.strokeStyle = captured ? "#e2fbff" : "#fff3cf";
      c.stroke();
    }
    if (!hidden && !captured) this.rect(s.x - 5, s.y - 36, 10, 10, "#092a27e0");
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
    if (g.type === "spirit") this.glow(s.x, s.y - 10, "#74f3ec", 22, 0.25);
    if (g.state === GuardState.WINDUP)
      this.glow(s.x, s.y, ENEMIES[g.type].color, 23, 0.4);
    this.actor(g, g.type, s, {
      scale: g.type === "warden" ? 1.9 : g.type === "hunter" ? 1.1 : 1.55,
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
      for (let i = 0; i < 3; i++) {
        const angle = this.time * 3 + (i * Math.PI * 2) / 3;
        this.text(
          "✦",
          s.x + Math.cos(angle) * 10,
          s.y - 28 + Math.sin(angle) * 3,
          "#c7ffd7",
          8,
        );
      }
      this.bar(s.x, s.y + 12, g.stunTime / 2.2);
    } else if (g.state === GuardState.RECOVER)
      this.text("···", s.x, s.y - 29, "#d3e5c5", 10);
    else if (g.state === GuardState.CHASE)
      this.text("!", s.x, s.y - 29, "#ffb488", 10);
    else if (g.alarmSignal > 0) this.text("↻", s.x, s.y - 29, "#ffe199", 12);
    if (g.markedTime > 0) this.text("◇", s.x + 14, s.y - 26, "#ffec9a", 12);
  }
  consume(events) {
    const styles = {
      rune: { color: "#a1f4d1", label: "RUNA ACTIVADA", count: 16 },
      relic: { color: "#ffe199", label: "+ TESORO", count: 14 },
      flag: { color: "#ffe199", label: "¡A LA ENTRADA!", count: 22 },
      heal: { color: "#ffb49d", label: "+1 ♥", count: 12 },
      rescue: { color: "#b5f5e0", label: "¡LIBRE!", count: 20 },
      combo: { color: "#def3a0", label: "¡COMBO!", count: 18 },
      hurt: { color: "#ffaf94", label: "−1 ♥", count: 10 },
      capture: { color: "#a2e8ff", label: "¡RESCATE!", count: 14 },
      bridge: { color: "#d7e9a1", label: "PUENTE ABIERTO", count: 24 },
      statue: { color: "#ffe199", label: "ESTATUA CARGADA", count: 18 },
      impact: { color: "#e1bf86", count: 8 },
      leaves: { color: "#99c982", count: 6 },
      dash: { color: "#e9dfba", count: 5 },
      pass: { color: "#ffe199", count: 8 },
      light: { color: "#fff3b8", count: 14 },
      trap: { color: "#9bd5cb", count: 6 },
      victory: { color: "#ffe199", label: "¡BANDERA A SALVO!", count: 40 },
    };
    for (const e of events) {
      if (e.type === "start" || e.type === "round") {
        this.particles = [];
        this.effects = [];
        continue;
      }
      const style = styles[e.type];
      if (e.x === undefined || !style) continue;
      const p = toScreen(e.x, e.y);
      if (style.label)
        this.effects.push({
          x: p.x,
          y: p.y,
          color: style.color,
          label: style.label,
          life: 1.15,
          duration: 1.15,
        });
      if (this.reducedMotion.matches) continue;
      for (let i = 0; i < style.count; i++) {
        const angle = (Math.PI * 2 * i) / style.count,
          speed = 10 + Math.random() * 25;
        const life = 0.35 + Math.random() * 0.45;
        this.particles.push({
          x: p.x,
          y: p.y - 5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 15,
          life,
          duration: life,
          size: e.type === "leaves" ? 3 : 2,
          color: i % 3 ? style.color : "#fff0c9",
        });
      }
    }
    this.particles = this.particles.slice(-220);
    this.effects = this.effects.slice(-10);
  }
  drawEffects(dt, map) {
    const c = this.ctx,
      reduced = this.reducedMotion.matches;
    for (const p of this.particles) {
      p.life -= dt;
      if (reduced) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;
      c.globalAlpha = Math.max(0, p.life / p.duration);
      this.rect(p.x, p.y, p.size, p.size, p.color);
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const e of this.effects) {
      e.life -= dt;
      const t = 1 - e.life / e.duration;
      c.save();
      c.globalAlpha = Math.min(1, Math.max(0, e.life * 4));
      if (!reduced) {
        c.strokeStyle = e.color;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(e.x, e.y + 3, 8 + t * 19, 4 + t * 8, 0, 0, Math.PI * 2);
        c.stroke();
      }
      const width = e.label.length * 5 + 10;
      const x = Math.max(
        CONFIG.originX + width / 2,
        Math.min(CONFIG.originX + map.width * S - width / 2, e.x),
      );
      const y = Math.max(
        CONFIG.originY + 13,
        e.y - 38 - (reduced ? 0 : t * 10),
      );
      this.rect(x - width / 2, y - 9, width, 13, "#102e28eb");
      this.text(e.label, x, y, e.color, 8);
      c.restore();
    }
    this.effects = this.effects.filter((e) => e.life > 0);
  }
  draw(game, dt = 1 / 60) {
    // Pausing freezes visual time too. Reduced motion removes decorative movement.
    dt = game.state === GameState.PAUSED ? 0 : dt;
    this.time = this.reducedMotion.matches ? 0 : this.time + dt;
    const c = this.ctx;
    const expanded = game.state !== GameState.MENU && this.wideScreen.matches;
    const responsive = expanded || game.state === GameState.MENU;
    const width = responsive
      ? Math.max(1, this.viewportSize.width)
      : CONFIG.width;
    const height = responsive
      ? Math.max(1, this.viewportSize.height)
      : CONFIG.height;
    const density = responsive ? Math.min(window.devicePixelRatio || 1, 2) : 1;
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
      const artScale = Math.max(
        width / this.keyArt.width,
        height / this.keyArt.height,
      );
      c.drawImage(
        this.keyArt,
        width - this.keyArt.width * artScale,
        (height - this.keyArt.height * artScale) / 2,
        this.keyArt.width * artScale,
        this.keyArt.height * artScale,
      );
      const gradient = c.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#09271bed");
      gradient.addColorStop(0.7, "#09271b08");
      c.fillStyle = gradient;
      c.fillRect(0, 0, width, height);
    } else {
      if (
        this.cachedMap !== game.map ||
        this.cachedRevision !== game.map.revision
      )
        this.cacheFloor(game.map);
      c.drawImage(this.groundLayer, 0, 0);
      paintWater(this, game.map);
      paintAtmosphere(this, game.map);
      // Ground objects precede sprites, so walls and decorations never hide an explorer.
      for (let y = 0; y < game.map.height; y++)
        for (let x = 0; x < game.map.width; x++)
          if (tileAt(game.map, x, y) === TILE.BUSH) {
            const p = toScreen(x + 0.5, y + 0.5);
            c.save();
            const sway = this.reducedMotion.matches
              ? 0
              : Math.sin(this.time * 1.8 + x * 0.7 + y) * 0.025;
            c.translate(p.x, p.y + 9);
            c.transform(1, 0, sway, 1, 0, 0);
            if (!drawArt(c, 7, 0, 0, 25)) {
              this.rect(-10, -18, 20, 20, this.palette.bush);
            }
            c.restore();
          }
      const pos = game.map.pedestal,
        s = toScreen(pos.x, pos.y);
      this.glow(s.x, s.y - 8, "#ffe3a2", 28, game.sealOpen() ? 0.5 : 0.15);
      this.rect(s.x - 13, s.y - 11, 26, 23, this.palette.shadow);
      this.rect(s.x - 11, s.y - 12, 22, 20, this.palette.stone);
      this.rune(s.x, s.y - 3, this.palette.accent);
      if (game.flag.state === FlagState.ON_PEDESTAL) {
        this.flag(s.x, s.y + 1 + Math.sin(this.time * 2.5) * 1.5);
        this.text(
          game.sealOpen() ? "BANDERA" : "SELLADA",
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
      this.signals(game);
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
          const curve = this.reducedMotion.matches
            ? 0
            : Math.sin((p.vineFlash / 0.3) * Math.PI) * 10;
          const points = [
            [from.x, from.y - 10],
            [(from.x + to.x) / 2, (from.y + to.y) / 2 - 9 + curve],
            [to.x, to.y - 8],
          ];
          this.line(points, "#264c36", 4);
          this.line(points, "#d2e69a", 2);
          this.diamond(to.x, to.y - 8, 3, 3, "#e2f4ac");
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
    this.drawEffects(dt, game.map);
    c.restore();
  }
}
