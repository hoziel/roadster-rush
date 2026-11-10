import { isObstacle, type ObstacleKind } from '../src/sim/spawner';
import { hitDepth } from '../src/sim/traffic';
import { jump, laneX, steer, type Entity, type World } from '../src/sim/world';

/**
 * Road part of the dodging bot: cones, cars and trucks within 14 m (or level with the car) block their lane.
 * Moves to the nearest free lane without cutting across a lane with something right beside it; jumps a
 * cone or car when boxed in.
 */
export function dodge(w: World): void {
  if (Math.abs(w.x - laneX(w.lane)) > 0.05) return; // finish the current lane change first
  const obstacles = w.entities.filter((e) => e.alive && e.bumped === undefined && isObstacle(e.kind));
  const span = (e: Entity) => { const rel = e.s - w.distance, h = hitDepth(e.kind as ObstacleKind); return [rel - h, rel + h]; };
  // Cones count until their middle is passed (as before traffic); traffic until we're clear of its front.
  const ahead = obstacles.filter((e) => { const [a, b] = span(e); return (e.kind === 'cone' ? e.s > w.distance : b > -0.2) && a < 14; });
  const beside = new Set(ahead.filter((e) => span(e)[0] < 3).map((e) => e.lane));
  const blocked = new Set(ahead.map((e) => e.lane));
  if (!blocked.has(w.lane)) return;
  const free = [0, 1, 2].filter((l) => !blocked.has(l))
    .filter((l) => { for (let k = Math.min(l, w.lane) + 1; k < Math.max(l, w.lane); k++) if (beside.has(k)) return false; return true; })
    .sort((a, b) => Math.abs(a - w.lane) - Math.abs(b - w.lane))[0];
  if (free !== undefined) { steer(w, free > w.lane ? 1 : -1); return; }
  const mine = ahead.filter((e) => e.lane === w.lane).sort((a, b) => a.s - b.s)[0];
  if (mine && mine.kind !== 'truck' && span(mine)[0] < 8) jump(w);
}
