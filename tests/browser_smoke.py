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
    page.locator('#pause').focus()
    page.keyboard.press('Space')
    check("Espacio activa un botón enfocado sin gastar impulso",page.evaluate("app.game.state==='PAUSED' && app.game.stats.dashes===0"))
    page.locator('#state-primary').click()
    page.screenshot(path=str(OUTPUT / "game.png"), full_page=True)

    page.evaluate("() => {app.game.start(2);app.game.guards=[];app.input.clear();}")
    page.locator('#game-canvas').focus()
    page.keyboard.down('d')
    page.keyboard.down('Space')
    page.wait_for_timeout(140)
    check("Impulso azul con Espacio y movimiento",page.evaluate("app.game.stats.dashes===1 && app.game.players[0].dashCooldown>3"))
    page.wait_for_timeout(3600)
    check("Mantener Espacio no dispara impulsos repetidos",page.evaluate("app.game.stats.dashes===1"))
    page.keyboard.up('Space')
    page.keyboard.up('d')
    page.keyboard.down('ArrowRight')
    page.keyboard.press('ShiftRight')
    page.wait_for_timeout(80)
    page.keyboard.up('ArrowRight')
    check("Impulso rojo independiente con Shift derecho",page.evaluate("app.game.stats.dashes===2 && app.game.players[1].dashCooldown>0"))
    check("HUD muestra runas, tesoros y recarga", 'RUNAS 0/1' in page.locator('#rune-count').inner_text() and 'TESOROS' in page.locator('#relic-count').inner_text() and 'RECARGA' in page.locator('#dash-two').inner_text())

    # Deterministic interaction fixtures exercise the rendered game and HUD.
    page.evaluate("""() => {
      const g=app.game;g.start(2);g.guards=[];
      Object.assign(g.players[0],{x:3.5,y:9.5,protection:0});g.update(.01);app.ui.update();
    }""")
    check("Escondite sin tecla de interacción", page.evaluate("app.game.players[0].state === 'HIDDEN'") and "OCULTO" in page.locator("#player-one-status").inner_text())
    page.evaluate("""() => {
      const g=app.game;g.runes.forEach(r=>r.active=true);
      Object.assign(g.players[0],{x:14.5,y:2.5,protection:0,state:'NORMAL'});g.collectFlag();g.capture(g.players[0]);app.ui.update();
    }""")
    check("Captura, burbuja y bandera caída", page.evaluate("app.game.players[0].state === 'CAPTURED' && app.game.flag.state === 'DROPPED'") and "caída" in page.locator("#objective").inner_text())
    page.screenshot(path=str(OUTPUT / "capture.png"), full_page=True)
    page.evaluate("""() => {
      const g=app.game;Object.assign(g.players[1],{x:14.5,y:2.5,protection:0});g.update(.01);g.rescue(.6);app.ui.update();
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

    check("Arte pixelado cargado", page.evaluate("async()=> (await import('/src/sprites.js')).atlasReady && (await import('/src/sprites.js')).guardiansReady && app.renderer.keyArtReady"))
    check("Cinco destinos visibles", page.locator("#mission-route li").count() == 5)
    check("Solo la primera misión está disponible antes de avanzar",page.evaluate("app.game.progress.unlocked(1,0) && !app.game.progress.unlocked(1,1)"))
    journeys = []
    for mode in [1, 2]:
        if mode == 2:
            page.locator("#state-menu").click()
            page.locator("#play-duo").click()
        for mission in range(5):
            page.wait_for_timeout(100)
            page.screenshot(path=str(OUTPUT / f"mission-{mission+1}-mode-{mode}.png"), full_page=True)
            # Fresh normal start keeps simulation timing independent of screenshot duration.
            result = page.evaluate("""async args => {
              const {playJourney}=await import('/tests/journey.js');
              const result=playJourney(app.game,args.mode,args.mission,false);app.ui.update();return result;
            }""", {"mode":mode,"mission":mission})
            journeys.append(result)
            expected = "VICTORY" if mission == 4 else "MISSION_COMPLETE"
            check(f"Mapa {mission+1}, modo {mode}: bandera y regreso con guardianes activos", result["state"] == expected and result["runes"] == [1,2,2,3,3][mission] and result["missionIndex"] == mission)
            title="¡AVENTURA COMPLETADA!" if mission == 4 else "¡MISIÓN COMPLETADA!"
            check(f"Resultado de misión {mission+1}, modo {mode}", page.locator("#state-title").inner_text() == title)
            check(f"Estrellas y estadísticas visibles, misión {mission+1}, modo {mode}",page.locator('#result-stats').is_visible() and page.locator('.result-stars').get_attribute('aria-label').endswith('de 3 estrellas'))
            if mission < 4:
                page.locator("#state-primary").click()
                check(f"Avance al mapa {mission+2} sin perder el modo {mode}", page.evaluate(f"app.game.missionIndex === {mission+1} && app.game.mode === {mode} && app.game.attempts === 3 && app.game.state === 'PLAYING'"))
        page.wait_for_timeout(180)
        page.screenshot(path=str(OUTPUT / f"victory-mode-{mode}.png"), full_page=True)
        check(f"Cinco misiones marcadas como completadas, modo {mode}", page.locator("#mission-route li.completed").count() == 5)
    page.locator("#state-primary").click()
    check("Rejugar la campaña empieza en el primer mapa", page.evaluate("app.game.missionIndex === 0 && app.game.state === 'PLAYING'"))

    page.evaluate("""() => {
      const g=app.game;g.start(2,3);g.guards=[];
      for(let i=0;i<3;i++){
        for(const p of g.players){p.protection=0;p.state='NORMAL';g.capture(p);}
        g.checkOutcome();if(i<2)for(let n=0;n<140;n++)g.update(1/60);
      }
      app.ui.update();
    }""")
    page.locator("#state-primary").click()
    check("Reintentar la misión 4 conserva ese mapa, el modo y restaura tres intentos", page.evaluate("app.game.missionIndex === 3 && app.game.mode === 2 && app.game.attempts === 3 && app.game.guards.length === 5"))

    # Saved checkpoints and replay selection survive a real reload.
    page.reload(wait_until='networkidle')
    page.evaluate("async()=>window.app=await import('/src/main.js')")
    check("Continuar aparece tras recargar una misión pendiente",page.locator('#continue-game').is_visible() and 'misión 4' in page.locator('#continue-game').inner_text())
    page.locator('#continue-game').click()
    check("Continuar recupera mapa y modalidad",page.evaluate("app.game.mode===2 && app.game.missionIndex===3 && app.game.attempts===3"))
    page.keyboard.press('Escape')
    page.locator('#state-menu').click()
    page.locator('#route-mode').select_option('1')
    page.locator('button[data-mission="2"]').click()
    check("Rejugar un mapa desbloqueado respeta la modalidad elegida",page.evaluate("app.game.mode===1 && app.game.missionIndex===2"))

    # Verify actual output samples, not just the existence of an AudioContext.
    page.evaluate("""() => {
      window.analyser=app.audio.context.createAnalyser();analyser.fftSize=2048;app.audio.master.connect(analyser);
      window.peak=async (milliseconds=400)=>{
        let maximum=0;const samples=new Float32Array(analyser.fftSize),until=performance.now()+milliseconds;
        while(performance.now()<until){analyser.getFloatTimeDomainData(samples);for(const value of samples)maximum=Math.max(maximum,Math.abs(value));await new Promise(r=>setTimeout(r,20));}
        return maximum;
      };
    }""")
    page.wait_for_function("app.audio.context.state==='running' && app.audio.state==='PLAYING' && app.audio.notesScheduled>0")
    check("La música genera señal de audio", page.evaluate("async()=>app.audio.context.state==='running' && app.audio.notesScheduled>0 && await peak()>0.001"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(1000)
    check("La pausa silencia la música", page.evaluate("async()=>await peak()<0.00001"))
    page.locator("#state-primary").click()
    page.locator("#audio-settings summary").click()
    page.locator("#music-toggle").uncheck()
    page.locator("#effects-toggle").uncheck()
    page.wait_for_timeout(1100)
    check("Se pueden silenciar música y efectos", page.evaluate("async()=>!app.audio.settings.music && !app.audio.settings.effects && await peak()<0.00001"))
    page.locator("#effects-toggle").check()
    effect = page.evaluate("""async()=>{
      const before=app.audio.effectsPlayed;app.audio.consume([{type:'rescue'}]);
      return {peak:await peak(),count:app.audio.effectsPlayed-before};
    }""")
    check("Los efectos suenan con la música desactivada", effect["peak"] > .001 and effect["count"] == 1)
    page.locator("#volume").fill("30")
    page.locator("#volume").focus()
    page.keyboard.press("ArrowRight")
    check("Volumen accesible con teclado", page.locator("#volume").input_value() == "31" and page.evaluate("app.audio.settings.volume===.31 && app.input.keys.size===0"))
    page.keyboard.press('Escape')
    check("Escape pausa aun con el control de volumen enfocado",page.evaluate("app.game.state==='PAUSED'"))
    page.locator('#state-primary').click()
    page.locator("#volume").fill("0")
    page.wait_for_timeout(500)
    check("Volumen cero silencia también los efectos", page.evaluate("async()=>{app.audio.consume([{type:'flag'}]);return await peak()<0.00001;}"))
    page.locator("#volume").fill("31")
    page.locator("#effects-toggle").uncheck()
    page.wait_for_timeout(2200)
    check("Las voces de audio terminadas se liberan", page.evaluate("app.audio.voices.size===0"))
    page.locator("#effects-toggle").check()
    page.reload(wait_until="networkidle")
    page.evaluate("async()=>window.app=await import('/src/main.js')")
    check("Preferencias de sonido conservadas al recargar", not page.locator("#music-toggle").is_checked() and page.locator("#effects-toggle").is_checked() and page.locator("#volume").input_value()=="31")
    check("No hay reproducción automática antes de un gesto", page.evaluate("app.audio.context===null"))
    check("Volver al menú principal", page.locator("#menu").is_visible())
    for width,height in [(1366,768),(1024,768),(390,844)]:
        page.set_viewport_size({"width":width,"height":height})
        page.screenshot(path=str(OUTPUT / f"menu-{width}.png"), full_page=True)
        check(f"Diseño sin desbordamiento horizontal a {width}px",page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        check(f"Botones del menú dentro de la escena a {width}px",page.locator('#how-to').evaluate("e=>e.getBoundingClientRect().bottom <= document.querySelector('.game-shell').getBoundingClientRect().bottom"))
        if width>700:
            check(f"Todo el juego cabe en pantalla a {width}×{height}",page.locator(".game-shell").evaluate("e=>e.getBoundingClientRect().bottom<=innerHeight"))

    check("Sin errores JavaScript", not errors)
    check("Sin recursos faltantes", not failures)
    check("Todos los recursos del juego son locales", all(url.startswith(BASE) for url in requests))
    report={"checks":len(checks),"passed":checks,"errors":errors,"failed_resources":failures,"journeys":journeys,"browser":browser.version}
    (OUTPUT / "browser-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"checks_passed":len(checks),"journeys":journeys,"browser":browser.version},ensure_ascii=False))
    browser.close()
