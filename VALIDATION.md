# Verificación de la versión 3

Ejecutada con Node.js **24.19.0**, Python **3.12.14** y Chromium **154.0.8037.57** en Linux.

| Comprobación                                                     | Resultado                                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                       | **56 pruebas aprobadas, 0 fallos, 0 omitidas.**                                                                                                 |
| `CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py` | **90 comprobaciones aprobadas.**                                                                                                                |
| Campañas                                                         | Cinco mapas terminados en ambos modos, con y sin buscar los tres tesoros: 20 escenarios.                                                        |
| Mapas                                                            | Casillas transitables, patrullas, runas, tesoros y trampas alcanzables.                                                                         |
| Colisiones                                                       | Movimiento y saltos respetan agua, muros y esquinas; la embestida no desliza ni sobrepasa su aviso.                                             |
| Enemigos                                                         | Aviso previo, dirección fija del jaguar, recuperación, territorio, turnos de ataque cercanos y base segura.                                     |
| Objetivos                                                        | Sello de la bandera, carga interrumpible de runas, tesoros cobrados una vez y reinicio de intento.                                              |
| Cooperación                                                      | Rescate de 0,6 s, interrupción por distancia, protección compartida y rescate por puente sin teletransporte.                                    |
| Compañero IA                                                     | Escondite, impulso con recarga real, salida de amenazas, espera ante ataques y penalización de bandera.                                         |
| Teclado                                                          | Movimiento simultáneo, impulso independiente, mantener la tecla no lo repite; pausa, botones y volumen accesibles.                              |
| Guardado                                                         | Récords y desbloqueos por modalidad, continuar tras recargar y selección de mapas. Datos corruptos o almacenamiento bloqueado no impiden jugar. |
| Resultados                                                       | Estrellas por criterios distintos, puntos sin explotación de rescates, reloj detenido durante la pausa.                                         |
| Audio                                                            | Señal medida con AnalyserNode, silencio, efectos independientes, volumen y liberación de voces.                                                 |
| Recursos                                                         | Atlas original y nuevo cargados; sin errores JavaScript ni recursos faltantes.                                                                  |
| Adaptabilidad                                                    | Sin desbordamiento a 1366, 1024 y 390 px; menú dentro de la escena y juego visible en pantallas de portátil.                                    |

## Recorridos reproducibles

`tests/journey.js` mueve personajes mediante `Game.update`, sin modificar sus posiciones, desactivar guardianes ni conceder protección adicional. En modo individual, el rojo utiliza la IA del juego. El controlador dirige al azul hacia las runas, la bandera y la entrada; opcionalmente incluye todos los tesoros. Esquiva avisos con las habilidades normales y prioriza rescatar. En cooperativo dirige a los dos exploradores.

Node prueba la campaña continua, incluida la transición entre mapas. En el navegador se comprueban los botones de avance, modalidad y restauración de intentos; cada recorrido automatizado comienza mediante `Game.start` para que el tiempo dedicado a capturas de pantalla no altere los encuentros. Las pruebas aisladas de captura y derrota preparan posiciones controladas; están separadas de las campañas completas.

Los eventos de teclado y los clics son reales en las pruebas de controles. El recorrido de una misión utiliza entradas simuladas del motor y no pulsaciones físicas durante toda la campaña.

## Revisión visual y sonora

Se inspeccionaron capturas del menú, juego, cinco mapas, ayuda, resultado, tarjetas de monstruos y diseños de portátil/móvil. El recorte del espíritu ya no incluye parte del arbusto vecino. El jaguar y el Guardián Solar tienen sprites propios. Las runas, tesoros y barras de rescate/ataque se integran en el mapa isométrico.

La prueba de audio mide señal distinta de cero, silencio al pausar o silenciar, efectos sin música y volumen controlable con teclado. Esto verifica la síntesis; no constituye una evaluación auditiva humana.

## Límites

- La simulación verifica reglas y rutas; la dificultad y diversión requieren prueba con David y Tavito. [BALANCE.md](BALANCE.md) detalla los resultados y la calibración pendiente con personas.
- Se ejecutó Chromium; Safari y Firefox no se probaron.
- La pantalla estrecha se revisó visualmente; el juego requiere teclado de computadora.
- Guardado local por navegador y dispositivo. Continuar reinicia la misión pendiente, sin restaurar posiciones exactas.
- Las pruebas de juego se ejecutan en el servidor local. GitHub Actions vuelve a ejecutar la suite de Node antes de desplegar; la publicación se verifica aparte contra los archivos públicos.

Las capturas y `test-results/browser-report.json` se generan al ejecutar la prueba de navegador. Los informes de balance y capturas están en `test-results/`, ignorado por Git.
