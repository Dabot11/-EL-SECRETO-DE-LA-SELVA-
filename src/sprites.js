// Original pixel sprites. Each character is a palette index; no remote images.
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
