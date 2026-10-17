# Análisis y balance · versión 3

## Diagnóstico

La versión 2 tenía una base cooperativa clara: dos exploradores, escondites, rescates y una salida compartida. Sus cinco mapas cambiaban de geometría y color, pero pedían siempre el mismo recorrido: ir a la bandera y volver. La velocidad de las patrullas subía sin añadir suficientes decisiones nuevas.

El principal problema de balance era el rescate instantáneo. Un compañero muy próximo anulaba casi inmediatamente una captura; el controlador de prueba completaba cada mapa en 15,5–17,6 segundos con 5–8 capturas y los tres intentos intactos. Había mucho intercambio de capturas, pero poca consecuencia. Piedra y espíritu se diferenciaban principalmente por apariencia y velocidad. Al acabar faltaban objetivos opcionales, récords o progreso persistente que motivaran otra partida.

## Cambios implementados

| Oportunidad                           | Cambio                                                                                    | Efecto buscado                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Recorridos repetidos                  | 1, 2, 2, 3 y 3 runas distribuidas por los cinco mapas; sellan la bandera hasta activarlas | Explorar rutas y decidir el orden de objetivos      |
| Poco incentivo para desviarse         | Tres tesoros opcionales por misión                                                        | Elegir entre avanzar o explorar un desvío           |
| Capturas poco legibles                | Ataques con aviso, dirección o radio visible y recuperación                               | Poder anticipar y aprender de cada error            |
| Monstruos demasiado parecidos         | Golpe de piedra, pulso del espíritu, salto del jaguar y gran golpe Solar                  | Exigir respuestas distintas sin añadir armas        |
| Movimiento pasivo                     | Impulso corto con invulnerabilidad y recarga                                              | Dar una herramienta activa para escapar             |
| Rescate automático trivial            | Canal de 0,6 segundos que se interrumpe al salir                                          | Requerir una ventana segura y cooperación           |
| Captura inmediata después del rescate | Protección breve para ambos exploradores                                                  | Permitir salir juntos sin anular el riesgo previo   |
| Persecuciones que acumulan guardianes | Territorio limitado y ataques próximos por turnos                                         | Mantener encuentros legibles y huecos para rescatar |
| Cruces demasiado estrechos            | Puentes ampliados en misiones 2 y 5                                                       | Dar espacio para esquivar las nuevas embestidas     |
| Regreso idéntico a la ida             | Alarma al tomar la bandera: persecución +12 % y música más rápida                         | Crear un cierre más tenso                           |
| Pocas razones para repetir            | Tres estrellas, puntuación, mejores tiempos y selección de misiones                       | Premiar aprendizaje, exploración y partidas limpias |
| Pérdida de avance al recargar         | Guardado por misión y modalidad                                                           | Permitir sesiones cortas y continuar después        |

## Parámetros de partida

- Movimiento normal: 64 píxeles de pantalla/s. Llevar la bandera reduce un 7 % esa velocidad. El suelo peligroso reduce temporalmente el movimiento al 62 %.
- Impulso: 150 píxeles/s durante 0,2 s; recarga 3,5 s. La IA usa la misma habilidad y recarga. Mantener la tecla no repite la acción.
- Runas: 0,65 s de permanencia; la carga parcial se interrumpe al alejarse.
- Rescate: 0,6 s de permanencia; protección de 1,5 s para el rescatado y 0,8 s para quien lo libera.
- Ataques: avisos de 0,7–1,25 s; recuperación de 1,25–1,8 s. El salto del jaguar dura 0,32 s, mantiene su dirección y se detiene ante obstáculos.
- Patrullas: territorio de hasta tres casillas alrededor de sus puntos de ruta. Los guardianes separados por menos de tres casillas no inician ataques simultáneos.
- Trampas: ciclo de 6,5 s, con 1,3 s de aviso antes de la fase activa. Frenan durante 1,1 s; no capturan por sí solas.
- Tres intentos compartidos por misión. Solo se pierde uno si ambos están atrapados. No hay límite de tiempo.

La puntuación parte de 1.000 puntos, suma 200 por tesoro y hasta cinco puntos por segundo ahorrado respecto al tiempo de referencia del mapa. Resta 35 por captura y 200 por intento perdido; mínimo 100. Los tiempos de referencia son 65, 90, 105, 120 y 140 segundos. El cronómetro acumula los intentos y se detiene al pausar. Rescatar no genera puntos adicionales.

Las estrellas son independientes del tiempo: terminar, recoger los tres tesoros y terminar con tres intentos y hasta dos capturas. Una ruta rápida no es obligatoria para obtener las tres.

## Medición automatizada

Resultados de `tests/journey.js` en Node, con movimiento, colisiones, guardianes, rescate y compañero IA reales. La versión 3 adapta el controlador a runas e impulso; por eso esta comparación describe los recorridos, **no demuestra una mejora de diversión ni equivale a tiempos de jugadores humanos**.

| Misión    | v2 solo + IA | v3 solo + IA, ruta principal | v3 solo + IA, tres tesoros |
| --------- | ------------ | ---------------------------- | -------------------------- |
| Templo    | 16,2 s       | 20,2 s                       | 27,9 s                     |
| Puentes   | 17,4 s       | 25,3 s                       | 34,3 s                     |
| Jardín    | 16,4 s       | 25,6 s                       | 30,8 s                     |
| Luna      | 16,9 s       | 38,1 s                       | 33,8 s                     |
| Santuario | 17,6 s       | 30,5 s                       | 41,3 s                     |

Los 20 escenarios —cinco mapas, dos modalidades, ruta principal o búsqueda de tres tesoros— terminan. En estos recorridos las capturas bajan a 0–2 por misión: el controlador evita los avisos y la IA elige salidas cercanas en vez de cruzar un ataque para seguir al humano. La progresión aumenta objetivos y combinaciones de enemigos; la dificultad efectiva también depende de la ruta elegida y no es estrictamente creciente en cada simulación.

## Errores corregidos durante la revisión

- Rescatadores capturados de inmediato sin margen para separarse del peligro.
- Compañero que elegía una salida lejana de un ataque para permanecer cerca del humano.
- IA que entraba en un área de ataque al intentar rescatar; ahora espera fuera hasta que aparece una ventana.
- Penalización de velocidad por llevar la bandera que no se aplicaba al compañero IA.
- Guardianes que perseguían entre regiones y se acumulaban en los pasos estrechos.
- Embestida que podía deslizarse por una pared o sobrepasar el extremo anunciado con ciertos tiempos de cuadro.
- Fragmento de arbusto incluido en el recorte del espíritu.
- Escape ignorado cuando el control de volumen tenía el foco.
- Espacio consumido como impulso cuando debía activar un botón enfocado.

## Próxima calibración con David y Tavito

Observar si identifican una runa sin ayuda, si entienden qué ataque los atrapó, si el compañero llega a rescatar y si desean repetir para buscar tesoros. La prueba con personas debe calibrar duración, avisos y frecuencia de capturas. La automatización comprueba que las reglas se cumplen y que las rutas se pueden completar; no mide por sí sola qué tan entretenido resulta el juego.
