import { GuardState } from "./config.js";
import { explorerPose } from "./explorer-animation.js";

// Use committed grid movement, never the pursuit target, to choose a walking view.
export function enemyPose(body, reducedMotion = false, time = 0) {
  const stopped = [
    GuardState.STUNNED,
    GuardState.WINDUP,
    GuardState.RECOVER,
  ].includes(body.state);
  const pose = explorerPose(body, reducedMotion || stopped);
  // A jaguar can start a charge without taking another step. Face the exact
  // telegraphed ray throughout anticipation, the charge and its recovery.
  if (
    body.type === "hunter" &&
    body.attack &&
    [GuardState.WINDUP, GuardState.LUNGE, GuardState.RECOVER].includes(
      body.state,
    )
  ) {
    const origin = body.attack.origin;
    const next = body.attack.cells.find(
      (cell) => cell.x !== origin.x || cell.y !== origin.y,
    );
    if (next)
      pose.direction = explorerPose({
        direction: { x: next.x - origin.x, y: next.y - origin.y },
      }).direction;
  }
  // The water spirit flows even while waiting. Renderer time freezes on pause.
  if (body.type === "spirit" && !reducedMotion && !stopped)
    pose.frame = Math.floor(time * 4 + (body.id || 0)) % 4;
  return pose;
}
