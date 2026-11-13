
import Phaser from 'phaser';

export type NeutralAttackType = 'melee' | 'ranged';

export interface NeutralImpactDefinition {
  textureKey: string;
  animationKey?: string;
  frameStart?: number;
  frameEnd?: number;
  frameRate?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface NeutralSecondaryAnimation {
  textureKey: string;
  animationKey: string;
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  triggerFrame: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface NeutralAttackDefinition {
  type: NeutralAttackType;
  animationKey: string;
  textureKey: string;
  damage: number;
  activeFrames: number[];
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  secondaryAnimation?: NeutralSecondaryAnimation;
  impact?: NeutralImpactDefinition;
}

interface MatterBounds {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

export class NeutralAttackController {
  private readonly scene: Phaser.Scene;
  private readonly attacker: Phaser.GameObjects.Sprite;
  private readonly opponent: Phaser.Physics.Matter.Sprite;
  private readonly takeDamage: (amount: number) => void;
  private readonly onAttackStateChange: (attacking: boolean) => void;

  private readonly attacks: (NeutralAttackDefinition | undefined)[];

  private readonly attackSprite: Phaser.GameObjects.Sprite;
  private readonly hitboxGraphics: Phaser.GameObjects.Graphics;

  private secondarySprite?: Phaser.GameObjects.Sprite;
  private impactSprite?: Phaser.GameObjects.Sprite;

  private comboIndex = 0;
  private comboDeadline = 0;

  private attacking = false;
  private bufferedPress = false;
  private hasHit = false;
  private secondaryPlayed = false;
  private previousVisibility = true;

  private currentAttack?: NeutralAttackDefinition;

  // Posición vertical conservada durante el ataque.
  private attackBaseY = 0;

  constructor(
    scene: Phaser.Scene,
    attacker: Phaser.GameObjects.Sprite,
    opponent: Phaser.Physics.Matter.Sprite,
    takeDamage: (amount: number) => void,
    attacks: (NeutralAttackDefinition | undefined)[],
    onAttackStateChange: (attacking: boolean) => void = () => {}
  ) {
    this.scene = scene;
    this.attacker = attacker;
    this.opponent = opponent;
    this.takeDamage = takeDamage;
    this.attacks = attacks;
    this.onAttackStateChange = onAttackStateChange;

    const firstAttack = attacks.find(
      (attack): attack is NeutralAttackDefinition => !!attack
    );

    if (!firstAttack) {
      throw new Error('El Pokémon necesita al menos un ataque configurado.');
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
    for (const attack of this.attacks) {
      if (!attack) continue;

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
        `[NeutralAttackController] Frames inválidos en "${animationKey}". ` +
        `La textura "${textureKey}" tiene índices de 0 a ${totalFrames}.`
      );
      return;
    }

    const frames = this.scene.anims.generateFrameNumbers(
      textureKey,
      {
        start: frameStart,
        end: frameEnd
      }
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

  press(): void {
    if (this.attacking) {
      this.bufferedPress = true;
      return;
    }

    const now = this.scene.time.now;

    if (now > this.comboDeadline) {
      this.comboIndex = 0;
    }

    this.startNextAttack();
  }

  private startNextAttack(): void {
    const attack = this.attacks[this.comboIndex];

    if (!attack) {
      this.comboIndex = 0;
      this.bufferedPress = false;
      this.onAttackStateChange(false);
      return;
    }

    if (
      !this.scene.textures.exists(attack.textureKey) ||
      !this.scene.anims.exists(attack.animationKey)
    ) {
      console.error(
        `[NeutralAttackController] No se puede reproducir "${attack.animationKey}". ` +
        'Falta su textura o animación.'
      );

      this.comboIndex = 0;
      this.bufferedPress = false;
      this.onAttackStateChange(false);
      return;
    }

    this.comboIndex = (this.comboIndex + 1) % this.attacks.length;
    this.comboDeadline = this.scene.time.now + 900;

    this.startAttack(attack);
  }

  private startAttack(attack: NeutralAttackDefinition): void {
    this.attacking = true;
    this.hasHit = false;
    this.secondaryPlayed = false;
    this.currentAttack = attack;

    this.onAttackStateChange(true);

    // Conservamos la altura al comenzar el ataque.
    this.attackBaseY = this.attacker.y;

    this.previousVisibility = this.attacker.visible;
    this.attacker.setVisible(false);

    this.attackSprite
      .setTexture(attack.textureKey)
      .setVisible(true);

    this.syncAttackSprite();

    this.secondarySprite?.setVisible(false);

    this.attackSprite.once(
      'animationcomplete',
      () => this.finishAttack()
    );

    this.attackSprite.anims.play(attack.animationKey);
  }

  update(): void {
    if (!this.attacking || !this.currentAttack) return;

    this.syncAttackSprite();

    const frame =
      this.attackSprite.anims.currentFrame?.index ?? -1;

    this.updateSecondaryAnimation(frame);

    const active = this.currentAttack.activeFrames.includes(frame);

    if (!active) {
      this.hitboxGraphics.clear();
      return;
    }

    const hitbox = this.getHitbox(this.currentAttack);

    this.hitboxGraphics.clear();

    this.hitboxGraphics
      .fillStyle(0xff3333, 0.25)
      .fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);

    this.hitboxGraphics
      .lineStyle(2, 0xff3333, 1)
      .strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);

    if (!this.hasHit) {
      this.checkHitbox(hitbox, this.currentAttack);
    }
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
    this.attackSprite
      .setPosition(this.attacker.x, this.attackBaseY)
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

    const y = this.attackBaseY + attack.hitboxOffsetY;

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
    if (!this.opponent.body) return;

    const body = this.opponent.body as unknown as {
      bounds: MatterBounds;
    };

    const bounds = body.bounds;

    const opponentBounds = new Phaser.Geom.Rectangle(
      bounds.min.x,
      bounds.min.y,
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y
    );

    if (
      !Phaser.Geom.Intersects.RectangleToRectangle(
        hitbox,
        opponentBounds
      )
    ) {
      return;
    }

    this.hasHit = true;
    this.takeDamage(attack.damage);

    this.showImpact(attack, opponentBounds);
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
    this.attacking = false;
    this.currentAttack = undefined;

    this.attackSprite.setVisible(false);
    this.secondarySprite?.setVisible(false);
    this.hitboxGraphics.clear();

    this.attacker.setVisible(this.previousVisibility);

    if (this.bufferedPress) {
      this.bufferedPress = false;
      this.startNextAttack();
      return;
    }

    this.onAttackStateChange(false);
  }

  destroy(): void {
    if (this.attacking) {
      this.attacker.setVisible(this.previousVisibility);
    }

    this.onAttackStateChange(false);

    this.attackSprite.destroy();
    this.hitboxGraphics.destroy();

    this.secondarySprite?.destroy();
    this.impactSprite?.destroy();

    this.attacking = false;
    this.bufferedPress = false;
    this.currentAttack = undefined;
  }
}
