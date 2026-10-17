# Verificación · versión 5

Node.js 24.19.0, Python 3.12.14 y Chromium 154.0.8037.57 en Linux.

| Comprobación        | Resultado                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`          | 88 pruebas de reglas, regresión, guardado y recorridos                                                                                                                                                                |
| Prueba de navegador | 109 comprobaciones con Chromium                                                                                                                                                                                       |
| Campaña             | Cinco misiones × dos modalidades × con/sin tres tesoros: veinte escenarios terminados                                                                                                                                 |
| Solo                | Un personaje, tres corazones, protección entre golpes, curación interrumpible, alarma que impide curarse, derrota y reintento                                                                                         |
| Dúo                 | Roles, combo, pases en ambos sentidos, recarga, paredes, distancia, receptor capturado, caída y rescate                                                                                                               |
| Burbuja             | Movimiento lento sin herramientas ni impulso, liana por suelo transitable y canal de rescate                                                                                                                          |
| Puente              | Isla inaccesible al inicio; salto real carga estatua; luz con caducidad; liana abre ambos pasos; reintento restaura el cierre                                                                                         |
| Cuadrícula          | Centros exactos, vecinos cardinales, giro pendiente, repetición, impulso de una casilla, animación y pausa                                                                                                            |
| Cámara y mapas      | Proyección rectangular de cuadrados; cinco mapas de 28 × 20, objetivos y patrullas alcanzables                                                                                                                        |
| Ataques             | Casillas avisadas iguales a las de daño; jaguar alineado, pasos cardinales y parada ante obstáculos                                                                                                                   |
| Renderizado         | Caché del suelo cambia al abrir y reiniciar; luces, liana, marcas, vuelo de reliquia y corazones                                                                                                                      |
| Controles           | WASD/flechas simultáneos; Espacio/Shift; E/Q/Enter/F/L; un toque mueve un cuadro, sostener movimiento encadena pasos, última dirección tiene prioridad; mantener habilidad no repite; botones conservan Enter/Espacio |
| Progreso            | Migración v3/v4 conserva desbloqueos y copia anterior; nuevos récords separados; continuar y rejugar por modalidad                                                                                                    |
| Audio               | Señal mediante AnalyserNode, pausa, silencio, efectos independientes, volumen y liberación de voces                                                                                                                   |
| Recursos            | Sin errores JavaScript ni archivos faltantes; recursos del juego locales                                                                                                                                              |
| Diseño              | Sin desbordamiento a 1366, 1024 y 390 px; escena completa en pantallas de portátil                                                                                                                                    |

## Cómo reproducir

```sh
npm test
npm start
```

Con el servidor iniciado y Python Playwright/Chromium disponibles, en otra terminal:

```sh
CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py
```

El navegador usa clics y eventos de teclado reales para controles. Los recorridos completos se dirigen mediante entradas de `Game.update`; no son una grabación de pulsaciones físicas. Las pruebas aisladas preparan posiciones controladas para comprobar una regla, separadas de las campañas completas sin alteraciones de posición o protección.

Las capturas y el informe JSON se generan en `test-results/`, ignorado por Git. Se inspeccionan menú, ayuda, solo, dúo, puente, combos, pases y resultados. El servidor local verifica comportamiento; GitHub Actions vuelve a ejecutar las pruebas de Node antes de publicar. El despliegue se contrasta aparte con los archivos del sitio público.

## Correcciones encontradas durante la integración

- Jaguar que podía repetir un ataque diagonal sin alcanzar al jugador: ahora se alinea antes de avisar.
- Liana que detenía la burbuja un cuadro antes de llegar al alcance de rescate.
- Se adaptaron posiciones y expectativas de las pruebas anteriores a los mapas ampliados y al movimiento discreto.
- Se conservaron las comprobaciones de roles, progreso, herramientas, rescates, derrota y victoria; se añadieron pruebas específicas de cuadrícula y teclado.
- El HUD se comprueba fuera de las casillas transitables superiores en pantallas de portátil.

## Límites

Las pruebas comprueban reglas, rutas y presentación; la diversión y dificultad necesitan prueba con David y Tavito. Esta versión amplía los cinco mapas y adapta sus movimientos y ataques, conservando los objetivos actuales. Safari y Firefox no se probaron. La vista estrecha se adapta, pero el juego requiere teclado. El guardado sigue siendo local y Continuar reinicia la misión pendiente. La prueba de audio verifica síntesis y volumen, no una evaluación auditiva humana.
