# Verificación de la versión 1

Validación ejecutada durante la construcción del proyecto, con Node.js **24.19.0**, Python **3.12.14** y Chromium **154.0.8037.57** en Linux.

## Resultados

| Verificación ejecutada | Resultado |
| --- | --- |
| `npm test` | **25 pruebas aprobadas, 0 fallos, 0 omitidas.** |
| `CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py` | **25 comprobaciones aprobadas.** |
| Servidor `npm start` y peticiones a HTML, JavaScript y CSS | HTTP 200 y tipos de contenido correctos. |
| Consola del navegador | Sin errores JavaScript durante los escenarios. |
| Recursos de la página | Sin recursos faltantes; todas las peticiones del juego fueron locales. |
| Presentación | Inspección visual del menú, nivel, ayuda, captura, victoria y página estrecha. |
| Adaptabilidad | Comprobado a 1440, 1024 y 390 píxeles de ancho; sin desbordamiento horizontal. |

## Criterios de aceptación

| # | Escenario | Evidencia |
| --- | --- | --- |
| 1 | Menú al abrir el juego | Chromium: título, botones y captura visual. |
| 2 | Selección de uno o dos jugadores | Clics reales en ambos botones y comprobación del modo. |
| 3 | WASD y flechas simultáneos | Eventos de teclado reales; ambos personajes se desplazan y la página no se mueve. |
| 4 | Interacciones sin teclas adicionales | Pruebas de proximidad para arbustos, bandera y rescate. |
| 5 | Colisiones con paredes y agua | Pruebas de volumen, subpasos y esquinas; ambos recorridos completos verifican posiciones válidas. |
| 6 | Ocultación en arbustos | Estado y aviso del HUD verificados en Chromium. |
| 7 | Los guardianes no detectan ocultos | Prueba de detección en arbusto; los muros también bloquean la visión. |
| 8 | Persecución y pérdida del rastro | Transiciones PATROL → CHASE → SEARCH → RETURN → PATROL. |
| 9 | Captura en burbuja | Contacto real en lógica; burbuja y estado visible en navegador. |
| 10 | Rescate sin gastar intentos | Verificado en lógica y navegador, con 1.5 s de protección. |
| 11 | Compañero IA que sigue y rescata | Cruce de puente para rescatar, escondite compartido y partida individual completa. |
| 12 | Bandera única y recolección automática | Comprobación de portador único, posición y HUD. |
| 13 | Caída y recuperación de bandera | Captura del portador, suelo accesible y recolección por el compañero. |
| 14 | Un intento por captura doble y reinicio | Repetir la comprobación no descuenta más intentos; se restauran exploradores, guardias y bandera. |
| 15 | Derrota al agotar tres intentos | Lógica y pantalla ¡MISIÓN FALLIDA! en Chromium. |
| 16 | Reintento desde cero | Clic real en Reintentar y comprobación de tres intentos y bandera en pedestal. |
| 17 | Victoria con ambos libres en la entrada | Dos recorridos completos y pantalla ¡MISIÓN COMPLETADA! en ambos modos. |
| 18 | Ausencia de bloqueos o errores graves | Ambas partidas completadas y consola sin errores en los escenarios ejecutados. |

## Recorridos completos

Los recorridos de `tests/journey.js` parten de las posiciones normales, mueven a los exploradores a través de `Game.update`, recuperan la bandera y regresan. **Mantienen activos a los tres guardianes**. No cambian posiciones, no desactivan colisiones y no conceden invulnerabilidad extra.

| Modo | Resultado | Capturas individuales | Rescates | Intentos al terminar |
| --- | --- | --- | --- | --- |
| Solo, compañero IA | Victoria | 6 | 6 | 3 |
| Dos jugadores | Victoria | 6 | 6 | 3 |

En modo individual, el segundo personaje usa exclusivamente su IA de seguimiento y rescate. En modo cooperativo, el controlador de prueba suministra movimiento a ambos personajes. Los recorridos usan un paso fijo de 1/60 s y entradas de dirección simuladas; son verificaciones reproducibles del motor, **no una sesión manual de juego realizada por dos personas**. Los botones y el movimiento simultáneo sí se comprobaron con Playwright mediante eventos de teclado y ratón.

Los casos visuales aislados de captura, bandera y derrota colocan entidades en posiciones controladas para reproducirlos. Esto es independiente de los recorridos completos, que parten del inicio real.

## Alcance de esta verificación

- Se ejecutó Chromium. Firefox y Safari no se ejecutaron en este entorno.
- La página se adapta a pantallas estrechas, pero esta versión se juega con teclado en computadora; no incorpora controles táctiles.
- No se realizó una sesión con David y Tavito. Su prueba de juego será útil para ajustar dificultad y legibilidad.
- El juego no necesita audio, cuentas ni servicios de red. La versión actual no incluye audio.
- La configuración de inicio guardada para el entorno es independiente de su publicación. Restaurar la instantánea en una tarea nueva no se ha validado.

Las capturas y el informe JSON completo se generan en `test-results/` al ejecutar la prueba de navegador. Este directorio está ignorado por Git.
