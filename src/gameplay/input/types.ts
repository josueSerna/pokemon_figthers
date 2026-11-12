export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'crouch'
  | 'neutralAttack'
  | 'specialAttack';

export type KeyboardBinding = string | readonly string[];
export type KeyboardBindings = Partial<Record<InputAction, KeyboardBinding>>;

export interface InputManagerOptions {
  keyboardBindings?: KeyboardBindings;
  keyboardEnabled?: boolean;
  gamepadIndex?: number;
}
