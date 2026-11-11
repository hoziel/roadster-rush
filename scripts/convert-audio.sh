#!/usr/bin/env bash
# Makes the web-ready audio in public/themes/austin/audio/ from the raw CC0 / CC-BY files in assets-src/audio/.
# Needs ffmpeg (brew install ffmpeg; it reads .ogg) and afconvert (built into macOS; Apple's AAC encoder).
# Output: mono AAC-LC .m4a, 44.1 kHz, which iOS Safari decodes with decodeAudioData.
#
# The music is trimmed to whole bars so it loops cleanly. The loop points (in seconds from the music's
# first sample) live in src/audio/music.ts; keep them in sync if you change a trim here.
#   run     kevin-macleod-hillbilly-swing (~145 bpm): loop samples 584530-6423991 (13.25-145.67 s, 80 bars),
#           found by matching the seam; scripts/bake-loop.mjs crossfades the last 0.3 s into the loop start
#   climax  pure-raceway-climax-175 (175 bpm, 1 bar = 60480 samples): ship bars 0-25, loop bars 1-25 (32.9 s)
#   menu    juhani-junkala-title-screen (170 bpm, 1 bar ~ 62259 samples, music starts at sample 1081):
#           ship bars 0-7, loop bars 1-7 (8.5 s); the original fades out after bar 8
# Each file keeps ~50 ms (2205 samples) past its loop end so the decoder's end padding never cuts it.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets-src/audio
OUT=public/themes/austin/audio
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
BITRATE=56000

# name, source, first sample, last sample (exclusive)
trim() {
  ffmpeg -v error -y -i "$2" -af "atrim=start_sample=$3:end_sample=$4,asetpts=PTS-STARTPTS" \
    -ac 1 -ar 44100 -c:a pcm_s16le "$TMP/$1.wav"
}
aac() {
  afconvert -f m4af -d aac -b "$BITRATE" -c 1 "$TMP/$1.wav" "$OUT/$1.m4a"
}

ffmpeg -v error -y -i "$SRC/music/kevin-macleod-hillbilly-swing.mp3" -ac 1 -ar 44100 -f f32le "$TMP/run.f32"
node scripts/bake-loop.mjs "$TMP/run.f32" 584530 6423991 "$TMP/music-run.wav"
trim music-climax "$SRC/music/pure-raceway-climax-175.ogg"     0    $((25 * 60480 + 2205))
trim music-menu   "$SRC/music/juhani-junkala-title-screen.mp3" 1081 $((1081 + 7 * 62259 + 2205))
for n in music-run music-climax music-menu; do aac "$n"; done

# Bike horn: short SFX, mono already.
ffmpeg -v error -y -i "$SRC/sfx/bicycle-horn.wav" -ac 1 -ar 44100 -c:a pcm_s16le "$TMP/horn-bike.wav"
BITRATE=64000 aac horn-bike

# Short SFX from the Kenney CC0 packs (assets-src/kenney/), already peak-normalized and tightly cut:
# just downmix to mono. Their volumes are set in src/audio/audio.ts. Ids match SAMPLES in tracks.ts.
KEN=assets-src/kenney
sfx() { # name, source, [extra ffmpeg filter]
  ffmpeg -v error -y -i "$2" -af "${3:-anull}" -ac 1 -ar 44100 -c:a pcm_s16le "$TMP/$1.wav"
}
sfx sfx-bonk      "$KEN/impact-sounds/impactSoft_heavy_000.ogg"
sfx sfx-crash     "$KEN/impact-sounds/impactPlank_medium_001.ogg" "afade=t=out:st=0.45:d=0.3"
sfx sfx-smash     "$KEN/impact-sounds/impactGeneric_light_001.ogg"
sfx sfx-power     "$KEN/digital-audio/powerUp2.ogg"
sfx sfx-battery   "$KEN/digital-audio/powerUp7.ogg"
sfx sfx-hover     "$KEN/digital-audio/phaserUp6.ogg"
sfx sfx-ui        "$KEN/interface-sounds/select_001.ogg"
sfx jingle-finish "$KEN/music-jingles/Pizzicato jingles/jingles_PIZZI10.ogg"
sfx jingle-best   "$KEN/music-jingles/Steel jingles/jingles_STEEL10.ogg"
for n in sfx-bonk sfx-crash sfx-smash sfx-power sfx-battery sfx-hover sfx-ui; do BITRATE=64000 aac "$n"; done
for n in jingle-finish jingle-best; do BITRATE=80000 aac "$n"; done

# EV acceleration (justVova, CC0): the quiet first second is cut; keep the rising 3.6 s, high-pass the
# rumble, fade both ends and normalize loudness. Played at run start (and a faster slice for Ludicrous).
sfx ev-accel "$SRC/sfx/ev-acceleration-justvova.wav" \
  "atrim=start=1.0:end=4.6,asetpts=PTS-STARTPTS,highpass=f=70,afade=t=in:d=0.12,afade=t=out:st=3.0:d=0.6,loudnorm=I=-16:TP=-1.5"
BITRATE=64000 aac ev-accel

ls -l "$OUT"
