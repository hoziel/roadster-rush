export type PowerKind = 'ludicrous' | 'autopilot' | 'supercharger' | 'hover';
export const POWER_KINDS: PowerKind[] = ['ludicrous', 'autopilot', 'supercharger', 'hover'];
export type EntityKind = 'coin' | 'cone' | PowerKind;
export const isPower = (k: EntityKind): k is PowerKind => (POWER_KINDS as string[]).includes(k);
