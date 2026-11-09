import { describe, expect, it } from 'vitest';
import { advanceAngle } from '../src/sim/spin';

describe('advanceAngle', () => {
  it('advances by speed * dt', () => {
    expect(advanceAngle(0, 1, 1)).toBeCloseTo(1);
  });
  it('wraps at a full turn', () => {
    expect(advanceAngle(Math.PI * 2 - 0.1, 1, 0.2)).toBeCloseTo(0.1);
  });
});
