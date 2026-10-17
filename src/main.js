import { Game } from "./game.js";
import { GameState } from "./config.js";
import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";

export const game = new Game();
export const renderer = new Renderer(document.getElementById("game-canvas"));
export const input = new Input(
  () => ui.pause(),
  () => {
    if (game.state === GameState.PLAYING) ui.pause();
  },
);
export const ui = new UI(game, input);
let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  game.update(dt, input.read());
  renderer.consume(game.events.splice(0));
  renderer.draw(game, dt);
  ui.update();
  ui.animate(now / 1000);
  requestAnimationFrame(frame);
}
ui.update();
requestAnimationFrame(frame);
