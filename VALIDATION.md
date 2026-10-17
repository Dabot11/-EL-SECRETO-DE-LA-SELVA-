# Verificación · versión 4

Node.js 24.19.0, Python 3.12.14 y Chromium 154.0.8037.57 en Linux.

| Comprobación        | Resultado                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm test`          | 70 pruebas de reglas, regresión, guardado y recorridos                                                                        |
| Prueba de navegador | 103 comprobaciones con Chromium                                                                                               |
| Campaña             | Cinco misiones × dos modalidades × con/sin tres tesoros: veinte escenarios terminados                                         |
| Solo                | Un personaje, tres corazones, protección entre golpes, curación interrumpible, alarma que impide curarse, derrota y reintento |
| Dúo                 | Roles, combo, pases en ambos sentidos, recarga, paredes, distancia, receptor capturado, caída y rescate                       |
| Burbuja             | Movimiento lento sin herramientas ni impulso, liana por suelo transitable y canal de rescate                                  |
| Puente              | Isla inaccesible al inicio; salto real carga estatua; luz con caducidad; liana abre ambos pasos; reintento restaura el cierre |
| Renderizado         | Caché del suelo cambia al abrir y reiniciar; luces, liana, marcas, vuelo de reliquia y corazones                              |
| Controles           | WASD/flechas simultáneos; Espacio/Shift; E/Q/Enter/F/L; mantener tecla no repite; botones conservan Enter/Espacio             |
| Progreso            | Migración v3 conserva desbloqueos y copia anterior; nuevos récords separados; continuar y rejugar por modalidad               |
| Audio               | Señal mediante AnalyserNode, pausa, silencio, efectos independientes, volumen y liberación de voces                           |
| Recursos            | Sin errores JavaScript ni archivos faltantes; recursos del juego locales                                                      |
| Diseño              | Sin desbordamiento a 1366, 1024 y 390 px; escena completa en pantallas de portátil                                            |

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

- Referencias del HUD antiguo a un segundo personaje inexistente en solitario.
- Identificadores de controles nuevos que no coincidían con el HTML.
- Suelo cacheado que debía invalidarse al abrir y reiniciar el puente.
- Animación de pase que debía limpiarse si capturaban al receptor.
- Un mecanismo cerrado o un tesoro opcional podía impedir completar un combo; la selección de objetivos ahora da prioridad al rescate y al guardián marcado.
- Las herramientas se bloquean durante pausa, derrota, reinicio y captura.
- Migración de puntuaciones: conservar desbloqueos sin comparar récords obtenidos bajo reglas diferentes.

## Límites

Las pruebas comprueban reglas, rutas y presentación; la diversión y dificultad necesitan prueba con David y Tavito. La nueva misión es el prototipo del diseño: no se han creado cuatro rompecabezas equivalentes para el resto de la campaña. Safari y Firefox no se probaron. La vista estrecha se adapta, pero el juego requiere teclado. El guardado sigue siendo local y Continuar reinicia la misión pendiente. La prueba de audio verifica síntesis y volumen, no una evaluación auditiva humana.
