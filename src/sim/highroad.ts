// The high road and overhead barriers: the shapes the rules need (no Three.js here).
//
// A deck piece (trailer: ramp + deck; flatbed: deck only) is laid with `s` at its middle. Measured from its back
// end (r = 0, the ramp foot), its surface rises along the ramp to DECK_HEIGHT and stays there to the front (r = length).
// The car (its middle) rides that surface; anywhere else along the piece the body is a wall the car crashes into
// unless it is up level with the surface. Overhead barriers are thin: duck under them, never jump.
import {
  CAR_HEIGHT, DECK_HEIGHT, DUCK_HEIGHT, FLATBED_LENGTH, OVERHEAD_BOTTOM, RAMP_LENGTH, TRAILER_LENGTH,
} from './config';

export type DeckKind = 'trailer' | 'flatbed';
export const isDeck = (k: string): k is DeckKind => k === 'trailer' || k === 'flatbed';

/** Bumper to back end (m). */
export const deckLength = (k: DeckKind): number => (k === 'trailer' ? TRAILER_LENGTH : FLATBED_LENGTH);

/** Height of a deck piece's surface `r` m in front of its back end (0 outside it). */
export function deckSurface(k: DeckKind, r: number): number {
  if (r < 0 || r > deckLength(k)) return 0;
  if (k === 'trailer' && r < RAMP_LENGTH) return (DECK_HEIGHT * r) / RAMP_LENGTH;
  return DECK_HEIGHT;
}

/** How far (m) the car's middle at `distance` is in front of the back end of a deck piece whose middle is at `s`. */
export const deckOffset = (k: DeckKind, s: number, distance: number): number => distance - (s - deckLength(k) / 2);

/** Top of the car (m above the road): lower while ducking. */
export const carTop = (y: number, ducking: boolean): number => y + (ducking ? DUCK_HEIGHT : CAR_HEIGHT);

/** Does the car fit under an overhead barrier? */
export const underOverhead = (y: number, ducking: boolean): boolean => carTop(y, ducking) <= OVERHEAD_BOTTOM;
