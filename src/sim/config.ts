// All tunable numbers for the rules live here.
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5; // m between lane centres
export const LANE_CHANGE_SPEED = 16; // m/s sideways

export const SPEED_START = 12; // m/s
export const SPEED_MAX = 28; // m/s, the kid-playable cap (tune after playtest)
export const SPEED_TAU = 90; // s; ~95% of the way to the cap after 3 * TAU

export const JUMP_VELOCITY = 9; // m/s
export const GRAVITY = 22; // m/s²



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
export const INTRO_CHASE_TIME = 4; // s the police tails you at the start of every run (harmless)

// Power-ups
export const POWER_CHANCE = 0.08; // base rate; chunk power slots fill at 4x this
export const POWER_START_AFTER = 12; // s into a run before power-ups appear
export const LUDICROUS_TIME = 5;
export const LUDICROUS_BOOST = 1.5;
export const AUTOPILOT_TIME = 8;
export const HOVER_TIME = 8; // s per hover-button press
export const HOVER_CHARGES_MAX = 3; // hover pickups bank charges for the button, up to this
export const HOVER_CHARGES_START = 1; // every run starts with one, so kids find the button
export const HOVER_HEIGHT = 1.6;
export const HOVER_RISE = 6; // m/s up/down
export const AUTOPILOT_LOOKAHEAD = 22;

// Sunset-to-night cycle (phase 0..1 loops: 0 sunset, ~0.3 dusk, ~0.5-0.8 night, back to sunset)
export const DAY_CYCLE = 210; // s of driving for one full loop
export const DUSK_START = 0.18; // phase window when the Bat Swarm can happen
export const DUSK_END = 0.42;

// Bat Swarm: a stretch of coin lines across every lane, laid in place of a chunk
export const SWARM_PAD = 6; // m of empty road before and after the coin rain
export const SWARM_LENGTH = 30; // m of coin rain
export const SWARM_COIN_SPACING = 2.2; // m between coin rows
export const SWARM_CHANCE = 0.35; // per chunk slot at dusk, once the gap has passed
export const SWARM_MIN_GAP = 350; // m between swarms
