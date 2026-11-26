
import Phaser from 'phaser';

import type {
  NeutralAttackDefinition,
  NeutralVisualEffectDefinition
} from './neutralAttackTypes';

export type NeutralAttackType = 'melee' | 'ranged';

export interface NeutralVisualEffectPlayer {
  play(
    effect: NeutralVisualEffectDefinition,
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale?: number,
    area?: NeutralVisualEffectArea
  ): void;

  destroy(): void;
}

export interface NeutralVisualEffectArea {
  x: number;
  y: number;
  width: number;
  height: number;
  headX: number;
  headY: number;
}

export class NeutralAttackController {
  private readonly scene: Phaser.Scene;
  private readonly attacker: Phaser.GameObjects.Sprite;
  private readonly opponent: Phaser.Physics.Matter.Sprite;
  private readonly takeDamage: (amount: number) => void;

  private readonly onAttackStateChange: (
    attacking: boolean,
    crouchingAttack: boolean
  ) => void;

  private readonly onHexStateChange: (active: boolean) => void;

  private readonly attacks: (NeutralAttackDefinition | undefined)[];
  private readonly crouchAttacks: (NeutralAttackDefinition | undefined)[];
  private readonly airAttack?: NeutralAttackDefinition;

  private readonly attackSprite: Phaser.GameObjects.Sprite;
  private readonly hitboxGraphics: Phaser.GameObjects.Graphics;

  private readonly visualEffectPlayer?: NeutralVisualEffectPlayer;

  private secondarySprite?: Phaser.GameObjects.Sprite;
  private impactSprite?: Phaser.GameObjects.Sprite;

  private hexStarted = false;
  private hexTimer?: Phaser.Time.TimerEvent;

  private comboStates = {
    standing: { index: 0, deadline: 0 },
    crouching: { index: 0, deadline: 0 }
  };

  private attacking = false;
  private bufferedPress = false;
  private bufferedCrouching = false;
  private hasHit = false;
  private secondaryPlayed = false;
  private visualEffectPlayed = false;
  private hitVisualEffectPlayed = false;
  private previousVisibility = true;
  private isReversing = false;

  private currentAttack?: NeutralAttackDefinition;
  private attackBaseY = 0;

  constructor(
    scene: Phaser.Scene,
    attacker: Phaser.GameObjects.Sprite,
    opponent: Phaser.Physics.Matter.Sprite,
    takeDamage: (amount: number) => void,
    attacks: (NeutralAttackDefinition | undefined)[],
    onAttackStateChange: (
      attacking: boolean,
      crouchingAttack: boolean
    ) => void = () => {},
    crouchAttacks: (NeutralAttackDefinition | undefined)[] = [],
    airAttack?: NeutralAttackDefinition,
    visualEffectPlayer?: NeutralVisualEffectPlayer,
    onHexStateChange: (active: boolean) => void = () => {}
  ) {
    this.scene = scene;
    this.attacker = attacker;
    this.opponent = opponent;
    this.takeDamage = takeDamage;
    this.attacks = attacks;
    this.crouchAttacks = crouchAttacks;
    this.onAttackStateChange = onAttackStateChange;
    this.airAttack = airAttack;
    this.visualEffectPlayer = visualEffectPlayer;
    this.onHexStateChange = onHexStateChange;

    const allAttacks = [
      ...this.attacks,
      ...this.crouchAttacks,
      this.airAttack
    ].filter(
      (attack): attack is NeutralAttackDefinition => !!attack
    );

    const firstAttack = allAttacks[0];

    if (!firstAttack) {
      throw new Error(
        'El Pokémon necesita al menos un ataque configurado.'
      );
    }

    if (!scene.textures.exists(firstAttack.textureKey)) {
      throw new Error(
        `No existe la textura del primer ataque: ${firstAttack.textureKey}`
      );
    }

    this.createAnimations();

    this.attackSprite = scene.add
      .sprite(attacker.x, attacker.y, firstAttack.textureKey)
      .setVisible(false);

    this.hitboxGraphics = scene.add.graphics();
    this.hitboxGraphics.setDepth(attacker.depth + 2);
  }

