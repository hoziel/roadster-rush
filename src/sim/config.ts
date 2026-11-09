// All tunable numbers for the rules live here.
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5; // m between lane centres
export const LANE_CHANGE_SPEED = 16; // m/s sideways

export const SPEED_START = 12; // m/s
export const SPEED_MAX = 28; // m/s, the kid-playable cap (tune after playtest)
export const SPEED_TAU = 90; // s; ~95% of the way to the cap after 3 * TAU

export const JUMP_VELOCITY = 9; // m/s
export const GRAVITY = 22; // m/s²

export const ROW_SPACING_MIN = 14; // m between obstacle rows
export const ROW_SPACING_MAX = 22;
export const SPAWN_AHEAD = 120; // m ahead of the car we keep filled
export const DESPAWN_BEHIND = 10; // m behind the car we recycle

export const HIT_DEPTH = 0.9; // m half-depth of the collision box along the road
export const HIT_HALF_WIDTH = 1.0; // m half-width across lanes
export const CONE_HEIGHT = 0.75; // m; clear it by jumping
export const COIN_VALUE = 10;
