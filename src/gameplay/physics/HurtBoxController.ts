
import Phaser from 'phaser';

import type { CharacterDefinition } from '../../characters/types';

import type {
  CharacterHurtboxDefinition,
  HurtboxState,
  HurtboxStateDefinition
} from './HurtboxDefinition';

import { hurtboxRegistry } from './HurtboxRegistry';

interface HurtboxBodyResult {
  body: MatterJS.BodyType;
  offsetX: number;
  offsetY: number;
}

export class HurtboxController {
  private readonly scene: Phaser.Scene;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly definition: CharacterDefinition;
  private readonly groundY: number;

  private readonly hurtboxDefinition: CharacterHurtboxDefinition;

  private fighter?: Phaser.Physics.Matter.Sprite;

  private currentState?: HurtboxState;

  constructor(
    scene: Phaser.Scene,
    visual: Phaser.GameObjects.Sprite,
    definition: CharacterDefinition,
    groundY: number
  ) {
    this.scene = scene;
    this.visual = visual;
    this.definition = definition;
    this.groundY = groundY;

    const configuration = hurtboxRegistry[definition.id];

    if (!configuration) {
      throw new Error(
        `No existe una configuración de hurtboxes para ${definition.id}`
      );
    }

    this.hurtboxDefinition = configuration;
  }

  /**
   * Crea el primer cuerpo utilizando las hurtboxes de idle.
   */
  createInitialBody(): HurtboxBodyResult {
    this.currentState = 'idle';

    return this.createHurtboxBody(
      this.hurtboxDefinition.idle
    );
  }

  /**
   * Asigna el Matter Sprite al controlador.
   */
  setFighter(fighter: Phaser.Physics.Matter.Sprite): void {
    this.fighter = fighter;
  }

  /**
   * Actualiza las hurtboxes cuando cambia el estado.
   *
   * Devuelve true cuando reconstruye el cuerpo.
   */
  updateHitboxTransform(state: HurtboxState): boolean {
    const fighter = this.fighter;

    if (!fighter || this.currentState === state) {
      return false;
    }

    const velocity = fighter.getVelocity();

    const oldBody = fighter.body as MatterJS.BodyType | null;

    const wasGrounded =
      oldBody !== null &&
      oldBody.bounds.max.y >= this.groundY - 8 &&
      velocity.y >= -0.5;

    const configuration = this.hurtboxDefinition[state];

    const hurtbox = this.createHurtboxBody(configuration);

    // Conservamos el contacto con el suelo.
    if (wasGrounded) {
      const bodyBottomOffset =
        hurtbox.body.bounds.max.y -
        hurtbox.body.position.y;

      this.visual.y =
        this.groundY -
        hurtbox.offsetY -
        bodyBottomOffset;
    }

    const targetX = this.visual.x + hurtbox.offsetX;
    const targetY = this.visual.y + hurtbox.offsetY;

    this.scene.matter.body.setPosition(hurtbox.body, {
      x: targetX,
      y: targetY
    });

    fighter.setExistingBody(hurtbox.body);

    this.configureCollisionFilter();

    fighter.setVelocity(velocity.x, velocity.y);

    fighter.setIgnoreGravity(true);
    fighter.setFixedRotation();
    fighter.setFriction(0, 0, 0);
    fighter.setBounce(0);

    this.currentState = state;

    return true;
  }

  /**
   * Configura los filtros de colisión del cuerpo compuesto.
   */
  private configureCollisionFilter(): void {
    const body = this.fighter?.body as MatterJS.BodyType | null;

    if (!body) return;

    const fighterCategory = 0x0002;
    const worldCategory = 0x0001;

    body.collisionFilter.category = fighterCategory;
    body.collisionFilter.mask = worldCategory;
    body.collisionFilter.group = 0;

    body.parts.forEach((part) => {
      part.collisionFilter.category = fighterCategory;
      part.collisionFilter.mask = worldCategory;
      part.collisionFilter.group = 0;
    });
  }

  /**
   * Construye las tres hurtboxes manuales.
   */
  private createHurtboxBody(
    configuration: HurtboxStateDefinition
  ): HurtboxBodyResult {
    const { head, torso, legs } = configuration;

    const boxes = [head, torso, legs];

    // Calculamos el centro de masa utilizando el área de cada caja.
    const areas = boxes.map(
      (box) => box.width * box.height
    );

    const totalArea = areas.reduce(
      (total, area) => total + area,
      0
    );

    if (
      boxes.some(
        (box) =>
          box.width <= 0 ||
          box.height <= 0 ||
          !Number.isFinite(box.offsetX) ||
          !Number.isFinite(box.offsetY)
      ) ||
      totalArea <= 0
    ) {
      throw new Error(
        `Configuración de hurtboxes inválida para ${this.definition.id}`
      );
    }

    const centerOfMassX = boxes.reduce(
      (total, box, index) =>
        total + box.offsetX * areas[index],
      0
    ) / totalArea;

    const centerOfMassY = boxes.reduce(
      (total, box, index) =>
        total + box.offsetY * areas[index],
      0
    ) / totalArea;

    const bodies = this.scene.matter.bodies;

    const parts: MatterJS.BodyType[] = boxes.map((box) =>
      bodies.rectangle(
        box.offsetX - centerOfMassX,
        box.offsetY - centerOfMassY,
        box.width,
        box.height
      )
    );

    const body = this.scene.matter.body.create({
      parts,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0,
      label: 'fighter-hurtboxes'
    });

    const flipDirection = this.visual.flipX ? -1 : 1;

    return {
      body,
      offsetX: centerOfMassX * flipDirection,
      offsetY: centerOfMassY
    };
  }
}
