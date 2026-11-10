// All tunable numbers for the rules live here.
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5; // m between lane centres
export const LANE_CHANGE_SPEED = 22; // m/s sideways (one lane in ~0.11 s: snappy like Subway Surfers)

export const SPEED_START = 21; // m/s (~75 km/h; was 18, Ofir: Subway Surfers feels faster)
export const SPEED_MAX = 40; // m/s (~145 km/h), the cap; Subway Surfers' top is estimated ~150 km/h
// Speed climbs in gear-like steps, like Subway Surfers' steady per-minute increases, so a kid feels each one:
// every SPEED_STEP_TIME s it surges up over SPEED_SURGE s, until SPEED_MAX after SPEED_STEPS steps (~3 min).
export const SPEED_STEP_TIME = 12; // s between speed-ups (was 20: accelerate sooner)
export const SPEED_STEPS = 9; // steps from start to cap ((36-18)/9 = +2 m/s each)
export const SPEED_SURGE = 2; // s to ease into the next step

/** Swipe down in the air slams the car straight back down at this speed (m/s). */
export const SLAM_VELOCITY = 26;
/** A jump swiped just before landing still fires on touchdown within this window (s). */
export const JUMP_BUFFER = 0.18;
export const JUMP_VELOCITY = 10; // m/s (snappier arc: 0.71 s airtime, 1.8 m peak)
export const GRAVITY = 28; // m/s²



// m ahead of the car we keep laid. Far enough that traffic, which is laid this far ahead and then pulled
// back to meet the car on time (see layTraffic in world.ts), still appears beyond ~110 m, deep in the fog.
export const SPAWN_AHEAD = 200;
export const DESPAWN_BEHIND = 10; // m behind the car we recycle

export const HIT_DEPTH = 0.9; // m half-depth of the collision box along the road
export const HIT_HALF_WIDTH = 1.0; // m half-width across lanes
export const CONE_HEIGHT = 0.75; // m; clear it by jumping
export const COIN_VALUE = 10;

// Traffic: cars and trucks driving the same way, slower than us, so we overtake them (src/sim/traffic.ts).
// All traffic drives at one speed, so it never runs into other traffic and each chunk keeps its layout.
export const TRAFFIC_SPEED = 8; // m/s (~30 km/h)
export const PLAYER_HALF_LENGTH = 1.0; // m: added to an obstacle's half length for the collision depth
export const CAR_LENGTH = 2.8; // m, sedan/taxi/hatchback/SUV/van
export const CAR_ROOF = 1.35; // m: the roof a jump lands on (you ride it until you're past)
export const CAR_CLEAR = 1.1; // m: be at least this high when you reach a car to land on it (peak jump 1.8)
export const TRUCK_LENGTH = 5.0; // m, delivery and garbage trucks
export const TRUCK_HEIGHT = 2.4; // m: higher than any jump, so trucks must be passed by changing lanes
export const ROOF_COIN_HEIGHT = 2.15; // m: coins floating over a car roof
export const ROOF_COIN_REACH = 1.6; // m: an air coin is collected when the car is at most this far below it
export const TRAFFIC_FIRST_AT = 60; // m into a run before traffic chunks can appear
export const TRAFFIC_CHANCE = 0.4; // per cone-chunk slot: start a run of traffic chunks
export const TRAFFIC_RUN = [1, 3]; // extra traffic chunks after the first in a run (min, max)
export const TRAFFIC_SLACK = 1.0; // s of crash slowdowns allowed for when keeping the road after traffic clear
export const TRAFFIC_GHOST_DIST = 90; // m: traffic pulled back over older cones may only pass them this far away

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

// Tube tunnel: a round tunnel laid in place of chunks. Inside, the lanes become slots around the ring
// (slot 0 at the bottom, +1 to the right) and the car can drive up the walls and upside down.
export const TUNNEL_SLOTS = 8;
export const TUNNEL_RADIUS = 4.5; // m from the tube's axis to its wall
export const TUNNEL_LENGTH = 150; // m of tube
export const TUNNEL_ENTRY = 15; // m of cone-free tube after the mouth
export const TUNNEL_EXIT = 25; // m before the end: the car slides back down to a bottom slot, nothing laid here
export const TUNNEL_CHANCE = 0.3; // per chunk slot once the gap has passed
export const TUNNEL_FIRST_AT = 500; // m into a run before the first tunnel can appear
export const TUNNEL_MIN_GAP = 600; // m between tunnels

