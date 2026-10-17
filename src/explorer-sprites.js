// Four poses in each of six rows: blue south/north/east, red south/north/east.
// West reuses the east poses with a horizontal flip. Never rotate a front view.
export let explorersReady = false;
let atlas;
const rows = [];

export async function loadExplorerSprites() {
  const image = new Image();
  image.src = new URL("../assets/explorer-walk.png", import.meta.url).href;
  await image.decode();
  const surface = document.createElement("canvas");
  surface.width = image.width;
  surface.height = image.height;
  const c = surface.getContext("2d", { willReadFrequently: true });
  c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, image.width, image.height).data;
  const solid = (x, y) => pixels[(y * image.width + x) * 4 + 3] > 175;
  // Locate the transparent gutters instead of cutting extended boots at a row edge.
  const bands = [];
  for (let y = 0; y < image.height; y++) {
    let count = 0;
    for (let x = 0; x < image.width; x++) if (solid(x, y)) count++;
    if (count < 4) continue;
    const band = bands.at(-1);
    if (!band || y - band.bottom > 3) bands.push({ top: y, bottom: y });
    else band.bottom = y;
  }
  if (bands.length !== 6)
    throw new Error(
      "El atlas de exploradores debe tener seis filas separadas.",
    );
  const loaded = [];
  for (const band of bands) {
    const frames = [];
    for (let column = 0; column < 4; column++) {
      const left = Math.floor((column * image.width) / 4),
        right = Math.floor(((column + 1) * image.width) / 4);
      let minX = right,
        maxX = left,
        minY = band.bottom,
        maxY = band.top;
      for (let y = band.top; y <= band.bottom; y++)
        for (let x = left; x < right; x++)
          if (solid(x, y)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
      if (maxX - minX < 8 || maxY - minY < 16)
        throw new Error("Falta una pose del explorador.");
      // Anchor to the hat, not the moving arms/feet: torso stays steady between poses.
      let hatLeft = right,
        hatRight = left;
      for (let y = minY; y < minY + (maxY - minY) * 0.3; y++)
        for (let x = minX; x <= maxX; x++)
          if (solid(x, y)) {
            hatLeft = Math.min(hatLeft, x);
            hatRight = Math.max(hatRight, x);
          }
      const x = Math.max(left, minX - 2),
        y = Math.max(0, minY - 2);
      frames.push({
        x,
        y,
        w: Math.min(right, maxX + 3) - x,
        h: Math.min(image.height, maxY + 3) - y,
        anchorX: (hatLeft + hatRight) / 2,
      });
    }
    loaded.push({ frames, height: Math.max(...frames.map((f) => f.h)) });
  }
  rows.splice(0, rows.length, ...loaded);
  atlas = image;
  explorersReady = true;
}

export function drawExplorerAtlas(
  ctx,
  x,
  y,
  { red = false, frame = 0, direction = "south", scale = 1 } = {},
) {
  if (!explorersReady) return false;
  const row =
    rows[
      (red ? 3 : 0) +
        (direction === "north"
          ? 1
          : direction === "east" || direction === "west"
            ? 2
            : 0)
    ];
  const pose = row.frames[((Math.floor(frame) % 4) + 4) % 4];
  const height = Math.round(22 * scale),
    factor = height / row.height;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(direction === "west" ? -1 : 1, 1);
  ctx.drawImage(
    atlas,
    pose.x,
    pose.y,
    pose.w,
    pose.h,
    Math.round((pose.x - pose.anchorX) * factor),
    -height,
    Math.round(pose.w * factor),
    Math.round(pose.h * factor),
  );
  ctx.restore();
  return true;
}
