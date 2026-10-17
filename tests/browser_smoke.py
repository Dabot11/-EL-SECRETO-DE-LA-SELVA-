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
    frozen_canvas = page.locator("#game-canvas").evaluate("e=>e.toDataURL()")
    page.wait_for_timeout(120)
    check("La pausa detiene el movimiento", page.evaluate("JSON.stringify(app.game.players)") == frozen)
    check("La pausa congela también agua, vegetación y efectos", page.locator("#game-canvas").evaluate("e=>e.toDataURL()") == frozen_canvas)
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
    page.wait_for_timeout(360)
    check("Impulso azul con Espacio y movimiento",page.evaluate("app.game.stats.dashes===1 && app.game.players[0].dashCooldown>3"))
    page.wait_for_timeout(3600)
    check("Mantener Espacio no dispara impulsos repetidos",page.evaluate("app.game.stats.dashes===1"))
    page.keyboard.up('Space')
    page.keyboard.up('d')
    page.keyboard.down('ArrowRight')
    page.keyboard.press('ShiftRight')
    page.wait_for_timeout(360)
    page.keyboard.up('ArrowRight')
    check("Impulso rojo independiente con Shift derecho",page.evaluate("app.game.stats.dashes===2 && app.game.players[1].dashCooldown>0"))
    check("HUD muestra runas, tesoros y recarga", 'PASO 1/3' in page.locator('#rune-count').inner_text() and 'TESOROS' in page.locator('#relic-count').inner_text() and 'RECARGA' in page.locator('#ability-dash-two').get_attribute('aria-label') and page.locator('#ability-dash-two.recharging').count()==1)

    page.evaluate("""() => {
      const g=app.game;g.start(2,1);g.guards=[];g.runes=[];g.relics=[];g.traps=[];
      g.map.cells=g.map.cells.map((row,y)=>row.map((t,x)=>x===0||y===0||x===g.map.width-1||y===g.map.height-1?'#':'.'));g.map.revision++;
      Object.assign(g.players[0],{x:6.5,y:7.5,motion:null});app.input.clear();
    }""")
    page.locator('#game-canvas').focus()
    page.keyboard.press('d')
    page.wait_for_timeout(450)
    check("Un toque real de D recorre una casilla completa y se detiene",page.evaluate("app.game.players[0].x===7.5 && app.game.players[0].y===7.5 && !app.game.players[0].motion"))
    page.keyboard.down('w')
    page.wait_for_timeout(65)
    page.keyboard.down('d')
    page.wait_for_timeout(65)
    page.keyboard.up('w')
    page.keyboard.up('d')
    page.wait_for_timeout(550)
    check("El giro solicitado durante el paso espera y no crea una diagonal",page.evaluate("app.game.players[0].x===8.5 && app.game.players[0].y===6.5 && !app.game.players[0].motion"))
    page.keyboard.down('w')
    page.wait_for_timeout(65)
    page.keyboard.down('d')
    page.wait_for_timeout(800)
    page.keyboard.up('w')
    page.keyboard.up('d')
    page.wait_for_timeout(350)
    check("Dos teclas sostenidas dan prioridad a la última dirección",page.evaluate("app.game.players[0].x>=10.5 && app.game.players[0].y===5.5"))
    check("El tablero tiene 28 columnas y 20 filas",page.evaluate("app.game.map.width===28&&app.game.map.height===20"))

    # Direction changes are committed by the real keyboard step, independently for both players.
    page.evaluate("""() => {
      const g=app.game;g.start(2,1);g.guards=[];g.traps=[];g.relics=[];
      g.map.cells=g.map.cells.map((row,y)=>row.map((t,x)=>x===0||y===0||x===g.map.width-1||y===g.map.height-1?'#':'.'));g.map.revision++;
      Object.assign(g.players[0],{x:6.5,y:6.5,motion:null});Object.assign(g.players[1],{x:12.5,y:6.5,motion:null});app.input.clear();
    }""")
    page.locator('#game-canvas').focus()
    for blue,red,direction in [('w','ArrowUp','north'),('d','ArrowRight','east'),('s','ArrowDown','south'),('a','ArrowLeft','west')]:
        page.keyboard.press(blue)
        page.keyboard.press(red)
        page.wait_for_timeout(350)
        check(f"Ambos exploradores conservan la vista {direction} al terminar su paso",page.evaluate("""async direction=>{
          const {explorerPose}=await import('/src/explorer-animation.js');
          return app.game.players.every(p=>!p.motion&&explorerPose(p).direction===direction&&explorerPose(p).frame===0);
        }""",direction))
    check("Las piernas tienen poses distintas en las cuatro direcciones y ambos colores",page.evaluate("""async()=>{
      const {drawSprite,explorersReady}=await import('/src/sprites.js');
      if(!explorersReady)return false;
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d');
      for(const red of [false,true])for(const direction of ['north','south','east','west']) {
        const poses=[0,1,3].map(frame=>{c.clearRect(0,0,64,64);drawSprite(c,'explorer',32,62,{red,direction,frame,scale:2});return Array.from(c.getImageData(0,46,64,18).data).join(',');});
        if(new Set(poses).size!==3)return false;
      }
      return true;
    }"""))

    check("Los cuatro enemigos cargan sus vistas y ciclos completos",page.evaluate("""async()=>{
      const {enemySpritesReady}=await import('/src/sprites.js');
      return ['stone','hunter','spirit','warden'].every(enemySpritesReady);
    }"""))
    check("Cada enemigo tiene frente, espalda, perfiles y cuatro poses visibles",page.evaluate("""async()=>{
      const {drawSprite}=await import('/src/sprites.js');
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;
      const c=canvas.getContext('2d',{willReadFrequently:true});
      for(const type of ['stone','hunter','spirit','warden']) {
        const views=[];
        for(const direction of ['south','north','east','west']) {
          const feet=[];
          for(let frame=0;frame<4;frame++) {
            c.clearRect(0,0,128,96);drawSprite(c,type,64,85,{direction,frame,scale:2.5});
            const rgba=c.getImageData(0,0,128,96).data;
            let count=0;
            for(let y=0;y<96;y++)for(let x=0;x<128;x++)if(rgba[(y*128+x)*4+3]>175){
              if(x===0||x===127||y===0||y===95)return false;count++;
            }
            if(count<200)return false;
            if(!frame)views.push(canvas.toDataURL());
            feet.push(Array.from(c.getImageData(0,63,128,23).data).join(','));
          }
          if(new Set(feet).size!==4)return false;
        }
        if(new Set(views).size!==4)return false;
      }
      return true;
    }"""))
    # Deterministic interaction fixtures exercise the rendered game and HUD.
    page.evaluate("""() => {
      const g=app.game;g.start(2);g.guards=[];
      const [x,y]=g.map.bushGroups[0][0];Object.assign(g.players[0],{x:x+.5,y:y+.5,protection:0,motion:null});g.update(.01);app.ui.update();
    }""")
    check("Escondite sin tecla de interacción", page.evaluate("app.game.players[0].state === 'HIDDEN'") and "OCULTO" in page.locator("#player-one-status").inner_text())
    page.evaluate("""() => {
      const g=app.game;g.runes.forEach(r=>r.active=true);g.openBridge();
      Object.assign(g.players[0],{x:g.map.pedestal.x,y:g.map.pedestal.y,protection:0,state:'NORMAL'});g.collectFlag();g.capture(g.players[0]);app.ui.update();
    }""")
    check("Captura, burbuja y bandera caída", page.evaluate("app.game.players[0].state === 'CAPTURED' && app.game.flag.state === 'DROPPED'") and "caída" in page.locator("#objective").inner_text())
    page.screenshot(path=str(OUTPUT / "capture.png"), full_page=True)
    page.evaluate("""() => {
      const g=app.game;Object.assign(g.players[1],{x:g.map.pedestal.x,y:g.map.pedestal.y,protection:0});g.update(.01);g.rescue(.6);app.ui.update();
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

    check("Solo muestra un explorador y tres corazones",page.evaluate("app.game.players.length===1 && app.game.players[0].hearts===3") and page.locator('#player-two-panel').is_hidden() and page.locator('#lives-label').inner_text()=='CORAZONES')
    page.screenshot(path=str(OUTPUT / "solo-v5.png"),full_page=True)
    page.evaluate("() => {app.game.guards=[];Object.assign(app.game.players[0],{x:5.5,y:11.5,protection:0,state:'NORMAL'});app.game.capture(app.game.players[0]);app.ui.update();}")
    check("El HUD descuenta un corazón sin burbuja",page.locator('#attempts .spent').count()==1 and page.evaluate("app.game.players[0].state==='PROTECTED'"))
    # Real key events exercise both tools, combos, relic passes and no auto-repeat.
    page.evaluate("""() => {
      const g=app.game;g.start(2,1);g.relics=[];g.traps=[];g.guards=[g.guards[0]];
      g.map.cells=g.map.cells.map((row,y)=>row.map((t,x)=>x===0||y===0||x===g.map.width-1||y===g.map.height-1?'#':'.'));g.map.revision++;
      Object.assign(g.players[0],{x:6.5,y:6.5,protection:9});Object.assign(g.players[1],{x:7.5,y:6.5,protection:9});
      Object.assign(g.guards[0],{x:8.5,y:6.5,state:'STUNNED',stunTime:9});app.input.clear();
    }""")
    page.locator('#game-canvas').focus()
    page.keyboard.press('e')
    page.wait_for_timeout(70)
    check("E activa la linterna azul y marca al guardián",page.evaluate("app.game.stats.lights===1 && app.game.guards[0].markedTime>0"))
    page.keyboard.press('Enter')
    page.wait_for_timeout(70)
    check("Enter activa la liana roja y completa el combo",page.evaluate("app.game.stats.combos===1 && app.game.stats.vines===1"))
    page.screenshot(path=str(OUTPUT / "combo-v5.png"),full_page=True)
    page.evaluate("() => {app.game.guards=[];app.game.takeFlag(app.game.players[0]);}")
    page.keyboard.press('f')
    page.wait_for_timeout(70)
    check("F pasa la reliquia de azul a rojo",page.evaluate("app.game.flag.carrier===1 && app.game.stats.passes===1"))
    page.screenshot(path=str(OUTPUT / "pass-v5.png"),full_page=True)
    page.wait_for_timeout(820)
    page.keyboard.press('l')
    page.wait_for_timeout(70)
    check("L devuelve la reliquia a azul",page.evaluate("app.game.flag.carrier===0 && app.game.stats.passes===2"))
    page.evaluate("() => {app.game.start(1);app.game.guards=[];app.game.bridge.charged=true;Object.assign(app.game.players[0],app.game.bridge.winch);app.input.clear();}")
    page.wait_for_timeout(50)
    floor_before=page.evaluate("app.renderer.groundLayer.toDataURL()")
    page.keyboard.down('e')
    page.wait_for_timeout(70)
    check("La linterna revela el mecanismo en solitario",page.evaluate("app.game.bridge.litTime>7 && !app.game.bridge.open"))
    page.keyboard.press('q')
    page.wait_for_timeout(70)
    check("Q abre el puente en solitario y actualiza el suelo dibujado",page.evaluate("app.game.bridge.open") and page.evaluate("app.renderer.groundLayer.toDataURL()")!=floor_before)
    page.screenshot(path=str(OUTPUT / "bridge-open-v5.png"),full_page=True)
    page.wait_for_timeout(5100)
    check("Mantener E no repite la linterna al terminar la recarga",page.evaluate("app.game.stats.lights===1"))
    page.keyboard.up('e')
    page.evaluate("() => {app.game.retryMission();app.ui.update();}")
    page.wait_for_timeout(70)
    check("Reintentar cierra el puente también visualmente",page.evaluate("!app.game.bridge.open && app.renderer.cachedRevision===app.game.map.revision") and page.evaluate("app.renderer.groundLayer.toDataURL()") == floor_before)
    page.screenshot(path=str(OUTPUT / "bridge-closed-v5.png"),full_page=True)
    # Input activation of focused UI buttons must not consume either tool.
    page.locator('#pause').focus()
    page.keyboard.press('Enter')
    check("Enter en un botón pausa sin disparar la liana",page.evaluate("app.game.state==='PAUSED' && app.game.stats.vines===0"))
    page.locator('#state-primary').click()

    check("Arte pixelado cargado", page.evaluate("async()=> (await import('/src/sprites.js')).atlasReady && (await import('/src/sprites.js')).guardiansReady && app.renderer.keyArtReady"))
    check("Cada destino tiene su propia vista previa", page.locator(".route-preview img").evaluate_all("nodes=>nodes.length===10&&new Set(nodes.map(n=>n.src)).size===10&&nodes.every(n=>n.complete&&n.naturalWidth>0)"))
    check("Diez destinos disponibles en la campaña", page.locator("#mission-route li").count() == 10)
    check("Solo la primera misión está disponible antes de avanzar",page.evaluate("app.game.progress.unlocked(1,0) && !app.game.progress.unlocked(1,1)"))
    journeys = []
    for mode in [1, 2]:
        if mode == 2:
            page.locator("#state-menu").click()
            page.locator("#play-duo").click()
        for mission in range(10):
            page.wait_for_timeout(100)
            page.screenshot(path=str(OUTPUT / f"mission-{mission+1}-mode-{mode}.png"), full_page=True)
            # Fresh normal start keeps simulation timing independent of screenshot duration.
            result = page.evaluate("""async args => {
              const {playJourney}=await import('/tests/journey.js');
              const result=playJourney(app.game,args.mode,args.mission,false);app.ui.update();return result;
            }""", {"mode":mode,"mission":mission})
            journeys.append(result)
            expected = "VICTORY" if mission == 9 else "MISSION_COMPLETE"
            check(f"Mapa {mission+1}, modo {mode}: bandera y regreso con guardianes activos", result["state"] == expected and result["runes"] == [0,2,2,3,3,3,3,4,4,4][mission] and result["missionIndex"] == mission)
            title="¡AVENTURA COMPLETADA!" if mission == 9 else "¡MISIÓN COMPLETADA!"
            check(f"Resultado de misión {mission+1}, modo {mode}", page.locator("#state-title").inner_text() == title)
            check(f"Estrellas y estadísticas visibles, misión {mission+1}, modo {mode}",page.locator('#result-stats').is_visible() and page.locator('.result-stars').get_attribute('aria-label').endswith('de 3 estrellas'))
            if mission < 9:
                page.locator("#state-primary").click()
                check(f"Avance al mapa {mission+2} sin perder el modo {mode}", page.evaluate(f"app.game.missionIndex === {mission+1} && app.game.mode === {mode} && app.game.attempts === 3 && app.game.state === 'PLAYING'"))
        page.wait_for_timeout(180)
        page.screenshot(path=str(OUTPUT / f"victory-mode-{mode}.png"), full_page=True)
        check(f"Diez misiones marcadas como completadas, modo {mode}", page.locator("#mission-route li.completed").count() == 10)
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
    for width,height in [(1366,768),(1440,900),(1280,720),(1024,768),(1280,600),(390,844)]:
        page.set_viewport_size({"width":width,"height":height})
        page.screenshot(path=str(OUTPUT / f"menu-{width}.png"), full_page=True)
        check(f"Diseño sin desbordamiento horizontal a {width}px",page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        check(f"Botones del menú dentro de la escena a {width}px",page.locator('#how-to').evaluate("e=>e.getBoundingClientRect().bottom <= document.querySelector('.game-shell').getBoundingClientRect().bottom"))
        if width>700:
            page.locator('#play-duo').click()
            page.wait_for_timeout(160)
            page.screenshot(path=str(OUTPUT / f"expanded-game-{width}-{height}.png"))
            check(f"El juego ocupa toda la ventana a {width}×{height}",page.locator('.game-shell').evaluate("e=>{const r=e.getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight}"))
            check(f"Mapa completo, cuadrado y ampliado al máximo a {width}×{height}",page.evaluate("""() => {
              const {view,canvas}=app.renderer, r=canvas.getBoundingClientRect();
              const w=app.game.map.width*28*view.scale,h=app.game.map.height*28*view.scale;
              return view.x>=0&&view.y>=0&&view.x+w<=r.width&&view.y+h<=r.height
                && Math.min(r.width-w,r.height-h)<25 && w*h/(r.width*r.height)>.65;
            }"""))
            check(f"Controles y mensajes caben fuera del mapa a {width}×{height}",page.evaluate("""() => {
              const canvas=document.querySelector('#game-canvas').getBoundingClientRect();
              return ['.mission','.team-attempts','#toast','.players-info','#pause','#fullscreen'].every(selector=>{
                const e=document.querySelector(selector);if(e.hidden)return true;const r=e.getBoundingClientRect();
                return r.left>=canvas.right&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
              })&&document.documentElement.scrollHeight<=innerHeight;
            }"""))
            if (width,height)==(1366,768):
                page.locator('#fullscreen').click()
                page.wait_for_function("!!document.fullscreenElement && document.querySelector('#fullscreen').getAttribute('aria-pressed')==='true'")
                check("Pantalla completa se activa con el botón",page.locator('#fullscreen').get_attribute('aria-pressed')=='true')
                page.locator('#fullscreen').click()
                page.wait_for_function("!document.fullscreenElement && document.querySelector('#fullscreen').getAttribute('aria-pressed')==='false'")
                check("Salir de pantalla completa conserva la partida ampliada",page.evaluate("document.body.classList.contains('playing')&&app.game.state==='PLAYING'"))
            page.keyboard.press('Escape')
            frozen=page.evaluate("JSON.stringify(app.game.players)")
            page.set_viewport_size({'width':width-30,'height':height-20})
            page.wait_for_timeout(100)
            check(f"Redimensionar en pausa conserva la partida a {width}px",page.evaluate("JSON.stringify(app.game.players)")==frozen)
            page.locator('#state-menu').click()
            check(f"Volver al menú recupera la página a {width}px",page.locator('.site-header').is_visible() and page.locator('#mission-route').is_visible() and not page.evaluate("document.body.classList.contains('playing')"))

    retina=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=2)
    retina.goto(BASE,wait_until='networkidle')
    retina.locator('#play-solo').click()
    retina.wait_for_timeout(160)
    check("Canvas nítido y vista ampliada en pantalla Retina",retina.locator('#game-canvas').evaluate("e=>e.width===e.clientWidth*2&&e.height===e.clientHeight*2&&document.body.classList.contains('playing')"))
    retina.screenshot(path=str(OUTPUT/'expanded-retina-solo.png'))
    retina.locator('#fullscreen').click()
    retina.wait_for_function("!!document.fullscreenElement")
    retina.locator('#pause').click()
    retina.locator('#state-menu').click()
    retina.wait_for_function("!document.fullscreenElement")
    check("Volver al menú sale también de pantalla completa",retina.locator('#menu').is_visible() and not retina.evaluate("document.body.classList.contains('playing')"))
    retina.close()

    migration = browser.new_page()
    migration.goto(BASE,wait_until='networkidle')
    migration.evaluate("""() => { localStorage.setItem('selva-progress-v3',JSON.stringify({version:1,checkpoint:{mode:1,index:1},records:{1:[{stars:3,time:30,score:1000}],2:[]}})); }""")
    migration.reload(wait_until='networkidle')
    migration.evaluate("async()=>window.app=await import('/src/main.js')")
    check("Una partida v3 conserva desbloqueos sin mezclar récords",migration.evaluate("app.game.progress.unlocked(1,1)&&app.game.progress.record(1,0)===null&&app.game.progress.data.checkpoint.index===1&&localStorage.getItem('selva-progress-v3')!==null"))
    migration.locator('#continue-game').click()
    check("Continuar una partida migrada entra con un único explorador",migration.evaluate("app.game.mode===1&&app.game.players.length===1&&app.game.missionIndex===1"))
    migration.close()

    expansion = browser.new_page()
    expansion.goto(BASE,wait_until='networkidle')
    expansion.evaluate("""() => {
      const record={stars:3,time:42,score:1800};
      localStorage.setItem('selva-progress-v5', JSON.stringify({version:3,checkpoint:null,unlocked:{1:1,2:5},records:{1:Array(5).fill(null),2:Array(5).fill(record)}}));
    }""")
    expansion.reload(wait_until='networkidle')
    expansion.evaluate("async()=>window.app=await import('/src/main.js')")
    check("Una campaña v5 completada ofrece continuar desde el nivel seis",'misión 6' in expansion.locator('#continue-game').inner_text())
    expansion.locator('#route-mode').select_option('2')
    check("El mapa seis está desbloqueado y el siete espera su turno",expansion.locator('button[data-mission="5"]').is_enabled() and expansion.locator('button[data-mission="6"]').is_disabled())
    check("Los récords anteriores y la numeración 10 se conservan",expansion.locator('#mission-route li.completed').count()==5 and expansion.locator('#mission-route .route-number').last.inner_text()=='10')
    expansion.screenshot(path=str(OUTPUT/'campaign-ten-missions.png'),full_page=True)
    expansion.locator('#continue-game').click()
    check("Continuar la expansión inicia el nuevo mapa en el modo guardado",expansion.evaluate("app.game.missionIndex===5&&app.game.mode===2&&app.game.state==='PLAYING'"))
    expansion.close()

    check("Sin errores JavaScript", not errors)
    check("Sin recursos faltantes", not failures)
    check("Todos los recursos del juego son locales", all(url.startswith(BASE) for url in requests))
    report={"checks":len(checks),"passed":checks,"errors":errors,"failed_resources":failures,"journeys":journeys,"browser":browser.version}
    (OUTPUT / "browser-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({"checks_passed":len(checks),"journeys":journeys,"browser":browser.version},ensure_ascii=False))
    browser.close()