// Police stops and construction zones: static chunk types laid now and then in place of a cone chunk
// (src/sim/chunks/austin.json, kind "police" / "construction"). Sizes match the models in src/view/roadwork.ts.
export const POLICE_GAP = [400, 600]; // m from one police stop to the next (min, max)
export const POLICE_FIRST_AT = 300; // m into a run before the first police stop
export const WORK_GAP = [300, 450]; // m from one construction zone's start to the next (a bit more often than police)
export const WORK_FIRST_AT = 180; // m into a run before the first construction zone
export const WORK_RUN = [1, 2]; // chunks in one construction zone (min, max)
export const ZONE_SPACING = 120; // m kept between a police stop and a construction zone
export const ZONE_AFTER_BLOCK = 40; // m of plain road after a tube tunnel or Bat Swarm before either
export const ZONE_WARN = 75; // m ahead of a stop when its "Police stop!" / "Road work!" toast fires
export const SPIKES_HEIGHT = 0.15; // m: a flat spike strip; any jump clears it
export const PARKED_POLICE_LENGTH = 3.6; // m along the road: the police roadster parked at a slight angle
export const PARKED_POLICE_CLEAR = 1.1; // m: jump over it like a car...
export const PARKED_POLICE_ROOF = 1.2; // m: ...or land on its roof (with the light bar) and ride it
export const BARRIER_HEIGHT = 0.75; // m: the low striped barrier, as high as a cone; jump it
export const FENCE_HEIGHT = 2.1; // m: the tall construction fence, higher than any jump
export const DIGGER_LENGTH = 3.6; // m: the parked digger (tractor shovel)
export const DIGGER_HEIGHT = 2.2; // m: higher than any jump

// Longhorns crossing: a small herd (1-3) walking across the road, laid now and then in place of a cone chunk
// (austin.json, kind "longhorns"). Each animal walks one lane over while the car closes the last LONGHORN_WALK
// metres, so where it stands when the car gets there is fixed in advance: the validator checks those lanes like
// cones, and the walk (one lane per LONGHORN_WALK m, ~0.9-1.7 m/s at our speeds) reads as a slow amble.
export const LONGHORN_GAP = [450, 700]; // m from one crossing to the next (min, max)
export const LONGHORN_FIRST_AT = 400; // m into a run before the first crossing
export const LONGHORN_WALK = 60; // m of approach over which an animal walks from its `from` lane to its `to` lane
export const LONGHORN_DEPTH = 1.0; // m along the road (it walks sideways: this is its body's width)
export const LONGHORN_HIT_X = 1.5; // m across: body half length (0.9) plus part of the car's half width
export const LONGHORN_HEIGHT = 1.9; // m with the horns: higher than any jump, so steer round

// The high road: parked trailers with a loading ramp at the back (austin.json, kind "highroad"). Drive up the
// ramp to ride the deck, hop deck to deck, drive off the front back to the road. The deck is higher than any
// jump from the road (peak 1.8 m), so the ramp (or another deck) is the only way up; side-on or front-on it's a
// wall, like a truck. Laid now and then in place of a cone chunk; a train chunk is two chunk lengths long.
export const DECK_HEIGHT = 2.0; // m: the deck you ride (jump peak 1.8 + DECK_STEP < 2.0: no jumping up from the side)
export const TRAILER_LENGTH = 18; // m bumper to ramp foot: the ramp trailer...
export const RAMP_LENGTH = 7; // m: ...whose back RAMP_LENGTH is the ramp (slope 2/7: 0.14 m a sim step even at Ludicrous)
export const FLATBED_LENGTH = 14; // m: a flatbed with no ramp, parked nose to tail in front of another deck
export const DECK_STEP = 0.15; // m: landing from the air, you settle onto a deck you're at most this far below
export const DECK_CLIMB = 0.3; // m: driving (not in the air), you roll up a slope that rises at most this far a step
export const HIGHROAD_GAP = [380, 560]; // m from one high road to the next (min, max)
export const HIGHROAD_FIRST_AT = 240; // m into a run before the first high road
export const TRAIN_CHUNKS = 2; // a train chunk is this many chunk lengths

// Ducking: swipe down on the ground squashes the car low for DUCK_TIME (in the air it slams down and lands ducked).
export const DUCK_TIME = 0.6; // s
export const CAR_HEIGHT = 1.15; // m: the roadster's roof
export const DUCK_HEIGHT = 0.55; // m: its roof while ducking
// Overhead barrier: a striped beam with a LOW CLEARANCE board above it, on posts across 1-3 lanes. Duck under it;
// it's too tall to jump (the board reaches above a jump's peak), so the rule is always the same: duck.
export const OVERHEAD_BOTTOM = 0.85; // m: underside of the beam (ducked roof 0.55 fits, the 1.15 m roof doesn't)
export const OVERHEAD_TOP = 2.45; // m: top of the board, above a jump's 1.8 m peak plus the car
