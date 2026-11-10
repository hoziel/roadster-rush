export type PowerKind = 'ludicrous' | 'autopilot' | 'supercharger' | 'hover';
export const POWER_KINDS: PowerKind[] = ['ludicrous', 'autopilot', 'supercharger', 'hover'];
export type ObstacleKind = 'cone' | 'car' | 'truck';
export type EntityKind = 'coin' | ObstacleKind | PowerKind;
export const isPower = (k: EntityKind): k is PowerKind => (POWER_KINDS as string[]).includes(k);
export const isObstacle = (k: string): k is ObstacleKind => k === 'cone' || k === 'car' || k === 'truck';
export const isTraffic = (k: string): k is 'car' | 'truck' => k === 'car' || k === 'truck';
