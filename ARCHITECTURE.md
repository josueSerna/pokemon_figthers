# Arquitectura modular

## Flujo actual

`CharacterSelectScene` consulta `src/characters/registry.ts` y muestra todos los personajes registrados. Al confirmar uno disponible, pasa su `characterId` a `GameScene`.

`GameScene` se limita a crear el fondo, el suelo, el oponente temporal, el `InputManager` y el `CharacterController`. La lógica de movimiento, animación y habilidades no vive en la escena.

## Agregar un personaje

1. Crear una configuración en `src/characters/` con `CharacterDefinition`.
2. Añadir sus spritesheets a `assets.spriteSheets`.
3. Añadir sus animaciones a `animations`.
4. Definir estadísticas y hitbox.
5. Registrarlo en `src/characters/registry.ts`.
6. Marcarlo como `available` cuando su controlador y recursos estén listos.

La selección lo mostrará automáticamente. La configuración de ataques se mantiene separada mediante `AttackDefinition` en `src/gameplay/attacks/types.ts`.

## Mecánicas especiales

Las habilidades implementan `FighterAbility` en `src/gameplay/abilities/`. Solo se agregan al controlador de los personajes que las necesitan. Para recibir acciones, una habilidad puede implementar `handleAction`; no es necesario añadir métodos vacíos a otros personajes.

## Controles

`InputManager` convierte teclado y Gamepad API en acciones comunes. El controlador consume acciones como `moveLeft`, `jump` y `specialAttack`, por lo que no depende de un dispositivo concreto. Los bindings de teclado aceptan una tecla o una lista de alias.

## Dos jugadores

La partida crea dos controladores independientes:

- Jugador 1: teclado, con flechas/WASD, espacio para saltar y J para la habilidad especial.
- Jugador 2: primer mando detectado mediante Gamepad API, usando stick izquierdo y botones estándar.

Cada jugador conserva su propio estado de input, animaciones, personaje y habilidades. Si se selecciona Lucario, el segundo jugador usa Charizard; si se selecciona Charizard, el segundo jugador usa Lucario.
