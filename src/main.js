import { Game } from "./game.js";
import { GameState } from "./config.js";
import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { Soundtrack } from "./audio.js";
import { loadSprites } from "./sprites.js";

export const game = new Game();
export const renderer = new Renderer(document.getElementById("game-canvas"));
export const input = new Input(
  () => ui.pause(),
  () => {
    if (game.state === GameState.PLAYING) ui.pause();
  },
);
export const audio = new Soundtrack();
export const ui = new UI(game, input, audio);
loadSprites()
  .then(() => ui.paintPortraits())
  .catch(() => {
    /* Procedural sprites remain available if the art cannot load. */
  });
let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  game.update(dt, input.read());
  const events = game.events.splice(0);
  audio.sync(game.state, game.missionIndex);
  audio.consume(events);
  renderer.consume(events);
  renderer.draw(game, dt);
  ui.update();
  ui.animate(now / 1000);
  requestAnimationFrame(frame);
}
ui.update();
requestAnimationFrame(frame);
