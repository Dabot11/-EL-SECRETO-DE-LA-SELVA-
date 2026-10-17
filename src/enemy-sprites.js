// One transparent sheet per enemy: south, north, east; four poses in each row.
// West mirrors east, while front/back always use their own drawings.
const atlases = new Map();
const types = ["stone", "hunter", "spirit", "warden"];
export const enemySpritesReady = (type) => atlases.has(type);

export async function loadEnemySprites() {
  // A failed asset must not prevent the other creatures from loading.
  await Promise.allSettled(
    types.map(async (type) => {
      const image = new Image();
      image.src = new URL(`../assets/${type}-walk.png`, import.meta.url).href;
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = image.width;
      surface.height = image.height;
      const ctx = surface.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      const solid = (x, y) => pixels[(y * image.width + x) * 4 + 3] > 175;
      const bands = [];
      for (let y = 0; y < image.height; y++) {
        let count = 0;
        for (let x = 0; x < image.width; x++) if (solid(x, y)) count++;
        if (count < 4) continue;
        const band = bands.at(-1);
        if (!band || y - band.bottom > 12) bands.push({ top: y, bottom: y });
        else band.bottom = y;
      }
      if (bands.length !== 3) throw new Error(`Atlas incompleto: ${type}`);
      const rows = bands.map((band) => {
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
            throw new Error(`Falta una pose: ${type}`);
          // The upper body is steadier than swinging hands, paws and water trails.
          // Jaguar body/tail is horizontal; anchor its middle instead of its ears.
          let anchorLeft = right,
            anchorRight = left;
          const start = type === "hunter" ? 0.35 : 0.1,
            end = type === "hunter" ? 0.6 : 0.35;
          for (
            let y = Math.floor(minY + (maxY - minY) * start);
            y < minY + (maxY - minY) * end;
            y++
          )
            for (let x = minX; x <= maxX; x++)
              if (solid(x, y)) {
                anchorLeft = Math.min(anchorLeft, x);
                anchorRight = Math.max(anchorRight, x);
              }
          const x = Math.max(left, minX - 2),
            y = Math.max(0, minY - 2);
          frames.push({
            x,
            y,
            w: Math.min(right, maxX + 3) - x,
            h: Math.min(image.height, maxY + 3) - y,
            anchorX: (anchorLeft + anchorRight) / 2,
          });
        }
        return { frames, height: Math.max(...frames.map((f) => f.h)) };
      });
      atlases.set(type, { image, rows });
    }),
  );
}

export function drawEnemyAtlas(
  ctx,
  type,
  x,
  y,
  { frame = 0, direction = "south", scale = 1 } = {},
) {
  const atlas = atlases.get(type);
  if (!atlas) return false;
  const row =
    atlas.rows[
      direction === "north"
        ? 1
        : direction === "east" || direction === "west"
          ? 2
          : 0
    ];
  const pose = row.frames[((Math.floor(frame) % 4) + 4) % 4];
  const height = Math.round(22 * scale),
    factor = height / row.height;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(direction === "west" ? -1 : 1, 1);
  ctx.drawImage(
    atlas.image,
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
