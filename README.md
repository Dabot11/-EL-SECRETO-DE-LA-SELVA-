# El Secreto de la Selva

Una aventura cooperativa de **David y Tavito**, para uno o dos jugadores en la misma computadora. La **versión 2** incluye cinco misiones con mapas distintos, dificultad progresiva, pixel art de aventura, música original y efectos de sonido.

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

Este juego puede publicarse directamente desde la raíz de la rama `main`. No necesita una compilación, una base de datos ni un servidor Node en producción. El archivo `.nojekyll` indica a GitHub Pages que sirva los archivos estáticos tal como están.

En el repositorio `Dabot11/-EL-SECRETO-DE-LA-SELVA-`:

1. Abre **Settings → Pages**.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige la rama **main** y la carpeta **/ (root)**.
4. Pulsa **Save** y espera a que GitHub complete el despliegue de Pages.

La dirección es `https://dabot11.github.io/-EL-SECRETO-DE-LA-SELVA-/`. Los cambios publicados en `main` actualizan la página automáticamente cuando termina el workflow **pages build and deployment** en Actions.

## Controles

| Acción             | Explorador azul                 | Explorador rojo                 |
| ------------------ | ------------------------------- | ------------------------------- |
| Moverse            | W, A, S, D                      | Flechas                         |
| Pausar o continuar | Escape o P                      | Escape o P                      |
| Esconderse         | Entrar en un arbusto            | Entrar en un arbusto            |
| Recoger la bandera | Acercarse a ella                | Acercarse a ella                |
| Rescatar           | Acercarse al compañero atrapado | Acercarse al compañero atrapado |

Las direcciones corresponden a la pantalla: arriba siempre mueve visualmente hacia arriba. Ambos jugadores pueden moverse a la vez, con igual velocidad y sin ventaja diagonal. En modo individual, el rojo sigue al azul por caminos transitables, se esconde con él y prioriza rescatarlo. No hay botones adicionales de interacción.

Al cambiar de pestaña o salir de la ventana, la partida se pausa para evitar capturas mientras no estás mirando. Las teclas retenidas se liberan al pausar.

## Objetivo y reglas

- Hay **una sola bandera**. Al tocarla, uno de los exploradores la lleva de forma visible. La interfaz identifica al portador.
- Los arbustos son transitables y te ocultan automáticamente, incluso si llevas la bandera. Esconderse corta la visión del guardián.
- Los guardianes de piedra y los espíritus patrullan, persiguen, buscan el último lugar donde te vieron y regresan a su patrulla. Las paredes bloquean su visión. Todos respetan muros y agua.
- Si un guardián te alcanza, quedas atrapado en una burbuja. **Una captura individual no consume un intento.** Tampoco hay liberación por tiempo.
- Tu compañero rompe la burbuja al acercarse por un camino libre de obstáculos. El rescatado recibe **1.5 segundos de protección**.
- Si atrapan al portador, la bandera cae en el suelo transitable de su posición. El compañero puede recuperarla al llegar y rescatarlo.
- Solo si **ambos quedan atrapados**, se pierde exactamente un intento. Si quedan intentos, todos vuelven a su posición inicial y la bandera regresa al pedestal.
- Tras tres capturas dobles aparece **¡MISIÓN FALLIDA!**. Reintentar conserva la misión actual y el modo, y restaura los tres intentos.
- Se completa cada misión cuando la bandera está en manos de un explorador y **ambos están libres y cerca de la entrada**. En las primeras cuatro aparece **¡MISIÓN COMPLETADA!** y el botón **Siguiente misión**, con tres intentos nuevos. La quinta termina con **¡AVENTURA COMPLETADA!**. Volver al menú o recargar inicia de nuevo la campaña; el progreso no se guarda entre sesiones.

## Cinco misiones

| #   | Misión                    | Mapa y reto                                           | Guardianes |
| --- | ------------------------- | ----------------------------------------------------- | ---------- |
| 1   | El Templo Perdido         | Río central, dos puentes y escondites para aprender.  | 3          |
| 2   | Los Puentes del Río       | Río transversal, nuevos cruces y rutas de patrulla.   | 3          |
| 3   | El Jardín de las Estatuas | Senderos entre columnas, estanques y pasos estrechos. | 4          |
| 4   | Las Ruinas de la Luna     | Canales ramificados, luz nocturna y dos espíritus.    | 5          |
| 5   | El Santuario del Sol      | Dos ríos, cuatro cruces y seis guardianes.            | 6          |

