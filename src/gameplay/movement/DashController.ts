
import type Phaser from 'phaser';

import type { CharacterDefinition } from '../../characters/types';
import type { InputManager } from '../input/InputManager';
import type { AnimationController } from '../animations/AnimationController';

const DEFAULT_DASH_WINDOW = 250;

type DashType = 'forward' | 'back';

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
  private dashType: DashType = 'forward';

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
    if (!this.dashing || this.dashType !== 'forward' || this.dashAttackStarted) {
      return false;
    }

    const currentFrame =
      this.animations.getCurrentFrameIndex('dash');

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

    if (
      !dashConfig ||
      !this.animations.has('dash') ||
      !this.animations.has('dash-back')
    ) {
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

    const backwardAction = facingRight
      ? 'moveLeft'
      : 'moveRight';

    let pressedDirection: DashType | null = null;
    let direction: -1 | 1 = 1;

    if (this.input.justPressed(forwardAction)) {
      pressedDirection = 'forward';
      direction = facingRight ? 1 : -1;
    } else if (this.input.justPressed(backwardAction)) {
      pressedDirection = 'back';
      direction = facingRight ? -1 : 1;
    }

    if (!pressedDirection) {
      return;
    }

    if (this.waitingForSecondDashTap) {
      if (this.dashType !== pressedDirection) {
        this.waitingForSecondDashTap = false;
        this.dashTapTimer = 0;

        this.dashType = pressedDirection;
        this.waitingForSecondDashTap = true;
        return;
      }

      this.waitingForSecondDashTap = false;
      this.dashTapTimer = 0;

      this.startDash(direction, pressedDirection);
      return;
    }

    this.dashType = pressedDirection;
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
      'dash-back',
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

  private startDash(
    direction: -1 | 1,
    type: DashType
  ) {
    const dashConfig = this.definition.dash;

    const animationKey =
      type === 'forward' ? 'dash' : 'dash-back';

    if (
      !dashConfig ||
      dashConfig.speed <= 0 ||
      this.dashing ||
      !this.animations.has(animationKey)
    ) {
      return;
    }

    this.dashing = true;
    this.dashAttackStarted = false;
    this.dashDirection = direction;
    this.dashType = type;

    this.waitingForSecondDashTap = false;
    this.dashTapTimer = 0;

    this.fighter.setVelocityX(
      direction * dashConfig.speed / 60
    );

    this.animations.onComplete(
      animationKey,
      this.finishDash
    );

    this.animations.play(animationKey, false);
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
      'dash-back',
      this.finishDash
    );

    this.animations.offComplete(
      'dashAttack',
      this.finishDash
    );

    this.fighter.setVelocityX(0);
  };
}
