# Verificación de la versión 2

Ejecutada con Node.js **24.19.0**, Python **3.12.14** y Chromium **154.0.8037.57** en Linux.

| Comprobación                                                     | Resultado                                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                       | **32 pruebas aprobadas, 0 fallos, 0 omitidas.**                                                                  |
| `CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py` | **67 comprobaciones aprobadas.**                                                                                 |
| Campaña completa                                                 | Los cinco mapas completados en modo individual y cooperativo.                                                    |
| Movimiento y colisiones                                          | Ida y vuelta físicas por cada mapa, sin atravesar muros ni agua.                                                 |
| Accesibilidad de mapas                                           | Todas las casillas transitables y puntos de patrulla alcanzables.                                                |
| Dificultad                                                       | Velocidad, detección y búsqueda crecientes; todos los guardianes más lentos que el jugador.                      |
| Progresión                                                       | Avance real por el botón Siguiente misión, tres intentos nuevos y victoria final solo tras el quinto mapa.       |
| Reintentos                                                       | Captura doble y derrota no cambian de mapa; reintentar conserva misión y modo.                                   |
| Controles                                                        | WASD y flechas simultáneos, pausa y botones mediante eventos reales de Playwright.                               |
| Audio                                                            | AudioContext activado por gesto; señal de salida medida con AnalyserNode; música, efectos y volumen comprobados. |
| Preferencias                                                     | Música/efectos/volumen conservados al recargar, sin reproducción previa al gesto.                                |
| Recursos y consola                                               | Sin recursos faltantes ni errores JavaScript; todos los recursos del juego fueron locales.                       |
| Adaptabilidad                                                    | Sin desbordamiento a 1440, 1366, 1024 y 390 px; juego completo visible a 1366×768 y 1024×768.                    |
| Presentación                                                     | Inspección visual del menú, los cinco mapas, captura, resultado final y diseños estrechos.                       |

## Campañas reproducibles

`tests/journey.js` mueve personajes mediante `Game.update`, sin modificar sus posiciones, desactivar guardianes ni conceder invulnerabilidad adicional. En modo individual, el segundo explorador usa exclusivamente la IA real. En modo cooperativo, el controlador de pruebas proporciona direcciones a los dos personajes.

Las campañas recuperan las cinco banderas, rescatan compañeros y regresan juntos en cada mapa. El navegador usa clics reales para avanzar entre misiones y comprueba la pantalla de resultado. Los escenarios aislados de captura y derrota usan posiciones controladas; son independientes de los recorridos completos.

La suite conserva las pruebas anteriores de escondites, protección, bandera caída, visión bloqueada por paredes, estados de guardianes, rescate sin atravesar muros y movimiento diagonal normalizado.

## Verificación del audio

Se midió una señal distinta de cero para música y efectos. Se comprobó silencio al pausar, desactivar ambas opciones y llevar el volumen a cero. Los efectos funcionan sin música. El control de volumen responde a las flechas sin mover a los personajes. Las voces terminadas se liberan tras detener nuevas emisiones. Esto verifica el funcionamiento de la síntesis, no una evaluación auditiva humana.

## Límites

- Los recorridos son automatizados; no sustituyen la prueba de dificultad con David y Tavito.
- Se ejecutó Chromium; Safari y Firefox no se ejecutaron.
- La pantalla estrecha se revisó visualmente; el juego requiere teclado.
- El progreso de campaña vive en memoria y se reinicia al recargar. Solo se guardan las preferencias de audio.
- Las pruebas de juego se ejecutaron contra el servidor local. El resultado de publicación se verifica por separado en GitHub Actions.

Las capturas y `test-results/browser-report.json` se generan al ejecutar la prueba de navegador. Este directorio está ignorado por Git.
