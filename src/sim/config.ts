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

// Kid mode and police chase
export const BATTERIES = 3;
export const INVULN_TIME = 1.5; // s of blinking grace after a crash
export const STUMBLE_TIME = 1.5; // s of slowdown after a crash
export const STUMBLE_SLOWDOWN = 0.4; // fraction of speed lost right after a crash
export const CHASE_TIME = 6; // s the police stays close after a crash

// Power-ups
export const POWER_CHANCE = 0.08; // per row, in a free lane
export const POWER_START_AFTER = 12; // s into a run before power-ups appear
export const LUDICROUS_TIME = 5;
export const LUDICROUS_BOOST = 1.5;
export const AUTOPILOT_TIME = 8;
export const HOVER_TIME = 5;
export const HOVER_HEIGHT = 1.6;
export const HOVER_RISE = 6; // m/s up/down
export const AUTOPILOT_LOOKAHEAD = 22;
