"""Browser integration checks. Run with npm start in another terminal.

Requires optional Python Playwright and Chromium; the game itself has no dependencies.
CHROMIUM_PATH selects an existing browser; otherwise Playwright's installed Chromium is used.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-results"
OUTPUT.mkdir(exist_ok=True)
BASE = os.environ.get("GAME_TEST_URL", "http://127.0.0.1:8080")
checks = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
    print("PASS:", name)


with sync_playwright() as playwright:
    executable = os.environ.get("CHROMIUM_PATH")
    browser = playwright.chromium.launch(
        executable_path=executable or None,
        headless=True,
        args=["--no-sandbox"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1080})
    errors = []
    failures = []
    requests = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: failures.append(response.url) if response.status >= 400 else None)
    page.on("request", lambda request: requests.append(request.url))
    page.goto(BASE, wait_until="networkidle")
    page.evaluate("async () => { window.app = await import('/src/main.js'); }")
    check("Menú principal y título visibles", page.locator("#menu").is_visible() and page.locator("h1").inner_text().startswith("EL SECRETO"))
    page.screenshot(path=str(OUTPUT / "menu.png"), full_page=True)
    page.locator("#how-to").click()
    check("Ayuda con controles y reglas", page.locator("#how-screen").is_visible())
    page.screenshot(path=str(OUTPUT / "controls.png"), full_page=True)
    page.keyboard.press("Escape")
    check("Escape cierra la ayuda", page.locator("#how-screen").is_hidden())
    page.locator("#play-duo").click()
    check("Selección de modo cooperativo", page.evaluate("app.game.mode === 2 && app.game.state === 'PLAYING'"))
    before = page.evaluate("app.game.players.map(p => ({x:p.x,y:p.y}))")
    scroll = page.evaluate("window.scrollY")
    page.keyboard.down("d")
    page.keyboard.down("ArrowDown")
    page.wait_for_timeout(240)
    page.keyboard.up("d")
    page.keyboard.up("ArrowDown")
    after = page.evaluate("app.game.players.map(p => ({x:p.x,y:p.y}))")
    check("WASD y flechas funcionan simultáneamente", all(abs(a["x"]-b["x"])+abs(a["y"]-b["y"]) > .1 for a, b in zip(after, before)))
    check("Las flechas no desplazan la página", page.evaluate("window.scrollY") == scroll)
    page.keyboard.press("Escape")
    check("Pausa con Escape", page.evaluate("app.game.state === 'PAUSED'") and page.locator("#state-screen").is_visible())
    frozen = page.evaluate("JSON.stringify(app.game.players)")
    page.wait_for_timeout(120)
    check("La pausa detiene el movimiento", page.evaluate("JSON.stringify(app.game.players)") == frozen)
    page.locator("#state-primary").click()
    check("Continuar reanuda el juego", page.evaluate("app.game.state === 'PLAYING'"))
    page.screenshot(path=str(OUTPUT / "game.png"), full_page=True)

    # Deterministic interaction fixtures exercise the rendered game and HUD.
    page.evaluate("""() => {
      const g=app.game;g.start(2);g.guards=[];
      Object.assign(g.players[0],{x:3.5,y:9.5,protection:0});g.update(.01);app.ui.update();
    }""")
    check("Escondite sin tecla de interacción", page.evaluate("app.game.players[0].state === 'HIDDEN'") and "OCULTO" in page.locator("#player-one-status").inner_text())
    page.evaluate("""() => {
      const g=app.game;
      Object.assign(g.players[0],{x:14.5,y:2.5,protection:0,state:'NORMAL'});g.collectFlag();g.capture(g.players[0]);app.ui.update();
    }""")
    check("Captura, burbuja y bandera caída", page.evaluate("app.game.players[0].state === 'CAPTURED' && app.game.flag.state === 'DROPPED'") and "caída" in page.locator("#objective").inner_text())
    page.screenshot(path=str(OUTPUT / "capture.png"), full_page=True)
    page.evaluate("""() => {
      const g=app.game;Object.assign(g.players[1],{x:14.5,y:2.5,protection:0});g.update(.01);app.ui.update();
    }""")
    check("Rescate y recuperación de bandera automáticos", page.evaluate("app.game.players[0].state === 'PROTECTED' && app.game.flag.carrier === 1 && app.game.attempts === 3"))

    page.evaluate("""() => {
      const g=app.game;g.start(2);g.guards=[];
      for(let i=0;i<3;i++){
        for(const p of g.players){p.protection=0;p.state='NORMAL';g.capture(p);}
        g.checkOutcome();
        if(i<2){for(let n=0;n<140;n++)g.update(1/60);}
      }
      app.ui.update();
    }""")
    check("Derrota después de tres capturas dobles", page.evaluate("app.game.attempts === 0 && app.game.state === 'GAME_OVER'") and page.locator("#state-title").inner_text() == "¡MISIÓN FALLIDA!")
    page.screenshot(path=str(OUTPUT / "defeat.png"), full_page=True)
    page.locator("#state-primary").click()
    check("Reintento desde cero", page.evaluate("app.game.state === 'PLAYING' && app.game.attempts === 3 && app.game.flag.state === 'ON_PEDESTAL'"))
    page.keyboard.press("Escape")
    page.locator("#state-menu").click()
    page.locator("#play-solo").click()
    check("Selección de modo individual", page.evaluate("app.game.mode === 1 && app.game.state === 'PLAYING'"))

    journeys = []
    for mode in [1, 2]:
        result = page.evaluate("""async mode => {
          const {playJourney}=await import('/tests/journey.js');
          const result=playJourney(app.game,mode);app.ui.update();return result;
        }""", mode)
        journeys.append(result)
        check(f"Partida completa en navegador, modo {mode}, guardianes activos", result["state"] == "VICTORY" and result["captures"] > 0 and result["rescues"] > 0)
        check(f"Pantalla de victoria, modo {mode}", page.locator("#state-title").inner_text() == "¡MISIÓN COMPLETADA!")
        page.wait_for_timeout(180)
        page.screenshot(path=str(OUTPUT / f"victory-mode-{mode}.png"), full_page=True)
    page.locator("#state-menu").click()
    check("Volver al menú principal", page.locator("#menu").is_visible())
    page.set_viewport_size({"width": 1024, "height": 768})
    page.screenshot(path=str(OUTPUT / "menu-1024.png"), full_page=True)
    check("Diseño sin desbordamiento horizontal a 1024px", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(OUTPUT / "menu-390.png"), full_page=True)
    check("Página responsive sin desbordamiento horizontal", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    check("Sin errores JavaScript", not errors)
    check("Sin recursos faltantes", not failures)
    check("Todos los recursos del juego son locales", all(url.startswith(BASE) for url in requests))
    report={"checks":len(checks),"passed":checks,"errors":errors,"failed_resources":failures,"journeys":journeys,"browser":browser.version}
    (OUTPUT / "browser-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"checks_passed":len(checks),"journeys":journeys,"browser":browser.version},ensure_ascii=False))
    browser.close()