  private createAnimations(): void {
    const allAttacks = [
      ...this.attacks,
      ...this.crouchAttacks,
      this.airAttack
    ].filter(
      (attack): attack is NeutralAttackDefinition => attack !== undefined
    );

    for (const attack of allAttacks) {
      this.createAnimation(
        attack.textureKey,
        attack.animationKey,
        attack.frameStart,
        attack.frameEnd,
        attack.frameRate
      );

      const secondary = attack.secondaryAnimation;

      if (secondary) {
        this.createAnimation(
          secondary.textureKey,
          secondary.animationKey,
          secondary.frameStart,
          secondary.frameEnd,
          secondary.frameRate
        );
      }

      const impact = attack.impact;

      if (
        impact?.animationKey &&
        impact.frameStart !== undefined &&
        impact.frameEnd !== undefined
      ) {
        this.createAnimation(
          impact.textureKey,
          impact.animationKey,
          impact.frameStart,
          impact.frameEnd,
          impact.frameRate ?? 12
        );
      }
    }
  }

  private createAnimation(
    textureKey: string,
    animationKey: string,
    frameStart: number,
    frameEnd: number,
    frameRate: number
  ): void {
    if (!this.scene.textures.exists(textureKey)) {
      console.error(
        `[NeutralAttackController] No existe la textura "${textureKey}".`
      );
      return;
    }

    if (this.scene.anims.exists(animationKey)) return;

    const texture = this.scene.textures.get(textureKey);
    const totalFrames = texture.frameTotal - 1;

    if (frameStart < 0 || frameEnd > totalFrames) {
      console.error(
        `[NeutralAttackController] Frames inválidos en "${animationKey}".`
      );
      return;
    }

    const frames = this.scene.anims.generateFrameNumbers(
      textureKey,
      { start: frameStart, end: frameEnd }
    );

    if (frames.length === 0) {
      console.error(
        `[NeutralAttackController] No se pudieron generar frames para "${animationKey}".`
      );
      return;
    }

    this.scene.anims.create({
      key: animationKey,
      frames,
      frameRate,
      repeat: 0
    });
  }

  press(
    isCrouching = false,
    isAirborne = false
  ): void {
    if (isAirborne) {
      if (this.attacking || !this.airAttack) return;

      if (
        !this.scene.textures.exists(this.airAttack.textureKey) ||
        !this.scene.anims.exists(this.airAttack.animationKey)
      ) {
        console.error(
          `[NeutralAttackController] No se puede reproducir el ataque aéreo "${this.airAttack.animationKey}".`
        );
        return;
      }

      this.startAttack(this.airAttack, false);
      return;
    }

    const hasCrouchAttacks = this.crouchAttacks.some(
      attack => !!attack
    );

    const useCrouchAttacks =
      isCrouching && hasCrouchAttacks;

    if (this.attacking) {
      this.bufferedPress = true;
      this.bufferedCrouching = useCrouchAttacks;
      return;
    }

    this.startNextAttack(useCrouchAttacks);
  }

  private startNextAttack(useCrouchAttacks: boolean): void {
    const selectedAttacks = useCrouchAttacks
      ? this.crouchAttacks
      : this.attacks;

    const comboState = useCrouchAttacks
      ? this.comboStates.crouching
      : this.comboStates.standing;

    const now = this.scene.time.now;

    if (now > comboState.deadline) {
      comboState.index = 0;
    }

    let attack = selectedAttacks[comboState.index];

    if (!attack) {
      comboState.index = 0;
      attack = selectedAttacks[0];
    }

    if (!attack) {
      this.bufferedPress = false;
      this.bufferedCrouching = false;
      this.onAttackStateChange(false, false);
      return;
    }

    if (
      !this.scene.textures.exists(attack.textureKey) ||
      !this.scene.anims.exists(attack.animationKey)
    ) {
      console.error(
        `[NeutralAttackController] No se puede reproducir "${attack.animationKey}". Falta su textura o animación.`
      );

      comboState.index = 0;
      this.bufferedPress = false;
      this.bufferedCrouching = false;
      this.onAttackStateChange(false, false);
      return;
    }

    comboState.index =
      (comboState.index + 1) % selectedAttacks.length;

    comboState.deadline = now + 900;

    this.startAttack(attack, useCrouchAttacks);
  }

