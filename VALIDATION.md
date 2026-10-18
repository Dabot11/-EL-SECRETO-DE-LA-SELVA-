# Verificación · versión 5.6

Node.js 24.19.0, Python 3.12.14 y Chromium 154.0.8037.57 en Linux.

| Comprobación        | Resultado                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`          | 106 pruebas de reglas, regresión, guardado y recorridos                                                                                                                                                               |
| Prueba de navegador | 199 comprobaciones con Chromium                                                                                                                                                                                       |
| Campaña             | Diez misiones × dos modalidades × con/sin tres tesoros: cuarenta escenarios terminados                                                                                                                                |
| Solo                | Un personaje, tres corazones, protección entre golpes, curación interrumpible, alarma que impide curarse, derrota y reintento                                                                                         |
| Dúo                 | Roles, combo, pases en ambos sentidos, recarga, paredes, distancia, receptor capturado, caída y rescate                                                                                                               |
| Burbuja             | Movimiento lento sin herramientas ni impulso, liana por suelo transitable y canal de rescate                                                                                                                          |
| Puente              | Misión 6: zona norte inaccesible al inicio; salto real carga estatua; luz con caducidad; liana abre ambos pasos; reintento restaura el cierre                                                                         |
| Cuadrícula          | Centros exactos, vecinos cardinales, giro pendiente, repetición, impulso de una casilla, animación y pausa                                                                                                            |
| Cámara y mapas      | Proyección rectangular de cuadrados; diez mapas de 28 × 20, objetivos y patrullas alcanzables                                                                                                                         |
| Ataques             | Casillas avisadas iguales a las de daño; jaguar alineado, pasos cardinales y parada ante obstáculos                                                                                                                   |
| Renderizado         | Caché del suelo cambia al abrir y reiniciar; luces, liana, marcas, vuelo de reliquia y corazones                                                                                                                      |
| Controles           | WASD/flechas simultáneos; Espacio/Shift; E/Q/Enter/F/L; un toque mueve un cuadro, sostener movimiento encadena pasos, última dirección tiene prioridad; mantener habilidad no repite; botones conservan Enter/Espacio |
| Progreso            | Migración v3/v4; expansión v5/v5.1 conserva récords, desbloquea el nivel 6 y respeta el checkpoint; victoria final en el nivel 10                                                                                     |
| Audio               | Señal mediante AnalyserNode, pausa, silencio, efectos independientes, volumen y liberación de voces                                                                                                                   |
| Recursos            | Sin errores JavaScript ni archivos faltantes; recursos del juego locales                                                                                                                                              |
| Diseño              | Vista de juego completa a 1366×768, 1440×900, 1280×720, 1024×768 y 1280×600; menú móvil a 390 px; Retina a escala 2                                                                                                   |

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

## Verificación de la progresión y el regreso

- Una novedad por misión en los primeros siete niveles: centinela, runa, jaguar, espíritu, trampa, mecanismo y Solar. Los niveles 8–10 combinan lo aprendido.
- Las dos primeras misiones se completan en ambos modos solo con movimiento, sin luz, liana, impulso ni pases. La bandera y el regreso siguen siendo obligatorios.
- Avisos y recuperación más generosos al principio; en todas las misiones solo ofrece más tiempo de reacción y recuperación. La persecución con alarma queda por debajo de la velocidad del portador.
- Puntos de vigilancia alcanzables y separados de la entrada. El cambio de patrullas conserva pasos, aturdimientos, casillas de ataque y temporizadores; no revela al portador escondido.
- El aviso de alarma se pausa con la partida. Pasar o recuperar una bandera caída no reinicia la cuenta. Reintentar restaura rutas, mecanismo, objetivos y alarma.
- El navegador comprueba la bandera libre inicial, el contador de alarma, el cambio real de rutas, la restauración al reintentar y las runas pendientes después de abrir el puente de la misión 6.
- Cuarenta comprobaciones visuales de HUD: las diez misiones, ambos modos, a 1366×768 y 1280×600. Objetivo, aviso, contador y botones caben sin superponerse. Se revisan las capturas de las misiones 1, 6 y 10 y del regreso con alarma; la bandera tiene una silueta propia con mástil. Informe: `test-results/progression-layout.json`.
- Los cuarenta escenarios de lógica y los veinte recorridos de navegador completan el regreso con guardianes activos. El puente se abre mediante una embestida real y herramientas en solo y dúo.

## Verificación de las animaciones de enemigos

- Los cuatro tipos recorren patrullas reales en las cuatro direcciones, con cuatro poses; consultar la pose no modifica el estado de la IA.
- El jaguar gira hacia las casillas anunciadas antes de saltar y conserva esa orientación durante el salto y la recuperación. Las casillas de ataque permanecen iguales.
- Aturdimiento, preparación de ataque y recuperación detienen los pasos. El espíritu tiene un ciclo propio de estela que respeta pausa y movimiento reducido.
- El navegador confirma que cargan los cuatro atlas, que cada vista y pose es distinta, que se mueven piernas/estelas y que no se recortan los dibujos.
- Revisión visual de 64 combinaciones de enemigo, dirección y pose, ampliadas y a escala de juego, además de la misión 10 a 1366×768. Capturas: `test-results/enemy-poses.png` y `enemy-mission-10.png`.
- Carga normal, imagen del jaguar bloqueada y los cuatro atlas nuevos bloqueados: los demás recursos cargan independientemente, las patrullas siguen funcionando, la pausa congela el Canvas y no hay errores JavaScript. Con movimiento reducido se conserva la orientación y se omiten los ciclos. Informe: `test-results/enemy-extra.json`.

## Verificación de la caminata direccional

- WASD y flechas reales prueban las cuatro direcciones de ambos exploradores; la orientación se mantiene al terminar cada casilla.
- Tres pruebas nuevas de lógica verifican alternancia de pies, transición entre pasos, giros, reposo y velocidades normal/ralentizada/impulso, sin modificar la partida desde el dibujo.
- El navegador confirma que las piernas de las poses de reposo y de ambas zancadas son distintas en los dos colores y las cuatro vistas.
- Revisión visual de las 32 combinaciones de vista/color/pose (incluido el perfil izquierdo reflejado), en tamaño de juego y ampliadas. Dibujos alineados por el sombrero; las botas se recortan completas.
- Las pruebas detectaron que dos filas del nuevo atlas estaban demasiado próximas para el recorte inicial. Se ajustó la detección de espacios transparentes y se comprobó la carga del atlas completo.
- Con movimiento reducido, sigue cambiando la orientación aunque se omite la animación de piernas. La pausa conserva la imagen exacta.
- Si falla la imagen nueva, el juego conserva vistas direccionales de respaldo. Comprobación con carga bloqueada, teclado y pausa en `test-results/walk-extra.json`.

## Verificación de UI, gráficos y animaciones

- Cuarenta revisiones de composición: los diez niveles, solo y dúo, a 1366×768 y 1280×600. Objetivos, mensajes y controles caben fuera del mapa sin superponerse.
- Diez vistas previas distintas de la campaña, con selección y récords por modalidad.
- Capturas revisadas de menú, regiones de selva/luna/cristal/corazón, paneles, ayuda, efectos, pausa y resultados.
- Comparación del Canvas antes y después de esperar en pausa: imagen idéntica, incluidos agua, vegetación y partículas.
- Con `prefers-reduced-motion: reduce`, la decoración permanece estática, una pulsación sigue moviendo exactamente una casilla y la recarga sigue visible.
- Dibujar 150 fotogramas no modifica jugadores, guardianes ni reliquia. Medición local del dibujo de la misión 10: mediana 0,3 ms y percentil 95 de 1 ms; no incluye toda la canalización gráfica ni garantiza rendimiento en otros equipos.
- Informe adicional: `test-results/polish-review.json`, con 45 comprobaciones y ningún error JavaScript.
- Se corrigió el orden de capas para que los avisos de ataque permanezcan por encima de hojas y objetos.

## Verificación de la expansión

- Veinte recorridos de campaña en el navegador, con guardianes activos; cuarenta escenarios de lógica incluyendo todos los tesoros.
- Veinte revisiones adicionales de HUD: mapas 6–10, solo/dúo y ventanas de 1366×768 y 1280×600, sin controles ni mensajes superpuestos. Informe en `test-results/expansion-layout.json`.
- La campaña antigua de cinco niveles conserva sus récords y ofrece Continuar desde el sexto; una misión pendiente anterior tiene prioridad.
- La lista muestra 10 destinos, la numeración termina en 10 y los desbloqueos siguen separados por modalidad.
- La simulación coopera manteniendo una casilla de separación y espera antes de entrar en avisos de ataque. Usa las mismas reglas y herramientas del juego.

## Correcciones encontradas durante la integración

- Jaguar que podía repetir un ataque diagonal sin alcanzar al jugador: ahora se alinea antes de avisar.
- Liana que detenía la burbuja un cuadro antes de llegar al alcance de rescate.
- Se adaptaron posiciones y expectativas de las pruebas anteriores a los mapas ampliados y al movimiento discreto.
- Se conservaron las comprobaciones de roles, progreso, herramientas, rescates, derrota y victoria; se añadieron pruebas específicas de cuadrícula y teclado.
- El mapa se amplía uniformemente al máximo disponible y el HUD queda en un panel lateral fuera del terreno.
- Entrar/salir de pantalla completa, redimensionar en pausa y volver al menú conservan el estado correcto.
- El menú inicial ya no corta sus botones en ventanas de 600 px de altura.

## Límites

Las pruebas comprueban reglas, rutas y presentación; la diversión y dificultad necesitan prueba con David y Tavito. Esta versión rebalancea las diez misiones y añade rutas de regreso tras la alarma. Las pruebas no determinan si la dificultad resulta adecuada o divertida para Tavito; esa valoración requiere jugar con él. Safari y Firefox no se probaron. La vista estrecha se adapta, pero el juego requiere teclado. El guardado sigue siendo local y Continuar reinicia la misión pendiente. La prueba de audio verifica síntesis y volumen, no una evaluación auditiva humana.
