// Visual pose only: the rules still advance one complete cardinal cell at a time.
export function explorerPose(body, reducedMotion = false) {
  const d = body.direction;
  const direction =
    !d || (!d.x && !d.y)
      ? "south"
      : d.y < 0
        ? "north"
        : d.y > 0
          ? "south"
          : d.x < 0
            ? "west"
            : "east";
  if (!body.motion || reducedMotion) return { direction, frame: 0 };
  const progress = Math.max(
    0,
    Math.min(1, 1 - body.motion.remaining / body.motion.duration),
  );
  // Every cardinal step flips tile parity, so the next step uses the other leg.
  // This also works during a turn, slow movement and a dash, without a wall clock.
  const contact = (Math.floor(body.x) + Math.floor(body.y)) % 2 === 0 ? 1 : 3;
  const before = contact === 1 ? 0 : 2;
  const after = contact === 1 ? 2 : 0;
  const frame = progress < 0.15 ? before : progress < 0.72 ? contact : after;
  return { direction, frame };
}
