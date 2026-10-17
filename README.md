# El Secreto de la Selva

Una aventura cooperativa de **David y Tavito**, para uno o dos jugadores en la misma computadora. Exploren **El Templo Perdido**, recuperen la única bandera roja y vuelvan juntos a la entrada. Un nivel completo con inicio, victoria, derrota y tres intentos compartidos.

Hecho con HTML, CSS y JavaScript moderno sobre Canvas 2D. Los sprites, árboles, ruinas, agua y efectos son originales y se dibujan localmente. **No necesita cuentas, servicios externos, conexión a internet ni instalar paquetes para jugar.**

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

La dirección prevista es `https://dabot11.github.io/-EL-SECRETO-DE-LA-SELVA-/`. Esa dirección solo estará disponible después de habilitar Pages y terminar correctamente el despliegue. Los siguientes cambios publicados en `main` actualizarán la página automáticamente.

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
- Los dos guardianes de piedra y el espíritu patrullan, persiguen, buscan el último lugar donde te vieron y regresan a su patrulla. Las paredes bloquean su visión. Todos respetan muros y agua.
- Si un guardián te alcanza, quedas atrapado en una burbuja. **Una captura individual no consume un intento.** Tampoco hay liberación por tiempo.
- Tu compañero rompe la burbuja al acercarse por un camino libre de obstáculos. El rescatado recibe **1.5 segundos de protección**.
- Si atrapan al portador, la bandera cae en el suelo transitable de su posición. El compañero puede recuperarla al llegar y rescatarlo.
- Solo si **ambos quedan atrapados**, se pierde exactamente un intento. Si quedan intentos, todos vuelven a su posición inicial y la bandera regresa al pedestal.
- Tras tres capturas dobles aparece **¡MISIÓN FALLIDA!**. Reintentar empieza otra partida con tres intentos.
- Se gana cuando la bandera está en manos de un explorador y **ambos están libres y cerca de la entrada**. Entonces aparece **¡MISIÓN COMPLETADA!** y la celebración.

## El primer nivel

Mapa de 18 × 14 casillas con proyección isométrica, siete grupos de arbustos, muros cubiertos de musgo, antorchas, un río y **dos puentes que permiten rutas alternativas**. El campamento de entrada está a la izquierda y el pedestal al otro lado del río. La cámara mantiene el nivel completo a la vista.

El juego usa resolución interna de 768 × 432, escalado nítido y orden de dibujo por profundidad. Los personajes tienen animaciones de caminar, reposo, ocultación, captura, rescate y celebración. Esta versión es silenciosa; el audio es opcional para una versión futura.

## Archivos principales

| Archivo                             | Responsabilidad                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `index.html`, `styles.css`          | Menú, ayuda, HUD, pausa, victoria, derrota y diseño adaptable.                   |
| `src/main.js`                       | Inicialización y bucle `requestAnimationFrame` con delta time limitado.          |
| `src/game.js`                       | Estados de partida, interacciones, bandera, rescates e intentos.                 |
| `src/config.js`                     | Velocidades, radios, protección y enumeraciones de estados.                      |
| `src/map.js`                        | Mapa lógico, posiciones iniciales, arbustos y patrullas.                         |
| `src/collisions.js`                 | Colisión con volumen, subpasos, proyección y visión bloqueada por muros.         |
| `src/navigation.js`                 | Búsqueda BFS y seguimiento de caminos con segmentos seguros.                     |
| `src/ai.js`, `src/entities.js`      | Guardianes, compañero IA y creación de entidades.                                |
| `src/renderer.js`, `src/sprites.js` | Escenario isométrico, sprites pixelados y partículas.                            |
| `src/input.js`, `src/ui.js`         | Teclado simultáneo, accesibilidad básica y actualización del HUD.                |
| `scripts/serve.mjs`                 | Servidor estático sin dependencias.                                              |
| `tests/game.test.js`                | Pruebas de lógica y recorridos completos.                                        |
| `tests/journey.js`                  | Simula entradas de movimiento para completar ambos modos con guardianes activos. |
| `tests/browser_smoke.py`            | Controles, interfaces, interacciones y recorridos en Chromium.                   |

## Pruebas

Desde la carpeta del proyecto:

```sh
npm test
```

La suite usa `node:test`, integrado en Node. Comprueba rutas alternativas, accesibilidad de todas las casillas transitables, colisiones, velocidad diagonal, controles simultáneos, detección, transiciones de IA, escondites, captura, rescate, protección, bandera, reinicio, derrota y victoria. Incluye dos partidas completas conducidas por entradas de movimiento, con los guardianes activos y sin teletransportar personajes.

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

## Ideas opcionales para una versión 2

El nivel y sus reglas ya están implementados. Estas mejoras **no forman parte de la versión actual**:

- Música ambiental y sonidos sintetizados, con control de volumen.
- Más fotogramas de animación y variaciones visuales de ruinas y vegetación.
- Soporte de mandos y reasignación de controles.
- Ajustes de contraste y de tamaño de texto para accesibilidad.
- Una ronda de pruebas con David y Tavito para ajustar la dificultad conservando las reglas.

No hay multijugador por internet, combate, cuentas, compras ni servicios de guardado.
