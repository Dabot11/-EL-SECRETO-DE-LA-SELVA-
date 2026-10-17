// Local illustrated atlas; original matrix sprites remain as a loading fallback.
export let atlasReady = false;
let atlas = null;
const frames = [];
let guardianAtlas = null;
const guardianFrames = [];
export let guardiansReady = false;
export async function loadSprites() {
  atlas = new Image();
  atlas.src = new URL("../assets/adventure-sprites.png", import.meta.url).href;
  await atlas.decode();
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.drawImage(atlas, 0, 0);
  const pixels = c.getImageData(0, 0, atlas.width, atlas.height).data,
    cw = atlas.width / 4,
    ch = atlas.height / 2;
  for (let cell = 0; cell < 8; cell++) {
    // Lower-row artwork crosses uniform cell boundaries: exclude neighboring sprites.
    const bounds = [0, 410, 780, 1100, 1536];
    const left = cell < 4 ? (cell % 4) * cw : bounds[cell - 4],
      right = cell < 4 ? left + cw : bounds[cell - 3],
      top = Math.floor(cell / 4) * ch;
    let minX = right,
      minY = top + ch,
      maxX = left,
      maxY = top;
    for (let y = top; y < top + ch; y++)
      for (let x = left; x < right; x++)
        if (pixels[(y * atlas.width + x) * 4 + 3] > 175) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
    frames.push({
      x: Math.max(left, minX - 3),
      y: Math.max(top, minY - 3),
      w: Math.min(right, maxX + 4) - Math.max(left, minX - 3),
      h: Math.min(ch, maxY - minY + 7),
    });
  }
  atlasReady = true;
  try {
    guardianAtlas = new Image();
    guardianAtlas.src = new URL(
      "../assets/guardian-sprites.png",
      import.meta.url,
    ).href;
    await guardianAtlas.decode();
    const surface = document.createElement("canvas");
    surface.width = guardianAtlas.width;
    surface.height = guardianAtlas.height;
    const context = surface.getContext("2d", { willReadFrequently: true });
    context.drawImage(guardianAtlas, 0, 0);
    const rgba = context.getImageData(0, 0, surface.width, surface.height).data;
    // The generated atlas has a deliberately tighter first row; keep full boss crowns.
    for (let cell = 0; cell < 4; cell++) {
      const left = ((cell % 2) * surface.width) / 2,
        right = left + surface.width / 2,
        top = cell < 2 ? 0 : 435,
        bottom = cell < 2 ? 435 : surface.height;
      let minX = right,
        minY = bottom,
        maxX = left,
        maxY = top;
      for (let y = top; y < bottom; y++)
        for (let x = left; x < right; x++)
          if (rgba[(y * surface.width + x) * 4 + 3] > 175) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
      const x = Math.max(left, minX - 2),
        y = Math.max(top, minY - 2);
      guardianFrames.push({
        x,
        y,
        w: Math.min(right, maxX + 3) - x,
        h: Math.min(bottom, maxY + 3) - y,
      });
    }
    guardiansReady = true;
  } catch {
    /* Matrix guardian fallback keeps the game playable if an image is unavailable. */
  }
}
export function drawArt(ctx, cell, x, y, height, facing = 1) {
  if (!atlasReady) return false;
  const f = frames[cell],
    width = Math.round((height * f.w) / f.h);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas,
    f.x,
    f.y,
    f.w,
    f.h,
    -Math.round(width / 2),
    -height,
    width,
    height,
  );
  ctx.restore();
  return true;
}
const explorer = [
  "......hhhh......",
  ".....hHHHHh.....",
  "....hHHHHHHh....",
  "....hHggggHh....",
  "..hhhhhhhhhhhh..",
  "..hHHHHHHHHHHh..",
  "...dddddddddd...",
  "....dssssd......",
  "....dsdsds......",
  "....dssssD......",
  ".....dssD.......",
  "....BBccBB......",
  "...bBCCCCBb.....",
  "...bBCcCCBbs....",
  "...bBCgCCBbs....",
  "....BCCCCB......",
  "....BggggB......",
  ".....pppp.......",
  ".....pPPp.......",
  ".....p..p.......",
  "....kk..kk......",
  "....kk..kk......",
];
const stone = [
  "......mmmm......",
  "....mmMMMMmm....",
  "...mMMmmMMMMm...",
  "...mMMMMMMMMm...",
  "..mMMkkkkkkMMm..",
  "..mMkkttttkkMm..",
  "..mMkTtkkTtkMm..",
  "..mMMkkkkkkMMm..",
  "...mMMMmmMMMm...",
  "...mMMkkkkMMm...",
  "....mmMMMMmm....",
  "..mmmMmmmmMmmm..",
  ".mMMMMLttLMMMMm.",
  ".mMMMmLttLmMMMm.",
  ".mMMMmLTTLmMMMm.",
  ".mMMMmLttLmMMMm.",
  "..mmmMLLLLMmmm..",
  "....mMMMMMMm....",
  "....mmMmmMmm....",
  "....mMM..MMm....",
  "...mmMM..MMmm...",
  "..mmMMM..MMMmm..",
];
const spirit = [
  ".......t........",
  "......tTt.......",
  ".....tTTTt......",
  "....tTTTTTt.....",
  "...tTTWWTTTt....",
  "..tTTWWWWTTTt...",
  "..tTTWkkWTTTt...",
  "..tTTWkkWTTTt...",
  "..tTTWWWWTTTt...",
  "...tTTkkTTTt....",
  "...tTTTTTTTt....",
  "..tTTTTTTTTTt...",
  ".tTTTTTTTTTTTt..",
  "..ttTTTTTTTtt...",
  "....tTTTTTt.....",
  "....tTttTt......",
  ".....t..t.......",
];
const palettes = {
  explorer: {
    h: "#483c2b",
    H: "#c9b87b",
    g: "#6e593d",
    d: "#503c32",
    s: "#e4b88b",
    D: "#aa7956",
    B: "#544b35",
    b: "#817348",
    c: "#2a647d",
    C: "#55adc5",
    p: "#536256",
    P: "#657368",
    k: "#293a32",
  },
  stone: {
    m: "#3b5149",
    M: "#829482",
    k: "#273d39",
    t: "#55b7a4",
    T: "#b7f4ca",
    L: "#a7aa83",
  },
  spirit: { t: "#3b9e9f", T: "#79d7c0", W: "#d9ffde", k: "#285c62" },
};
export function drawSprite(
  ctx,
  type,
  x,
  y,
  { red = false, frame = 0, facing = 1, scale = 1 } = {},
) {
  if (type === "hunter" || type === "warden") {
    if (guardiansReady) {
      const f = guardianFrames[(type === "warden" ? 2 : 0) + (frame % 2)],
        height = Math.round(22 * scale),
        width = Math.round((height * f.w) / f.h);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(facing, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        guardianAtlas,
        f.x,
        f.y,
        f.w,
        f.h,
        -Math.round(width / 2),
        -height,
        width,
        height,
      );
      ctx.restore();
      return;
    }
    type = "stone";
  }
  if (atlasReady) {
    const cell =
      type === "explorer"
        ? (red ? 2 : 0) + (frame % 2)
        : type === "stone"
          ? 4 + (frame % 2)
          : 6;
    drawArt(ctx, cell, x, y, Math.round(22 * scale), facing);
    return;
  }
  const matrix =
    type === "explorer" ? explorer : type === "stone" ? stone : spirit;
  const palette = { ...palettes[type] };
  if (red) {
    palette.c = "#944b45";
    palette.C = "#e18362";
  }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);
  for (let row = 0; row < matrix.length; row++)
    for (let col = 0; col < matrix[row].length; col++) {
      const char = matrix[row][col];
      if (char === ".") continue;
      let offset = 0;
      if (type !== "spirit" && row >= matrix.length - 4 && frame % 2)
        offset = col < 8 ? -1 : 1;
      ctx.fillStyle = palette[char];
      ctx.fillRect(col - 8 + offset, row - matrix.length, 1, 1);
    }
  ctx.restore();
}

export function paintPortrait(canvas, red = false) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSprite(ctx, "explorer", canvas.width / 2, canvas.height - 2, {
    red,
    scale: 2,
  });
}
