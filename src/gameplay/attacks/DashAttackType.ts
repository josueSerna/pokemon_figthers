
export interface DashAttackDefinition {
  damage: number;

  hitboxWidth: number;
  hitboxHeight: number;

  hitboxOffsetX: number;
  hitboxOffsetY: number;
}

export interface CharacterDashAttackConfig {
  dashAttack: DashAttackDefinition;
}
