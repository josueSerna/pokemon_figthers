export type AttackType = 'neutral' | 'special' | 'air' | 'charged';

export interface AttackHitbox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface AttackDefinition {
  id: string;
  name: string;
  type: AttackType;
  damage: number;
  range: number;
  recoveryMs: number;
  cooldownMs?: number;
  animationKeys: readonly string[];
  hitboxes: readonly AttackHitbox[];
  priority?: number;
}