  private startAttack(
    attack: NeutralAttackDefinition,
    crouchingAttack = false
  ): void {
    this.attacking = true;
    this.hasHit = false;
    this.secondaryPlayed = false;
    this.visualEffectPlayed = false;
    this.hitVisualEffectPlayed = false;
    this.isReversing = false;
    this.currentAttack = attack;

    this.hexStarted = false;
    this.hexTimer?.remove();
    this.hexTimer = undefined;

    this.onAttackStateChange(true, crouchingAttack);

    this.attackBaseY = this.attacker.y;

    this.previousVisibility = this.attacker.visible;
    this.attacker.setVisible(false);

    this.attackSprite
      .setTexture(attack.textureKey)
      .setVisible(true);

    this.attackSprite.anims.timeScale = 1;

    this.syncAttackSprite();

    this.secondarySprite?.setVisible(false);

    this.attackSprite.once(
      'animationcomplete',
      () => this.handleAttackAnimationComplete()
    );

    this.attackSprite.anims.play(attack.animationKey);
  }

  private handleAttackAnimationComplete(): void {
    const attack = this.currentAttack;

    if (!attack) return;

    // Hex debe terminar antes de finalizar el ataque.
    if (this.hexStarted) return;

    if (
      attack.reverseOnMiss &&
      !this.hasHit &&
      !this.isReversing
    ) {
      this.isReversing = true;

      this.attackSprite.once(
        'animationcomplete',
        () => this.finishAttack()
      );

      this.attackSprite.anims.playReverse(attack.animationKey);
      this.attackSprite.anims.timeScale = 3;

      return;
    }

    this.finishAttack();
  }

  update(): void {
    if (!this.attacking || !this.currentAttack) return;

    this.syncAttackSprite();

    const frame =
      this.attackSprite.anims.currentFrame?.index ?? -1;

    this.updateSecondaryAnimation(frame);
    this.updateVisualEffect(frame);

    if (this.isReversing) {
      this.hitboxGraphics.clear();
      return;
    }

    // Durante Hex, la hitbox permanece activa.
    if (this.hexStarted) {
      const hitbox = this.getHitbox(this.currentAttack);

      this.drawHitbox(hitbox);

      if (!this.hasHit) {
        this.checkHitbox(hitbox, this.currentAttack);
      }

      return;
    }

    const active =
      this.currentAttack.activeFrames.includes(frame);

    if (!active) {
      this.hitboxGraphics.clear();
      return;
    }

    const hitbox = this.getHitbox(this.currentAttack);

    this.drawHitbox(hitbox);

    if (!this.hasHit) {
      this.checkHitbox(hitbox, this.currentAttack);
    }
  }

  private drawHitbox(hitbox: Phaser.Geom.Rectangle): void {
    this.hitboxGraphics.clear();

    this.hitboxGraphics
      .fillStyle(0xff3333, 0.25)
      .fillRect(
        hitbox.x,
        hitbox.y,
        hitbox.width,
        hitbox.height
      );

    this.hitboxGraphics
      .lineStyle(2, 0xff3333, 1)
      .strokeRect(
        hitbox.x,
        hitbox.y,
        hitbox.width,
        hitbox.height
      );
  }

  private startHex(): void {
    if (this.hexStarted) return;

    this.hexStarted = true;

    this.onHexStateChange(true);

    this.hexTimer = this.scene.time.delayedCall(2000, () => {
      this.onHexStateChange(false);

      this.hexStarted = false;
      this.hexTimer = undefined;

      this.finishAttack();
    });
  }

  private updateVisualEffect(frame: number): void {
    const effect = this.currentAttack?.visualEffect;

    if (
      !effect ||
      effect.triggerOnHit ||
      this.visualEffectPlayed
    ) {
      return;
    }

    if (frame < effect.triggerFrame) return;

    if (!this.visualEffectPlayer) {
      console.warn(
        '[NeutralAttackController] No hay visualEffectPlayer conectado.'
      );
      return;
    }

    this.visualEffectPlayed = true;

    // Activar el temporizador de Hex al disparar su efecto.
    if (effect.key === 'hex-vortex') {
      this.startHex();
    }

    const direction: 1 | -1 =
      this.attacker.flipX ? 1 : -1;

    const scale = Math.abs(this.attacker.scaleX);

    this.visualEffectPlayer.play(
      effect,
      this.attacker.x + (effect.offsetX ?? 0) * direction,
      this.attackBaseY + (effect.offsetY ?? 0),
      direction,
      this.attacker.depth + 3,
      scale
    );
  }

