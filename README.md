# El Secreto de la Selva

Una aventura cooperativa de **David y Tavito**, para uno o dos jugadores en la misma computadora. La **versión 3** convierte las cinco misiones en expediciones con runas, tesoros opcionales, esquiva, cuatro clases de monstruos, estrellas y progreso guardado. Conserva el pixel art de aventura, la música original y el cooperativo local.

[Jugar en GitHub Pages](https://dabot11.github.io/-EL-SECRETO-DE-LA-SELVA-/)

Hecho con HTML, CSS y JavaScript sobre Canvas 2D. El arte se carga desde archivos del proyecto y el audio se sintetiza con Web Audio. No necesita cuentas, servicios externos ni paquetes para jugar desde un servidor local. La página publicada necesita conexión para descargar sus archivos.

## Ejecutar en tu computadora

Necesitas un navegador moderno de computadora y **Node.js 20 o posterior**, o Python 3 como alternativa.

1. Descarga o copia esta carpeta completa.
2. Abre una terminal dentro de ella.
3. Ejecuta:

   ```sh
   npm start
   ```

4. En esa misma computadora, escribe `localhost:8080` en la barra del navegador.
5. Elige **Jugar solo** o **Jugar de a dos**.

No hace falta ejecutar `npm install`. Deja la terminal abierta mientras juegas; `Ctrl+C` detiene el servidor. Si el puerto está ocupado, puedes usar `PORT=8081 npm start` en macOS/Linux o `$env:PORT=8081; npm start` en PowerShell y abrir el puerto elegido.

Alternativa con Python, desde la misma carpeta:

```sh
python3 -m http.server 8080
```

En Windows, el comando puede ser `py -m http.server 8080`. No abras `index.html` mediante doble clic: los módulos JavaScript necesitan el servidor estático. El servidor incluido se inicia desde cualquier directorio mediante `node /ruta/al/proyecto/scripts/serve.mjs` y sirve siempre la carpeta del proyecto.

## Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` publica los cambios de la rama `main`. Primero ejecuta las pruebas, prepara los archivos estáticos y después los despliega en GitHub Pages. No necesita instalar paquetes, compilar el juego ni mantener un servidor Node en producción.

En el repositorio `Dabot11/-EL-SECRETO-DE-LA-SELVA-`:

1. Abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Publica los cambios en `main`, o abre **Actions → Publicar El Secreto de la Selva → Run workflow** para publicar manualmente.
4. Espera a que terminen los trabajos `build` y `deploy`.

La dirección es `https://dabot11.github.io/-EL-SECRETO-DE-LA-SELVA-/`. Los cambios publicados en `main` actualizan la página automáticamente cuando termina el workflow **Publicar El Secreto de la Selva**. El despliegue incluye HTML, CSS, módulos JavaScript, imágenes y la versión del paquete; los scripts de desarrollo y las pruebas quedan fuera del sitio público.

## Controles

| Acción             | Explorador azul                | Explorador rojo                |
| ------------------ | ------------------------------ | ------------------------------ |
| Moverse            | W, A, S, D                     | Flechas                        |
| Impulso al moverse | Espacio                        | Shift derecho                  |
| Pausar o continuar | Escape o P                     | Escape o P                     |
| Esconderse         | Entrar en un arbusto           | Entrar en un arbusto           |
| Recoger la bandera | Acercarse a ella               | Acercarse a ella               |
| Rescatar           | Permanecer cerca durante 0,6 s | Permanecer cerca durante 0,6 s |

Las direcciones corresponden a la pantalla: arriba siempre mueve visualmente hacia arriba. Ambos jugadores pueden moverse a la vez, con igual velocidad y sin ventaja diagonal. En modo individual, el rojo sigue al azul por caminos transitables, se esconde con él, esquiva amenazas y prioriza rescatarlo. El impulso dura 0,2 segundos, protege durante ese movimiento y recarga en 3,5 segundos; no atraviesa muros ni agua. Pulsa de nuevo para usarlo: mantener la tecla no lo repite.

Al cambiar de pestaña o salir de la ventana, la partida se pausa para evitar capturas mientras no estás mirando. Las teclas retenidas se liberan al pausar.

## Objetivo y reglas

- Primero activen **todas las runas de jade** de la misión: permanezcan cerca durante 0,65 segundos hasta llenar su barra. Alejarse interrumpe la activación. El sello de la bandera se abre al completar las runas.
- Los **tres tesoros dorados** de cada mapa son opcionales y premian explorar caminos alternativos.
- Hay **una sola bandera**. Al tocarla, uno de los exploradores la lleva de forma visible. La interfaz identifica al portador.
- Los arbustos son transitables y te ocultan automáticamente, incluso si llevas la bandera. Esconderse corta la visión del guardián.
- Los guardianes patrullan, persiguen, buscan y regresan a su territorio. Las paredes bloquean su visión. Los ataques tienen aviso en el suelo y recuperación; los ataques cercanos se turnan. La entrada tiene un círculo seguro.
- El **centinela** golpea un círculo pequeño; el **espíritu** emite un pulso más amplio; el **jaguar** apunta y salta en línea recta; el **Guardián Solar** carga un gran golpe en el último mapa.
- Las trampas del suelo avisan antes de frenar. Puedes evitarlas, esperar o cruzarlas con impulso.
- Al recoger la bandera aumenta un poco la velocidad de persecución y el ritmo de la música: el regreso también es parte del reto.
- Si un ataque de un guardián te alcanza, quedas atrapado en una burbuja. **Una captura individual no consume un intento.** Tampoco hay liberación por tiempo.
- Tu compañero rompe la burbuja permaneciendo **0,6 segundos** cerca, con un camino libre de obstáculos. Una barra muestra el avance. El rescatado recibe **1,5 segundos de protección** y el rescatador **0,8 segundos** para poder salir juntos.
- Si atrapan al portador, la bandera cae en el suelo transitable de su posición. El compañero puede recuperarla al llegar y rescatarlo.
- Solo si **ambos quedan atrapados**, se pierde exactamente un intento. Si quedan intentos, todos vuelven a su posición inicial y se reinician bandera, runas y tesoros. El tiempo y las capturas de la misión se acumulan entre intentos.
- Tras tres capturas dobles aparece **¡MISIÓN FALLIDA!**. Reintentar conserva la misión actual y el modo, y restaura los tres intentos.
- Se completa cada misión cuando la bandera está en manos de un explorador y **ambos están libres y cerca de la entrada**. En las primeras cuatro aparece **¡MISIÓN COMPLETADA!** y el botón **Siguiente misión**, con tres intentos nuevos. La quinta termina con **¡AVENTURA COMPLETADA!**. El avance y los récords se guardan en este navegador. **Continuar** reinicia la misión pendiente con tres intentos; no restaura las posiciones exactas de una partida interrumpida.

## Cinco misiones

| #   | Misión                    | Mapa y reto                                                        | Guardianes |
| --- | ------------------------- | ------------------------------------------------------------------ | ---------- |
| 1   | El Templo Perdido         | Una runa y dos puentes; aprende a esquivar y esconderte.           | 3          |
| 2   | Los Puentes del Río       | Dos runas a ambos lados del río, cruces ampliados y primer jaguar. | 3          |
| 3   | El Jardín de las Estatuas | Dos runas, senderos entre columnas y esporas.                      | 4          |
| 4   | Las Ruinas de la Luna     | Tres runas, canales ramificados y dos espíritus.                   | 5          |
| 5   | El Santuario del Sol      | Tres runas, dos ríos, dos jaguares y el Guardián Solar.            | 6          |

Cada mapa tiene una distribución propia de muros, agua, puentes, arbustos y patrullas. Aumentan el número de objetivos y las combinaciones de enemigos, además de la velocidad, visión y búsqueda de las patrullas. Los exploradores son más rápidos al caminar; el salto anunciado del jaguar es una excepción breve.

La cámara muestra el mapa completo, de 18 × 14 casillas. Resolución interna de 960 × 600, sprites animados, texturas de piedra, agua animada, antorchas y colores por misión. Los muros llevan piedra tallada y musgo; los árboles se encuentran fuera del recinto. No hay palmeras sobre los muros.

## Estrellas, récords y guardado

Cada misión concede una estrella por terminar, otra por encontrar los tres tesoros y otra por terminar sin perder intentos y con un máximo de dos capturas. El tiempo mejora la puntuación, pero no hay cuenta atrás ni se exige correr para conseguir estrellas. Los rescates no otorgan puntos que puedan acumularse repitiendo capturas.

En el menú, elige modalidad en **Récords** y pulsa una misión desbloqueada para repetirla. Se conserva por separado el mejor tiempo, la mejor puntuación y las estrellas máximas de cada misión y modalidad. Completar una misión desbloquea la siguiente.

El guardado es local al navegador y al dispositivo. Si el almacenamiento está bloqueado o dañado, se puede seguir jugando; la interfaz informa cuando no puede guardar. No se sincroniza entre computadoras.

## Música y sonidos

El sonido comienza al pulsar **Jugar**, respetando las reglas del navegador. Abre **♫ Música y sonido** para activar o desactivar música y efectos por separado y ajustar el volumen. Las preferencias se guardan localmente cuando el navegador lo permite. La música se silencia al pausar.

La melodía y armonía originales se sintetizan en el navegador; el tempo y algunos tonos cambian con la misión. Hay efectos para comenzar, esconderse, alerta, captura, rescate, bandera, intento perdido y victoria, además de runas, tesoros, impulso, trampas y avisos de ataque. No se descargan grabaciones ni librerías de audio. Si Web Audio no está disponible, el juego sigue funcionando.

## Archivos principales

| Archivo                             | Responsabilidad                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `index.html`, `styles.css`          | Menú, ayuda, HUD, pausa, victoria, derrota y diseño adaptable.                           |
| `src/main.js`                       | Inicialización y bucle `requestAnimationFrame` con delta time limitado.                  |
| `src/game.js`                       | Estados de partida, interacciones, bandera, rescates e intentos.                         |
| `src/config.js`                     | Velocidades, radios, protección y enumeraciones de estados.                              |
| `src/map.js`, `src/missions.js`     | Cinco mapas, paletas, progresión de dificultad, posiciones y patrullas.                  |
| `src/collisions.js`                 | Colisión con volumen, subpasos, proyección y visión bloqueada por muros.                 |
| `src/navigation.js`                 | Búsqueda BFS y seguimiento de caminos con segmentos seguros.                             |
| `src/ai.js`, `src/entities.js`      | Guardianes, compañero IA y creación de entidades.                                        |
| `src/renderer.js`, `src/sprites.js` | Escenario isométrico, sprites pixelados y partículas.                                    |
| `src/input.js`, `src/ui.js`         | Teclado simultáneo, accesibilidad básica y actualización del HUD.                        |
| `scripts/serve.mjs`                 | Servidor estático sin dependencias.                                                      |
| `tests/game.test.js`                | Pruebas de lógica y recorridos completos.                                                |
| `tests/journey.js`                  | Simula entradas de movimiento para completar ambos modos con guardianes activos.         |
| `tests/browser_smoke.py`            | Controles, interfaces, interacciones y recorridos en Chromium.                           |
| `src/challenges.js`                 | Objetivos, trampas, ajustes de mapas y parámetros de las cuatro clases de enemigos.      |
| `src/progress.js`                   | Guardado local, desbloqueos y mejores marcas por modalidad.                              |
| `tests/expedition.test.js`          | Runas, rescate, impulso, ataques, estrellas, persistencia y rutas con todos los tesoros. |
| `src/audio.js`                      | Música, efectos, volumen y preferencias de sonido.                                       |
| `assets/*.png`                      | Portada y atlas de personajes generados para el estilo elegido.                          |
| `tests/campaign.test.js`            | Accesibilidad de los cinco mapas, progresión y campañas completas.                       |

## Pruebas

Desde la carpeta del proyecto:

```sh
npm test
```

La suite usa `node:test`, integrado en Node. Comprueba rutas alternativas, accesibilidad de todas las casillas transitables, colisiones, velocidad diagonal, controles simultáneos, detección, transiciones de IA, escondites, captura, rescate, protección, bandera, reinicio, derrota y victoria. Incluye campañas completas en ambos modos, con y sin búsqueda de todos los tesoros, conducidas por entradas de movimiento con los guardianes activos y sin teletransportar personajes. También verifica guardado, datos corruptos, señales de ataque, impulso, estrellas y zonas de patrulla.

La prueba de navegador es opcional y necesita Python con Playwright y Chromium. No son dependencias del juego. Con el servidor encendido:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser_smoke.py
```

Si Chromium ya está instalado, omite su descarga y selecciona su ejecutable:

```sh
CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py
```

La prueba genera capturas y `test-results/browser-report.json` en un directorio ignorado por Git. Los recorridos completos del navegador usan entradas simuladas del motor; el movimiento simultáneo, la pausa y los botones se comprueban también mediante eventos reales de teclado y clics de Playwright. Los casos aislados de captura/derrota preparan posiciones controladas para comprobar su presentación.

Consulta [VALIDATION.md](VALIDATION.md) para los resultados ejecutados y [BALANCE.md](BALANCE.md) para el diagnóstico y las decisiones de diseño.

## Arte y alcance

La portada y el atlas pixelado se generaron para este proyecto a partir del estilo elegido por David y Tavito. La geometría del escenario, las partículas, las animaciones y la composición musical se implementan en el código. Los archivos de arte se incluyen en el repositorio y se sirven localmente.

Esta versión se juega con teclado en computadora. No incorpora controles táctiles, multijugador por internet, cuentas ni compras. El guardado de campaña es local al navegador. La dificultad se puede ajustar después de probarla con David y Tavito.
