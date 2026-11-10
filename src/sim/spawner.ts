export type PowerKind = 'ludicrous' | 'autopilot' | 'supercharger' | 'hover';
export const POWER_KINDS: PowerKind[] = ['ludicrous', 'autopilot', 'supercharger', 'hover'];
/**
 * cone; car and truck (moving traffic); spikes (police spike strip), police (a parked police roadster);
 * barrier (low, jumpable), fence and digger (tall) in construction zones.
 */
export type ObstacleKind = 'cone' | 'car' | 'truck' | 'spikes' | 'police' | 'barrier' | 'fence' | 'digger';
/** Big static props that pop aside with a "boing" when a shield hits them, like traffic (cones just flatten). */
export type PropKind = 'police' | 'barrier' | 'fence' | 'digger';
export type EntityKind = 'coin' | ObstacleKind | PowerKind;
const OBSTACLES: readonly string[] = ['cone', 'car', 'truck', 'spikes', 'police', 'barrier', 'fence', 'digger'];
const PROPS: readonly string[] = ['police', 'barrier', 'fence', 'digger'];
export const isPower = (k: EntityKind): k is PowerKind => (POWER_KINDS as string[]).includes(k);
export const isObstacle = (k: string): k is ObstacleKind => OBSTACLES.includes(k);
export const isTraffic = (k: string): k is 'car' | 'truck' => k === 'car' || k === 'truck';
export const isProp = (k: string): k is PropKind => PROPS.includes(k);
/** Obstacles that stand still on the road (everything but traffic). */
export const isStatic = (k: string): boolean => isObstacle(k) && !isTraffic(k);
