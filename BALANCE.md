# Diseño y balance · versión 4

La modalidad individual necesitaba funcionar sin esperar a un compañero automático. El cooperativo necesitaba decisiones compartidas que fueran más allá de caminar juntos. Esta versión separa los recursos de supervivencia y las herramientas disponibles en cada modo, y prueba la nueva estructura con **El Puente del Jaguar**. Las cinco misiones reciben las herramientas y reglas de modalidad; las misiones 2–5 mantienen sus encuentros de runas.

## Decisiones

| Problema                                     | Cambio                                                                         | Decisión que buscamos provocar                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| En solo, quedar atrapado y depender de la IA | Un personaje con tres corazones, linterna y liana                              | Elegir entre avanzar, esquivar, interrumpir o regresar a curarse |
| Dos personajes haciendo lo mismo             | Azul ilumina; rojo usa liana                                                   | Preparar y ejecutar un combo, repartir responsabilidades         |
| Portador fijo durante toda la vuelta         | Pases, ralentización al cargar y preferencia de los guardianes por el portador | Cambiar quién lleva y quién abre camino                          |
| Jugador capturado sin nada que hacer         | La burbuja rueda; la liana la acerca                                           | Participar en el propio rescate                                  |
| Primer objetivo demasiado parecido al resto  | Usar el salto del jaguar para cargar una estatua y abrir el puente             | Observar al monstruo y convertir su ataque en una solución       |
| Herramienta que elige un objetivo frustrante | Rescate primero; mecanismo solo si está listo; marca de luz antes que tesoros  | Hacer predecible la respuesta de la liana                        |

## Parámetros

- Movimiento: 64 píxeles de pantalla/s. Portador: ×0,93 solo, ×0,78 dúo. Burbuja: 25 píxeles/s. Impulso: 150 píxeles/s durante 0,2 s, con 3,5 s de recarga.
- Solo: tres corazones; cada golpe otorga 1,7 s de protección. Campamento: dos segundos continuos para recuperar corazones, únicamente antes de la alarma. Los golpes acumulados siguen contando para las estrellas.
- Solo: un guardián menos, velocidad de patrulla ×0,92 y preparación de ataque ×1,15. No se elimina al Solar final.
- Linterna: radio 2,3 casillas, recarga 5 s, interrupción 0,7 s. Marca de combo: 6 s solo / 4 s dúo.
- Liana: alcance 3 casillas, recarga 4,5 s, interrupción 0,6 s o inmovilización 2,2 s si hay marca de luz. Un lanzamiento sin objetivo válido no gasta recarga.
- Pase: alcance 4 casillas, espera entre pases 0,8 s, protección del receptor 0,45 s. El cambio de portador es inmediato; la animación dura 0,35 s. Agua permitida; muros bloquean.
- Rescate: 0,6 s de proximidad; protección 1,5 s para el rescatado y 0,8 s para el rescatador. La liana requiere un trayecto transitable para acercar una burbuja.
- Estatua: impacto de la trayectoria de salto a hasta 0,65 casillas. Recuperación del jaguar 2,5 s. El mecanismo permanece iluminado 8 s solo / 4 s dúo. Abrirlo mantiene disponibles ambos cruces hasta reiniciar.
- Resto de encuentros: runas 0,65 s; territorio de guardián hasta tres casillas de su ruta; ataques próximos por turnos. Trampas con ciclo de 6,5 s, aviso de 1,3 s y frenado de 1,1 s.

Se mantienen los puntos por completar, tesoros y tiempo. Se descuentan 35 por golpe/captura y 200 por intento compartido perdido. Pases, combos y rescates no generan puntos repetibles. Estrellas sin límite de tiempo: completar, tres tesoros y expedición limpia. Solo admite hasta un golpe; dúo hasta dos capturas, sin perder un intento.

## Recorridos automatizados

Controlador determinista de `tests/journey.js`, con guardianes activos, colisiones, herramientas con recarga y daño real. Dirige un personaje en solo y ambos en dúo. No teletransporta, desactiva enemigos ni concede invulnerabilidad. La estatua se carga mediante un salto real.

| Misión            | Solo, principal | Solo, tres tesoros | Dúo, principal | Dúo, tres tesoros |
| ----------------- | --------------- | ------------------ | -------------- | ----------------- |
| Puente del Jaguar | 23,3 s          | 35,7 s             | 25,2 s         | 36,4 s            |
| Puentes del Río   | 23,7 s          | 31,1 s             | 24,4 s         | 32,4 s            |
| Jardín            | 28,6 s          | 29,0 s             | 31,9 s         | 30,6 s            |
| Luna              | 30,1 s          | 40,5 s             | 34,9 s         | 41,0 s            |
| Santuario         | 30,5 s          | 35,0 s             | 44,1 s         | 67,3 s            |

Los veinte escenarios terminan. En estas rutas el modo individual recibe cero golpes y el dúo sufre entre cero y dos capturas, con rescate. La automatización reacciona a los avisos inmediatamente: estos tiempos y resultados no representan a jugadores humanos ni demuestran que el juego sea más divertido. Un desvío puede evitar enemigos y acortar la ruta; la duración no tiene por qué crecer en cada caso.

## Calibración con David y Tavito

La siguiente prueba útil es jugar la primera misión solos y después juntos. Observar si entienden dónde colocarse para dirigir al jaguar, si recuerdan la secuencia de herramientas, si los pases ayudan durante la vuelta y si el capturado sigue participando. Medir intentos, tiempo real y necesidad de ayuda antes de cambiar radios, recargas o extender encuentros específicos a los otros cuatro mapas.
