// Placeholder sim rule for M0. Pure: no three.js imports in src/sim.
export function advanceAngle(angle: number, dt: number, speed = Math.PI / 2): number {
  const next = angle + speed * dt;
  return next % (Math.PI * 2);
}
