# El Secreto de la Selva

Una aventura de **David y Tavito**, para uno o dos jugadores en la misma computadora.

**Versión 5.5:** los cuatro enemigos también tienen frente, espalda y perfiles con ciclos propios: pasos de piedra, zancadas del jaguar y estela animada del espíritu. Se orientan con cada paso; el jaguar mira hacia su salto anunciado y los guardianes dejan de caminar al preparar un ataque o quedar aturdidos. Los dos exploradores conservan su caminata direccional.

Los enemigos, sus patrullas y sus embestidas también avanzan por casillas. Los avisos muestran los cuadros que puede golpear cada ataque. La cámara mantiene el mapa completo visible para ambos jugadores.

[Jugar en GitHub Pages](https://dabot11.github.io/-EL-SECRETO-DE-LA-SELVA-/)

HTML, CSS y JavaScript sobre Canvas 2D, con pixel art de aventura y música sintetizada mediante Web Audio. El juego no necesita cuentas ni dependencias externas. Requiere teclado de computadora.

## Pantalla de juego

Al iniciar una partida en laptop, el tablero ocupa toda la ventana y se ajusta al mayor tamaño posible sin cortar el mapa ni deformar las casillas. Los objetivos, vidas, sonido y controles quedan en un panel lateral compacto. El botón **Pantalla completa** oculta también las barras del navegador cuando está disponible. Pausar y avanzar de misión conservan la vista ampliada; **Menú principal** recupera la página y sale de pantalla completa.

## Arte y animaciones

- La campaña muestra una miniatura de la geometría de cada destino, su dificultad, disponibilidad y récords.
- El panel separa misión, etapas **Abre → Recoge → Vuelve**, vidas y habilidades. Cada herramienta muestra su tecla, cuenta regresiva y barra de recarga; el pase se habilita visualmente para el portador.
- Suelos con variaciones, piedra agrietada, musgo, puentes con tablones y orillas sombreadas. Cada región mantiene su propia paleta.
- Los exploradores usan 24 dibujos: frente, espalda y perfil, con cuatro poses por vista y color; el perfil izquierdo refleja el derecho. El ciclo alterna piernas por casilla y conserva su ritmo al llevar la reliquia, ralentizarse o usar el impulso. La cabeza mantiene un anclaje estable.
- Pasos con movimiento de piernas y polvo, estelas de impulso, anticipación de ataques, espíritus flotantes, vegetación, agua y antorchas animadas. Los avisos de ataque se dibujan sobre la vegetación y conservan sus casillas exactas.
- Efectos y mensajes breves distintos para runas, tesoros, combos, golpes, curación y rescates.
- La pausa congela también el escenario. Se respeta **Reducir movimiento** del sistema: desaparecen balanceos, estelas y partículas decorativas; los controles y avisos esenciales siguen funcionando.

El terreno y la iluminación fija se dibujan una vez por mapa y se regeneran al abrir o reiniciar el puente. Las animaciones no modifican posiciones lógicas, colisiones ni tiempos de ataque. No se añaden descargas externas ni dependencias.

## Ejecutar

Con Node.js 20 o posterior, desde esta carpeta:

```sh
npm start
```

Abre `http://localhost:8080`. No hace falta `npm install`. `Ctrl+C` detiene el servidor. Puedes usar `PORT=8081 npm start` en macOS/Linux si el puerto está ocupado.

Alternativa: `python3 -m http.server 8080` —o `py -m http.server 8080` en Windows— desde la raíz del proyecto. No abras `index.html` con doble clic: los módulos JavaScript necesitan un servidor.

## Elegir modalidad

|              | Solo                                                                           | Dos jugadores                                                              |
| ------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Personajes   | Un explorador, sin compañero automático                                        | Azul y rojo, controlados por personas                                      |
| Herramientas | El explorador tiene linterna y liana                                           | Azul lleva linterna; rojo lleva liana                                      |
| Daño         | Tres corazones, con 1,7 s de protección tras un golpe                          | Una captura te encierra en una burbuja que puedes mover                    |
| Recuperación | Descansa 2 s en la entrada antes de tomar la reliquia para recuperar corazones | Acérquense durante 0,6 s para rescatar; la liana puede acercar una burbuja |
| Derrota      | Perder los tres corazones                                                      | Agotar tres intentos; solo se gasta uno si ambos están atrapados           |
| Victoria     | Volver a la entrada con la reliquia                                            | Ambos libres en la entrada, con la reliquia                                |

Reintentar reinicia la misión actual y restaura corazones o intentos. En solitario hay un guardián menos por mapa, caminan un 8 % más lento y avisan sus ataques un 15 % más de tiempo. El Guardián Solar sigue presente en el último mapa.

## Controles

| Acción                     | Solo / azul           | Rojo, en dúo  |
| -------------------------- | --------------------- | ------------- |
| Moverse o rodar en burbuja | WASD                  | Flechas       |
| Impulso al moverse         | Espacio               | Shift derecho |
| Linterna                   | E                     | —             |
| Liana                      | Q, solo en individual | Enter         |
| Pasar la reliquia          | F, solo en dúo        | L             |
| Pausar o continuar         | Escape o P            | Escape o P    |

Una pulsación mueve **un cuadro completo** hacia arriba, abajo, izquierda o derecha. Mantener la tecla encadena pasos. Si pulsas otra dirección durante un paso, el giro espera al siguiente cuadro. Si sostienes dos teclas, manda la última que pulsaste. No hay diagonales ni deslizamientos por las esquinas.

El **impulso** es un paso rápido de una casilla, con protección durante ese paso y recarga de 3,5 s. No atraviesa agua ni muros; intentar usarlo contra un obstáculo no gasta la recarga. El HUD muestra cuándo están disponibles las herramientas. Mantener una tecla de habilidad no la repite. Cambiar de pestaña pausa la partida y descarta órdenes de movimiento pendientes.

## Luz, liana y cooperación

- La **linterna** interrumpe a guardianes próximos y los marca. La **liana sobre un guardián marcado** lo inmoviliza durante 2,2 s: en solitario encadenas E y Q; en dúo coordinas E y Enter.
- La liana también recupera tesoros y la reliquia cuando su sello está abierto. Prioriza rescatar a un cautivo, abrir un mecanismo iluminado y completar un combo antes de buscar objetos. Los muros bloquean herramientas y pases.
- En dúo, el portador tarda más entre pasos: su velocidad baja un 22 % y atrae más la atención de los guardianes. **F / L** pasa la reliquia al compañero a hasta cuatro casillas, incluso sobre agua. El receptor obtiene 0,45 s de protección; entre pases hay 0,8 s de espera. En solitario la penalización al cargar es del 7 %.
- Una burbuja puede rodar casilla por casilla, lentamente y por suelo transitable, sin herramientas ni impulso. Rojo puede acercar la burbuja azul con la liana cuando hay un camino libre. Azul puede interrumpir al guardián con luz para acercarse a rescatar al rojo. Permanecer juntos 0,6 s completa el rescate; alejarse interrumpe la barra.
- El rescatado recibe 1,5 s de protección y quien lo libera 0,8 s. Capturar al portador en dúo deja la reliquia en el suelo; en solitario un golpe consume un corazón y se conserva la reliquia.

## Diez misiones

| #   | Misión                      | Objetivo                                                                                          | Guardianes solo / dúo |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | El Puente del Jaguar        | Atraer un salto hacia la estatua, iluminar el mecanismo y tirar con la liana para abrir los pasos | 2 / 3                 |
| 2   | Los Puentes del Río         | Dos runas a ambos lados del río y cruces con niebla                                               | 2 / 3                 |
| 3   | El Jardín de las Estatuas   | Dos runas, senderos entre columnas y esporas                                                      | 3 / 4                 |
| 4   | Las Ruinas de la Luna       | Tres runas, canales y espíritus                                                                   | 4 / 5                 |
| 5   | El Santuario del Sol        | Tres runas, dos ríos y el Guardián Solar                                                          | 5 / 6                 |
| 6   | El Pantano de la Niebla     | Tres runas, tres orillas y cruces alternativos entre niebla                                       | 5 / 6                 |
| 7   | Las Canteras del Ámbar      | Tres runas, corredores entre muros y esporas                                                      | 6 / 7                 |
| 8   | La Laguna de Cristal        | Cuatro runas repartidas entre islas y pasos con hielo                                             | 6 / 7                 |
| 9   | La Fortaleza de las Espinas | Cuatro runas exteriores, puertas vigiladas y un patio central                                     | 7 / 8                 |
| 10  | El Corazón de la Selva      | Cuatro runas, una isla central con cuatro accesos y dos Guardianes Solares                        | 8 / 9                 |

En la primera misión, coloca la estatua entre el jaguar y tú: cuando aparezca la dirección de su salto, esquiva a un lado. Tras el impacto, acércate al mecanismo del puente. Ilumínalo y usa la liana antes de que se apague: tienes 8 s en solitario y 4 s en dúo. La estatua permanece cargada hasta reiniciar el intento.

En los otros mapas, permanece 0,65 s cerca de cada runa para abrir el sello. Los tres tesoros dorados por misión son opcionales. Después recupera la reliquia y regresa a la entrada. Tomarla activa una alarma: aumenta la persecución y acelera la música; el campamento deja de curar.

Los arbustos ocultan automáticamente. Los guardianes anuncian los ataques en el suelo, se recuperan después y persiguen dentro de su territorio. El centinela marca una cruz corta, el jaguar se alinea y recorre hasta tres cuadros en una fila o columna, el espíritu marca un área de hasta dos pasos y el Solar prepara una zona cuadrada de hasta 5 × 5. Los muros bloquean los avisos y los golpes. Las trampas avisan antes de frenar. No hay límite de tiempo.

## Progreso y estrellas

Cada misión concede una estrella por terminar, otra por reunir los tres tesoros y otra por una expedición limpia: **máximo un golpe en solitario**, o **máximo dos capturas sin perder intentos en dúo**. Curarse no borra golpes. Pases, rescates y combos no permiten acumular puntos repitiéndolos.

El menú permite repetir misiones desbloqueadas. Se guardan mejores tiempos, puntuación y estrellas por modalidad. **Continuar** reinicia la misión pendiente; no restaura posiciones exactas. El guardado es local al navegador y dispositivo.

La versión 5.2 conserva todos los récords, estrellas y desbloqueos de v5/v5.1. Si terminaste el nivel 5, el 6 queda disponible automáticamente; Continuar ofrece el nuevo capítulo cuando no había una misión pendiente. Los modos siguen teniendo avances independientes. También se mantienen las migraciones de v3/v4: sus desbloqueos pasan a la campaña actual, con récords separados y la copia anterior intacta. Si el almacenamiento está bloqueado o dañado, se puede seguir jugando durante la sesión.

## Música y sonido

El audio comienza al pulsar Jugar. **♫ Música y sonido** permite silenciar música y efectos por separado, ajustar volumen y guardar preferencias. La pausa silencia la música. Incluye efectos para herramientas, combo, pase, estatua, puente, daño y curación, además de los eventos de exploración y rescate.

## Pruebas y publicación

```sh
npm test
```

Para las pruebas de navegador, instala opcionalmente Python Playwright y Chromium, inicia el servidor y ejecuta:

```sh
CHROMIUM_PATH=/usr/bin/chromium python3 tests/browser_smoke.py
```

`CHROMIUM_PATH` puede omitirse si Playwright tiene Chromium instalado. [VALIDATION.md](VALIDATION.md) describe la cobertura y [BALANCE.md](BALANCE.md) las decisiones de diseño.

El workflow `.github/workflows/pages.yml` prueba y publica los cambios de `main` en GitHub Pages. La fuente de Pages es **GitHub Actions**. Se publican HTML, CSS, `package.json`, `.nojekyll`, `src/` y `assets/`; las pruebas y scripts de desarrollo quedan fuera del sitio público. No requiere compilación ni servidor Node en producción.

## Organización

`src/game.js` coordina la partida; `abilities.js` resuelve herramientas y pases; `ai.js` controla guardianes. `missions.js`, `challenges.js` y `map.js` definen geometría y objetivos. `grid.js` limita los pasos a vecinos cardinales y anima la transición; `collisions.js` y `navigation.js` gestionan obstáculos y rutas. `renderer.js`, `terrain.js` y `sprites.js` dibujan; `explorer-sprites.js` carga y alinea las poses de `assets/explorer-walk.png`, y `explorer-animation.js` sincroniza orientación y piernas con cada paso; `enemy-sprites.js` carga por separado los cuatro atlas de enemigos y `enemy-animation.js` sincroniza sus vistas con patrullas, ataques y estados; `input.js` y `ui.js` conectan teclado e interfaz. `progress.js` guarda el avance; `audio.js` sintetiza la música y los efectos.
