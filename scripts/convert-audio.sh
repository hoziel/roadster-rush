#!/usr/bin/env bash
# Makes the web-ready audio in public/themes/austin/audio/ from the raw CC0 files in assets-src/audio/.
# Needs ffmpeg (brew install ffmpeg; it reads .ogg) and afconvert (built into macOS; Apple's AAC encoder).
# Output: mono AAC-LC .m4a, 44.1 kHz, which iOS Safari decodes with decodeAudioData.
#
# The music is trimmed to whole bars so it loops cleanly. The loop points (in seconds from the music's
# first sample) live in src/audio/music.ts; keep them in sync if you change a trim here.
#   run     pure-raceway-160 (160 bpm, 1 bar = 66150 samples): ship bars 0-49, loop bars 1-49 (72 s)
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

trim music-run    "$SRC/music/pure-raceway-160.ogg"            0    $((49 * 66150 + 2205))
trim music-climax "$SRC/music/pure-raceway-climax-175.ogg"     0    $((25 * 60480 + 2205))
trim music-menu   "$SRC/music/juhani-junkala-title-screen.mp3" 1081 $((1081 + 7 * 62259 + 2205))
for n in music-run music-climax music-menu; do aac "$n"; done

# Bike horn: short SFX, mono already.
ffmpeg -v error -y -i "$SRC/sfx/bicycle-horn.wav" -ac 1 -ar 44100 -c:a pcm_s16le "$TMP/horn-bike.wav"
BITRATE=64000 aac horn-bike

ls -l "$OUT"
