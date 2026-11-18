
import type Phaser from 'phaser';

import type { CharacterDefinition } from '../../characters/types';
import type { InputManager } from '../input/InputManager';
import type { AnimationController } from '../animations/AnimationController';

const DEFAULT_DASH_WINDOW = 250;

export class DashController {
  private static readonly DASH_ATTACK_START_FRAME = 4;
  private static readonly DASH_ATTACK_END_FRAME = 6;

  private readonly fighter: Phaser.Physics.Matter.Sprite;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly definition: CharacterDefinition;
  private readonly input: InputManager;
  private readonly animations: AnimationController;

  private dashing = false;
  private dashAttackStarted = false;
  private waitingForSecondDashTap = false;

  private dashTapTimer = 0;
  private dashDirection: -1 | 1 = 1;

  constructor(
    fighter: Phaser.Physics.Matter.Sprite,
    visual: Phaser.GameObjects.Sprite,
    definition: CharacterDefinition,
    input: InputManager,
    animations: AnimationController
  ) {
    this.fighter = fighter;
    this.visual = visual;
    this.definition = definition;
    this.input = input;
    this.animations = animations;
  }

  get isDashing() {
    return this.dashing;
  }

get isAttackWindow() {
  const currentFrame =
    this.animations.getCurrentFrameIndex('dash');

  if (this.dashing) {
    console.log({
      dashPlaying: this.animations.isPlaying('dash'),
      currentFrame,
      dashAttackStarted: this.dashAttackStarted,
      attackWindow:
        currentFrame !== undefined &&
        currentFrame >= DashController.DASH_ATTACK_START_FRAME &&
        currentFrame <= DashController.DASH_ATTACK_END_FRAME
    });
  }

  if (!this.dashing || this.dashAttackStarted) {
    return false;
  }

  return (
    currentFrame !== undefined &&
    currentFrame >= DashController.DASH_ATTACK_START_FRAME &&
    currentFrame <= DashController.DASH_ATTACK_END_FRAME
  );
}

  updateInput(
    delta: number,
    grounded: boolean,
    neutralAttacking: boolean,
    takingDamage: boolean,
    abilityBlocksMovement: boolean
  ) {
    const dashConfig = this.definition.dash;

    if (!dashConfig || !this.animations.has('dash')) {
      return;
    }

    if (
      this.dashing ||
      !grounded ||
      neutralAttacking ||
      takingDamage ||
      abilityBlocksMovement
    ) {
      this.waitingForSecondDashTap = false;
      this.dashTapTimer = 0;
      return;
    }

    if (this.waitingForSecondDashTap) {
      this.dashTapTimer += delta;

      const window =
        dashConfig.doubleTapWindow ??
        DEFAULT_DASH_WINDOW;

      if (this.dashTapTimer > window) {
        this.waitingForSecondDashTap = false;
        this.dashTapTimer = 0;
      }
    }

    const defaultFlipX =
      this.definition.defaultFlipX ?? false;

    const facingRight =
      this.visual.flipX === defaultFlipX;

    const forwardAction = facingRight
      ? 'moveRight'
      : 'moveLeft';

    if (!this.input.justPressed(forwardAction)) {
      return;
    }

    if (this.waitingForSecondDashTap) {
      this.waitingForSecondDashTap = false;
      this.dashTapTimer = 0;

      this.startDash(facingRight ? 1 : -1);
      return;
    }

    this.waitingForSecondDashTap = true;
    this.dashTapTimer = 0;
  }

  updateMovement() {
    if (!this.dashing) {
      return;
    }

    const dashSpeed = this.definition.dash?.speed ?? 0;

    this.fighter.setVelocityX(
      this.dashDirection * dashSpeed / 60
    );
  }

  startDashAttack(): boolean {
    if (!this.isAttackWindow) {
      return false;
    }

    this.dashAttackStarted = true;

    this.animations.offComplete(
      'dash',
      this.finishDash
    );

    this.animations.onComplete(
      'dashAttack',
      this.finishDash
    );

    return true;
  }

  cancel() {
    this.waitingForSecondDashTap = false;
    this.dashTapTimer = 0;

    if (!this.dashing) {
      return;
    }

    this.dashing = false;
    this.dashAttackStarted = false;

    this.animations.offComplete(
      'dash',
      this.finishDash
    );

    this.animations.offComplete(
      'dashAttack',
      this.finishDash
    );

    this.fighter.setVelocityX(0);
  }

  destroy() {
    this.cancel();
  }

  private startDash(direction: -1 | 1) {
    const dashConfig = this.definition.dash;

    if (
      !dashConfig ||
      dashConfig.speed <= 0 ||
      this.dashing ||
      !this.animations.has('dash')
    ) {
      return;
    }

    this.dashing = true;
    this.dashAttackStarted = false;
    this.dashDirection = direction;

    this.waitingForSecondDashTap = false;
    this.dashTapTimer = 0;

    this.fighter.setVelocityX(
      direction * dashConfig.speed / 60
    );

    this.animations.onComplete(
      'dash',
      this.finishDash
    );

    this.animations.play('dash', false);
  }

  private readonly finishDash = () => {
    if (!this.dashing) {
      return;
    }

    this.dashing = false;
    this.dashAttackStarted = false;

    this.animations.offComplete(
      'dash',
      this.finishDash
    );

    this.animations.offComplete(
      'dashAttack',
      this.finishDash
    );

    this.fighter.setVelocityX(0);
  };
}