  private playHitVisualEffect(
    attack: NeutralAttackDefinition,
    hurtboxParts: MatterJS.BodyType[]
  ): void {
    const effect =
      attack.hitVisualEffect ??
      (attack.visualEffect?.triggerOnHit
        ? attack.visualEffect
        : undefined);

    if (
      !effect ||
      this.hitVisualEffectPlayed ||
      !this.visualEffectPlayer ||
      hurtboxParts.length === 0
    ) {
      return;
    }

    this.hitVisualEffectPlayed = true;

    const minX = Math.min(
      ...hurtboxParts.map(part => part.bounds.min.x)
    );

    const maxX = Math.max(
      ...hurtboxParts.map(part => part.bounds.max.x)
    );

    const minY = Math.min(
      ...hurtboxParts.map(part => part.bounds.min.y)
    );

    const maxY = Math.max(
      ...hurtboxParts.map(part => part.bounds.max.y)
    );

    const headPart = hurtboxParts[0];

    const headX =
      (headPart.bounds.min.x + headPart.bounds.max.x) / 2;

    const headY = headPart.bounds.min.y;

    const area: NeutralVisualEffectArea = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      headX,
      headY
    };

    const direction: 1 | -1 =
      this.attacker.flipX ? -1 : 1;

    const scale = Math.abs(this.opponent.scaleX);

