
import type { AnimationController } from '../AnimationController';
import type { AnimationSystem } from '../types';

export interface JumpPhysics {
  velocityY: number;
  distanceToGround: number;
  grounded: boolean;
}

type JumpState =
  | 'none'
  | 'jump'
  | 'jump-up'
  | 'double-jump'
  | 'jump-fall'
  | 'jump-land';

const FALL_VELOCITY_THRESHOLD = 0.5;
const LANDING_DISTANCE = 48;

export class JumpAnimationController implements AnimationSystem {
  private readonly animations: AnimationController;

  private state: JumpState = 'none';

  private lastVelocityY = 0;
  private lastDistanceToGround = Infinity;
  private lastGrounded = false;

  private jumpUpFinished = false;

  constructor(animations: AnimationController) {
    this.animations = animations;

    this.animations.onComplete(
      'jump',
      this.handleJumpComplete
    );

    this.animations.onComplete(
      'jump-up',
      this.handleJumpUpComplete
    );

    this.animations.onComplete(
      'jump-land',
      this.handleLandingComplete
    );
  }

  setup() {}

  get isActive() {
    return this.state !== 'none';
  }

  startJump(isDoubleJump = false) {
    this.lastVelocityY = 0;
    this.lastDistanceToGround = Infinity;
    this.lastGrounded = false;
    this.jumpUpFinished = false;

    if (isDoubleJump) {
      this.changeState('double-jump');
      return;
    }

    this.changeState('jump');
  }

  setPhysics(physics: JumpPhysics) {
    this.lastVelocityY = physics.velocityY;
    this.lastDistanceToGround = physics.distanceToGround;
    this.lastGrounded = physics.grounded;

    if (
      this.state === 'none' ||
      this.state === 'jump-land'
    ) {
      return;
    }

    // No interrumpir la animación inicial.
    if (this.state === 'jump') {
      return;
    }

    // Darle tiempo a jump-up para mostrar sus cuatro frames.
    if (
      this.state === 'jump-up' &&
      !this.jumpUpFinished
    ) {
      return;
    }

    if (physics.grounded) {
      this.changeState('jump-land');
      return;
    }

    // Todavía está ascendiendo.
    if (physics.velocityY <= FALL_VELOCITY_THRESHOLD) {
      return;
    }

    // Está descendiendo y cerca del suelo.
    if (physics.distanceToGround <= LANDING_DISTANCE) {
      this.changeState('jump-land');
      return;
    }

    if (this.state !== 'jump-fall') {
      this.changeState('jump-fall');
    }
  }

  update(_delta: number) {}

  destroy() {
    this.animations.offComplete(
      'jump',
      this.handleJumpComplete
    );

    this.animations.offComplete(
      'jump-up',
      this.handleJumpUpComplete
    );

    this.animations.offComplete(
      'jump-land',
      this.handleLandingComplete
    );

    this.state = 'none';
  }

  private readonly handleJumpComplete = () => {
    if (this.state !== 'jump') {
      return;
    }

    this.changeState('jump-up');
  };

  private readonly handleJumpUpComplete = () => {
    if (this.state !== 'jump-up') {
      return;
    }

    this.jumpUpFinished = true;

    // Si ya está descendiendo, ahora sí puede cambiar.
    if (this.lastGrounded) {
      this.changeState('jump-land');
      return;
    }

    if (this.lastVelocityY > FALL_VELOCITY_THRESHOLD) {
      if (this.lastDistanceToGround <= LANDING_DISTANCE) {
        this.changeState('jump-land');
      } else {
        this.changeState('jump-fall');
      }
    }
  };

  private readonly handleLandingComplete = () => {
    if (this.state !== 'jump-land') {
      return;
    }

    this.state = 'none';
  };

  private changeState(nextState: JumpState) {
    if (this.state === nextState) {
      return;
    }

    if (!this.animations.has(nextState)) {
      return;
    }

    this.state = nextState;
    this.animations.play(nextState);
  }
}
