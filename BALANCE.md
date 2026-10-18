# Diseño y balance · versión 5.6

El objetivo de todas las misiones es capturar la bandera y regresar a la entrada. La dificultad crece introduciendo una mecánica cada vez, acortando gradualmente las ventanas de reacción y combinando rutas y enemigos conocidos. Se conservan diez mapas, movimiento cardinal por casillas, vista completa, herramientas y progreso guardado.

## Progresión de la campaña

| Misión                          | Aprendizaje o desafío                                | Runas | Guardianes solo / dúo | Velocidad base |
| ------------------------------- | ---------------------------------------------------- | ----- | --------------------- | -------------- |
| 1 · La Primera Bandera          | Caminar, esquivar centinelas y volver; bandera libre | 0     | 1 / 2                 | 32             |
| 2 · Los Puentes del Río         | Activar una runa y elegir el cruce                   | 1     | 2 / 3                 | 36             |
| 3 · El Jardín de las Estatuas   | Primera embestida del jaguar                         | 2     | 3 / 4                 | 40             |
| 4 · Las Ruinas de la Luna       | Primer pulso del espíritu                            | 2     | 3 / 4                 | 44             |
| 5 · El Santuario del Sol        | Primeras trampas de suelo, con aviso                 | 3     | 4 / 5                 | 47             |
| 6 · El Pantano de la Niebla     | Estatua, luz y liana para abrir dos cruces           | 3     | 5 / 6                 | 50             |
| 7 · Las Canteras del Ámbar      | Primer gran golpe del Guardián Solar                 | 3     | 6 / 7                 | 53             |
| 8 · La Laguna de Cristal        | Combinar enemigos conocidos y cruces alternativos    | 4     | 6 / 7                 | 56             |
| 9 · La Fortaleza de las Espinas | Accesos vigilados y refugios entre patrullas         | 4     | 7 / 8                 | 59             |
| 10 · El Corazón de la Selva     | Cuatro salidas y dos Guardianes Solares              | 4     | 8 / 9                 | 62             |

El mecanismo del antiguo primer nivel pasa a la misión 6. Los dos puentes del río superior del pantano se cierran hasta resolverlo; la estatua, el mecanismo y el jaguar necesario están en la zona accesible. Al abrirlos se puede terminar la activación de runas y capturar la bandera. La primera misión tiene un centinela cerca de la bandera; en dúo se añade una patrulla en la aproximación.

## Dos momentos por misión

La ida permite observar patrullas y elegir cómo liberar la bandera. Tomarla activa la música de alarma, cierra la curación del campamento y muestra una cuenta en el HUD. La cuenta baja de 2,4 a 1,5 s entre misiones; solo recibe 0,4 s adicionales.

Al terminar la cuenta, cada guardián sigue una ruta que incluye un cruce elegido en el diseño del mapa. Se desplaza físicamente hasta allí. El cambio conserva pasos en curso, aturdimientos y ataques anunciados. Los puntos se reparten por el terreno y quedan fuera de la entrada; ninguna puerta se cierra durante la huida. Los guardianes siguen necesitando visión y respetan arbustos y territorio. La alarma continúa tras un pase o una bandera caída y se restablece al reintentar.

`src/difficulty.js` concentra la curva y los puntos de vigilancia; `map.js` los convierte a la cuadrícula de 28 × 20. Todas las rutas de alarma se verifican como transitables después de abrir los mecanismos necesarios.

## Ventanas y modalidades

- Jugadores: una casilla cada 0,25 s; portador ×0,93 solo / ×0,78 dúo. Impulso: una casilla en unos 0,117 s, con 3,5 s de recarga.
- Avisos: duración base del enemigo ×1,50 en la misión 1, hasta ×1,05 en la 10; disminuye 0,05 por misión. En solo se multiplica además por 1,25. El centinela inicial avisa 1,275 s en dúo y unos 1,59 s en solo.
- Recuperación: duración base ×1,30 al principio, hasta ×1,03 al final; solo recibe otro ×1,10. Los primeros encuentros dejan más tiempo para cruzar o usar herramientas.
- Solo: un guardián menos, patrulla ×0,92, tres corazones, protección tras daño y acceso a ambas herramientas. Los primeros niveles se completan usando solo movimiento y esquiva.
- Dúo: linterna azul y liana roja, tres intentos compartidos, captura en burbuja, rescate y pase. El portador avanza más despacio; el compañero puede distraer o interrumpir guardias para abrir camino.
- Detección: 2,7 a 4,95 casillas; búsqueda: 1,4 a 3,2 s. Tras la cuenta de alarma se añaden 0,2 a 0,65 casillas de detección y persecución ×1,02 a ×1,11.
- El jaguar final alcanza 78,81 unidades/s en persecución con alarma; el portador en dúo camina a 87,36. La dificultad conserva margen de huida.
- Los ataques próximos se turnan: separación de 4 casillas en las primeras cuatro misiones y 3 en las siguientes. Las casillas de daño quedan fijadas durante el aviso.

## Herramientas y reglas conservadas

La luz marca guardianes durante 6 s solo / 4 s dúo y los interrumpe 0,7 s. La liana inmoviliza 2,2 s a un guardián marcado y también permite rescatar y recoger objetos. El mecanismo del puente admite luz durante 8 s solo / 4 s dúo. Su estatua se carga mediante una embestida real y permanece cargada durante ese intento.

El pase alcanza cuatro casillas con línea libre de muros, tiene 0,8 s de espera y da 0,45 s de protección al receptor. El rescate requiere 0,6 s junto al compañero. Los ataques, las herramientas y el movimiento respetan paredes y agua; los avisos corresponden a las casillas que realmente golpean.

Las estrellas premian completar, reunir los tres tesoros y una expedición limpia. No hay límite de tiempo. El tiempo afecta solo a parte de la puntuación. Reintentar restaura la misión y conserva los desbloqueos y récords guardados.

## Verificación y siguiente prueba humana

Las pruebas recorren diez misiones × dos modos × con/sin tesoros, con guardianes activos, además de las dos primeras misiones sin habilidades. Comprueban orientación, colisiones, progresión, avisos, rutas de alarma, pausa, pérdida y recuperación de bandera y restauración de la misión 6. Las simulaciones reaccionan inmediatamente y no representan la dificultad percibida por un niño.

Al jugar con Tavito, observar especialmente si entiende el objetivo inicial, reconoce el primer aviso del jaguar y cambia de ruta al sonar la alarma. En dúo, comprobar si pasan la bandera y usan al compañero para abrir camino. Esa prueba permitirá ajustar tiempos y encuentros sobre la progresión ya implementada.
