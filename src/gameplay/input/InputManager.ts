import type {
  InputAction,
  InputManagerOptions,
  KeyboardBinding
} from './types';

const defaultBindings: Record<InputAction, KeyboardBinding> = {
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: ['Space', 'KeyW'],
  crouch: ['ArrowDown', 'KeyS'],
  neutralAttack: 'KeyK',
  specialAttack: 'KeyJ'
};

const defaultGamepadBindings: Partial<Record<InputAction, number>> = {
  moveLeft: 14,
  moveRight: 15,
  jump: 0,
  neutralAttack: 2,
  specialAttack: 1
};

export class InputManager {
  private readonly bindings: Record<InputAction, KeyboardBinding>;
  private readonly keyboardEnabled: boolean;
  private readonly gamepadIndex?: number;
  private readonly keyboardState = new Set<string>();
  private previousState = new Set<InputAction>();
  private currentState = new Set<InputAction>();
  private gamepadConnected = false;

  constructor(options: InputManagerOptions = {}) {
    this.bindings = {
      ...defaultBindings,
      ...options.keyboardBindings
    };
    this.keyboardEnabled = options.keyboardEnabled ?? true;
    this.gamepadIndex = options.gamepadIndex;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('gamepadconnected', this.handleGamepadConnection);
    window.addEventListener('gamepaddisconnected', this.handleGamepadConnection);
  }

  update() {
    this.previousState = this.currentState;
    this.currentState = new Set<InputAction>();
    (Object.keys(this.bindings) as InputAction[]).forEach((action) => {
      const bindings = this.bindings[action] === undefined
        ? []
        : Array.isArray(this.bindings[action])
          ? this.bindings[action]
          : [this.bindings[action]];
      if (
        this.keyboardEnabled &&
        bindings.some((binding) => this.keyboardState.has(binding))
      ) {
        this.currentState.add(action);
      }
    });

    const gamepad = this.gamepadIndex === undefined
      ? undefined
      : navigator.getGamepads()[this.gamepadIndex];
    if (gamepad) {
      this.gamepadConnected = true;
      (Object.keys(defaultGamepadBindings) as InputAction[]).forEach((action) => {
        const buttonIndex = defaultGamepadBindings[action];
        if (buttonIndex !== undefined && gamepad.buttons[buttonIndex]?.pressed) {
          this.currentState.add(action);
        }
      });
      if (gamepad.axes[0] < -0.25) this.currentState.add('moveLeft');
      if (gamepad.axes[0] > 0.25) this.currentState.add('moveRight');
      if (gamepad.axes[1] > 0.25) this.currentState.add('crouch');
    }
  }

  isDown(action: InputAction) {
    return this.currentState.has(action);
  }

  justPressed(action: InputAction) {
    return this.currentState.has(action) && !this.previousState.has(action);
  }

  justReleased(action: InputAction) {
    return !this.currentState.has(action) && this.previousState.has(action);
  }

  isGamepadConnected() {
    return this.gamepadConnected;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnection);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadConnection);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    this.keyboardState.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.keyboardState.delete(event.code);
  };

  private readonly handleGamepadConnection = (event: GamepadEvent) => {
    this.gamepadConnected = event.type === 'gamepadconnected';
  };
}