Cada mapa tiene una distribución propia de muros, agua, puentes, arbustos y patrullas. En cada misión aumentan la velocidad de los guardianes, su alcance de visión y el tiempo que buscan tras perder el rastro. Los exploradores siguen siendo más rápidos y conservan las mismas reglas de rescate.

La cámara muestra el mapa completo, de 18 × 14 casillas. Resolución interna de 960 × 600, sprites animados, texturas de piedra, agua animada, antorchas y colores por misión. Los muros llevan piedra tallada y musgo; los árboles se encuentran fuera del recinto. No hay palmeras sobre los muros.

## Música y sonidos

El sonido comienza al pulsar **Jugar**, respetando las reglas del navegador. Abre **♫ Música y sonido** para activar o desactivar música y efectos por separado y ajustar el volumen. Las preferencias se guardan localmente cuando el navegador lo permite. La música se silencia al pausar.

La melodía y armonía originales se sintetizan en el navegador; el tempo y algunos tonos cambian con la misión. Hay efectos para comenzar, esconderse, alerta, captura, rescate, bandera, intento perdido y victoria. No se descargan grabaciones ni librerías de audio. Si Web Audio no está disponible, el juego sigue funcionando.

## Archivos principales

| Archivo                             | Responsabilidad                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `index.html`, `styles.css`          | Menú, ayuda, HUD, pausa, victoria, derrota y diseño adaptable.                   |
| `src/main.js`                       | Inicialización y bucle `requestAnimationFrame` con delta time limitado.          |
| `src/game.js`                       | Estados de partida, interacciones, bandera, rescates e intentos.                 |
| `src/config.js`                     | Velocidades, radios, protección y enumeraciones de estados.                      |
| `src/map.js`, `src/missions.js`     | Cinco mapas, paletas, progresión de dificultad, posiciones y patrullas.          |
| `src/collisions.js`                 | Colisión con volumen, subpasos, proyección y visión bloqueada por muros.         |
| `src/navigation.js`                 | Búsqueda BFS y seguimiento de caminos con segmentos seguros.                     |
| `src/ai.js`, `src/entities.js`      | Guardianes, compañero IA y creación de entidades.                                |
| `src/renderer.js`, `src/sprites.js` | Escenario isométrico, sprites pixelados y partículas.                            |
| `src/input.js`, `src/ui.js`         | Teclado simultáneo, accesibilidad básica y actualización del HUD.                |
| `scripts/serve.mjs`                 | Servidor estático sin dependencias.                                              |
| `tests/game.test.js`                | Pruebas de lógica y recorridos completos.                                        |
| `tests/journey.js`                  | Simula entradas de movimiento para completar ambos modos con guardianes activos. |
| `tests/browser_smoke.py`            | Controles, interfaces, interacciones y recorridos en Chromium.                   |
| `src/audio.js` | Música, efectos, volumen y preferencias de sonido. |
| `assets/adventure-*.png` | Portada y atlas de personajes generados para el estilo elegido. |
| `tests/campaign.test.js` | Accesibilidad de los cinco mapas, progresión y campañas completas. |

## Pruebas

Desde la carpeta del proyecto:

```sh
npm test
```

La suite usa `node:test`, integrado en Node. Comprueba rutas alternativas, accesibilidad de todas las casillas transitables, colisiones, velocidad diagonal, controles simultáneos, detección, transiciones de IA, escondites, captura, rescate, protección, bandera, reinicio, derrota y victoria. Incluye dos campañas completas de cinco misiones conducidas por entradas de movimiento, con los guardianes activos y sin teletransportar personajes.

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

Consulta `VALIDATION.md` para conocer los resultados efectivamente ejecutados y sus límites.

## Arte y alcance

La portada y el atlas pixelado se generaron para este proyecto a partir del estilo elegido por David y Tavito. La geometría del escenario, las partículas, las animaciones y la composición musical se implementan en el código. Los archivos de arte se incluyen en el repositorio y se sirven localmente.

Esta versión se juega con teclado en computadora. No incorpora controles táctiles, multijugador por internet, cuentas, compras ni guardado de campaña. La dificultad se puede ajustar después de probarla con David y Tavito.