    this.visualEffectPlayer.play(
      effect,
      area.x + area.width / 2,
      area.y + area.height / 2,
      direction,
      this.opponent.depth + 5,
      scale,
      area
    );
  }

  private updateSecondaryAnimation(frame: number): void {
    const secondary = this.currentAttack?.secondaryAnimation;

    if (!secondary || this.secondaryPlayed) return;
    if (frame < secondary.triggerFrame) return;

    this.secondaryPlayed = true;

    if (
      !this.scene.textures.exists(secondary.textureKey) ||
      !this.scene.anims.exists(secondary.animationKey)
    ) {
      console.warn(
        `[NeutralAttackController] No se pudo reproducir la animación secundaria "${secondary.animationKey}".`
      );
      return;
    }

    if (!this.secondarySprite) {
      this.secondarySprite = this.scene.add.sprite(
        this.attacker.x,
        this.attackBaseY,
        secondary.textureKey
      );
    }

    const direction = this.attacker.flipX ? -1 : 1;

    this.secondarySprite
      .setTexture(secondary.textureKey)
      .setPosition(
        this.attacker.x + secondary.offsetX * direction,
        this.attackBaseY + secondary.offsetY
      )
      .setScale(
        this.attacker.scaleX * secondary.scale,
        this.attacker.scaleY * secondary.scale
      )
      .setFlipX(this.attacker.flipX)
      .setOrigin(0.5, 0.5)
      .setDepth(this.attacker.depth + 3)
      .setVisible(true);

    this.secondarySprite.once(
      'animationcomplete',
      () => this.secondarySprite?.setVisible(false)
    );

    this.secondarySprite.anims.play(secondary.animationKey);
  }

  private syncAttackSprite(): void {
    const y = this.currentAttack?.followAttackerY
      ? this.attacker.y
      : this.attackBaseY;

    this.attackSprite
      .setPosition(this.attacker.x, y)
      .setScale(this.attacker.scaleX, this.attacker.scaleY)
      .setFlipX(this.attacker.flipX)
      .setDepth(this.attacker.depth + 1)
      .setOrigin(this.attacker.originX, this.attacker.originY);
  }

  private getHitbox(
    attack: NeutralAttackDefinition
  ): Phaser.Geom.Rectangle {
    const direction = this.attacker.flipX ? -1 : 1;

    const x = direction === -1
      ? this.attacker.x - attack.hitboxOffsetX - attack.hitboxWidth
      : this.attacker.x + attack.hitboxOffsetX;

    const baseY = attack.followAttackerY
      ? this.attacker.y
      : this.attackBaseY;

    const y = baseY + attack.hitboxOffsetY;

    return new Phaser.Geom.Rectangle(
      x,
      y,
      attack.hitboxWidth,
      attack.hitboxHeight
    );
  }

  private checkHitbox(
    hitbox: Phaser.Geom.Rectangle,
    attack: NeutralAttackDefinition
  ): void {
    const body = this.opponent.body as MatterJS.BodyType | null;

    if (!body) return;

    const hurtboxParts =
      body.parts.length > 1
        ? body.parts.slice(1)
        : [body];

    for (const part of hurtboxParts) {
      const bounds = part.bounds;

      const hurtboxBounds = new Phaser.Geom.Rectangle(
        bounds.min.x,
        bounds.min.y,
        bounds.max.x - bounds.min.x,
        bounds.max.y - bounds.min.y
      );

      if (
        !Phaser.Geom.Intersects.RectangleToRectangle(
          hitbox,
          hurtboxBounds
        )
      ) {
        continue;
      }

      this.hasHit = true;

      this.takeDamage(attack.damage);

      this.showImpact(attack, hurtboxBounds);

      this.playHitVisualEffect(
        attack,
        hurtboxParts
      );

      return;
    }
  }

  private showImpact(
    attack: NeutralAttackDefinition,
    opponentBounds: Phaser.Geom.Rectangle
  ): void {
    const impact = attack.impact;

    if (!impact || !this.scene.textures.exists(impact.textureKey)) {
      return;
    }

    if (
      impact.animationKey &&
      !this.scene.anims.exists(impact.animationKey)
    ) {
      console.warn(
        `[NeutralAttackController] No existe la animación de impacto "${impact.animationKey}".`
      );
      return;
    }

    const x = (opponentBounds.left + opponentBounds.right) / 2;
    const y = (opponentBounds.top + opponentBounds.bottom) / 2;

    if (!this.impactSprite) {
      this.impactSprite = this.scene.add.sprite(
        x,
        y,
        impact.textureKey
      );
    }

    this.impactSprite
      .setTexture(impact.textureKey)
      .setPosition(
        x + (impact.offsetX ?? 0),
        y + (impact.offsetY ?? 0)
      )
      .setScale(impact.scale ?? 1)
      .setDepth(this.opponent.depth + 3)
      .setVisible(true);

    if (impact.animationKey) {
      this.impactSprite.once(
        'animationcomplete',
        () => this.impactSprite?.setVisible(false)
      );

      this.impactSprite.anims.play(impact.animationKey);
    } else {
      this.scene.time.delayedCall(180, () => {
        this.impactSprite?.setVisible(false);
      });
    }
  }

  private finishAttack(): void {
    this.hexTimer?.remove();
    this.hexTimer = undefined;

    if (this.hexStarted) {
      this.onHexStateChange(false);
      this.hexStarted = false;
    }

    this.isReversing = false;
    this.attackSprite.anims.timeScale = 1;

    this.attacking = false;
    this.currentAttack = undefined;

    this.attackSprite.setVisible(false);
    this.secondarySprite?.setVisible(false);
    this.hitboxGraphics.clear();

    this.attacker.setVisible(this.previousVisibility);

    if (this.bufferedPress) {
      this.bufferedPress = false;

      const useCrouchAttacks = this.bufferedCrouching;

      this.bufferedCrouching = false;

      this.startNextAttack(useCrouchAttacks);
      return;
    }

    this.onAttackStateChange(false, false);
  }

  destroy(): void {
    if (this.attacking) {
      this.attacker.setVisible(this.previousVisibility);
    }

    this.hexTimer?.remove();
    this.hexTimer = undefined;

    if (this.hexStarted) {
      this.onHexStateChange(false);
      this.hexStarted = false;
    }

    this.onAttackStateChange(false, false);

    this.attackSprite.destroy();
    this.hitboxGraphics.destroy();

    this.secondarySprite?.destroy();
    this.impactSprite?.destroy();

    this.visualEffectPlayer?.destroy();

    this.attacking = false;
    this.bufferedPress = false;
    this.bufferedCrouching = false;
    this.isReversing = false;
    this.currentAttack = undefined;
  }
}
