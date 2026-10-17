# Diseño y balance · versión 5

La petición principal es facilitar la lectura y la esquiva: cámara desde arriba y movimientos por cuadros, como en la referencia de Tibia. Las reglas de solo y dúo de v4 se conservan. Cambian la geometría, el ritmo de desplazamiento y la forma de anunciar ataques en las cinco misiones.

## Decisiones

| Cambio                                                      | Resultado buscado                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Proyección rectangular con casillas cuadradas               | Arriba/abajo/izquierda/derecha coinciden con los ejes de la pantalla            |
| Un paso cardinal por orden; repetición al mantener la tecla | Saber dónde terminará cada movimiento                                           |
| Última dirección pulsada y un giro pendiente                | Responder con rapidez sin cortar esquinas ni generar diagonales                 |
| Impulso de exactamente una casilla                          | Una esquiva corta y predecible, con recarga                                     |
| Enemigos y liana sujetos a los mismos pasos                 | Evitar que una embestida o un rescate introduzcan desplazamientos diagonales    |
| Avisos de ataque por casillas                               | Mostrar con precisión qué cuadros son peligrosos                                |
| Mapas de 28 × 20                                            | Ampliar salas, pasillos y cruces, conservando la identidad de los cinco diseños |

La expansión añade filas y columnas a los diseños existentes y convierte objetivos, patrullas, arbustos y puentes a sus nuevas posiciones. No se estira la imagen: la lógica contiene 560 casillas reales, frente a 252. Se ve el mapa completo, sin una cámara que separe al dúo.

## Parámetros

- Movimiento: una casilla cada 0,25 s; burbuja cada 0,5 s. Portador: velocidad ×0,93 solo o ×0,78 dúo, que aumenta la espera entre casillas sin alterar su longitud. Impulso: una casilla en unos 0,117 s, con 3,5 s de recarga.
- Solo: tres corazones; cada golpe otorga 1,7 s de protección. Campamento: dos segundos continuos para recuperar corazones, únicamente antes de la alarma. Los golpes acumulados siguen contando para las estrellas.
- Solo: un guardián menos, velocidad de patrulla ×0,92 y preparación de ataque ×1,15. No se elimina al Solar final.
- Linterna: radio 2,3 casillas, recarga 5 s, interrupción 0,7 s. Marca de combo: 6 s solo / 4 s dúo.
- Liana: alcance 3 casillas, recarga 4,5 s, interrupción 0,6 s o inmovilización 2,2 s si hay marca de luz. Un lanzamiento sin objetivo válido no gasta recarga.
- Pase: alcance 4 casillas, espera entre pases 0,8 s, protección del receptor 0,45 s. El cambio de portador es inmediato; la animación dura 0,35 s. Agua permitida; muros bloquean.
- Rescate: 0,6 s de proximidad; protección 1,5 s para el rescatado y 0,8 s para el rescatador. La liana acerca la burbuja hasta una casilla adyacente, mediante pasos cardinales por suelo transitable. El rescate ya funciona desde la casilla vecina.
- Estatua: impacto de la trayectoria de salto a hasta 0,65 casillas. Recuperación del jaguar 2,5 s. El mecanismo permanece iluminado 8 s solo / 4 s dúo. Abrirlo mantiene disponibles ambos cruces hasta reiniciar.
- Resto de encuentros: runas 0,65 s; territorio de guardián hasta 4,5 casillas de su ruta; ataques próximos por turnos. Trampas con ciclo de 6,5 s, aviso de 1,3 s y frenado de 1,1 s.

Se mantienen los puntos por completar, tesoros y tiempo. Se descuentan 35 por golpe/captura y 200 por intento compartido perdido. Pases, combos y rescates no generan puntos repetibles. Estrellas sin límite de tiempo: completar, tres tesoros y expedición limpia. Solo admite hasta un golpe; dúo hasta dos capturas, sin perder un intento.

## Ataques legibles

El centinela avisa una cruz de una casilla de alcance. El espíritu señala un área de hasta dos pasos cardinales. El Solar señala un cuadrado de hasta 5 × 5. Muros y línea de visión recortan esas zonas. El jaguar se alinea con el jugador antes de avisar y avanza hasta tres casillas cardinales, deteniéndose ante agua o muros. La zona fijada durante el aviso no cambia al moverse el jugador.

Las posiciones de juego siempre están en centros de casilla. La animación interpola visualmente el paso entre centros; el destino es la casilla lógica ocupada desde que empieza el paso. Las pruebas verifican que cada cambio sea como máximo un vecino cardinal. Pausar congela también esa transición visual.

## Recorridos automatizados

`tests/journey.js` dirige las entradas de movimiento y herramientas, con guardianes, daño, colisiones y recargas reales. No teletransporta, elimina enemigos ni concede invulnerabilidad. Completa los cinco mapas en ambos modos, con y sin todos los tesoros. La estatua se carga mediante un salto real del jaguar.

Los resultados detallados se generan en `test-results/balance-v5.json`. Estas simulaciones reaccionan inmediatamente a avisos y no representan tiempos ni dificultad de personas. Sirven para detectar bloqueos y regresiones; la diversión requiere jugar.

## Correcciones durante el cambio

- El jaguar ya no inicia ataques desde una diagonal que no pueda alcanzar al jugador.
- La liana completa el recorrido hasta la casilla adyacente; inicialmente podía detenerse un cuadro antes y dejar el rescate fuera de alcance.
- Un toque breve no se pierde entre cuadros de animación; solo se conserva una dirección pendiente.
- Dos teclas no producen diagonales ni más velocidad.
- Los cuadros anunciados de un ataque y la comprobación de daño usan la misma lista.
- Los desbloqueos de v3/v4 se conservan sin mezclar puntuaciones de los mapas anteriores con los ampliados.

## Prueba con David y Tavito

Comparar si ahora se entiende dónde termina cada paso, si es fácil salir de un aviso y si los mapas se sienten suficientemente amplios en laptop. El siguiente ajuste debe salir de esas observaciones: duración del paso, tiempo de aviso y densidad de encuentros. Se conservan los cinco objetivos actuales; esta actualización cambia cámara, movimiento y tamaño de mapas.
