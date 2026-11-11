// Bakes a seamless loop: reads mono 44.1 kHz f32le PCM, keeps samples [0, end + 50 ms) and crossfades the
// 0.3 s before `end` into the 0.3 s before `start`, so jumping from end back to start is continuous.
// Usage: node scripts/bake-loop.mjs in.f32 start end out.wav
import fs from 'fs';
const [inp, s, e, out] = process.argv.slice(2);
const b = fs.readFileSync(inp), x = new Float32Array(b.buffer, b.byteOffset, b.length / 4), sr = 44100;
const S = +s, E = +e, F = Math.round(0.3 * sr), PAD = 2205, n = E + PAD, y = new Float32Array(n);
y.set(x.subarray(0, n));
for (let i = 0; i < F; i++) { const t = (i / F) * Math.PI / 2; y[E - F + i] = x[E - F + i] * Math.cos(t) + x[S - F + i] * Math.sin(t); }
for (let i = 0; i < PAD; i++) y[E + i] = x[S + i]; // past the loop end: what follows the loop start
const w = Buffer.alloc(44 + n * 2);
w.write('RIFF', 0); w.writeUInt32LE(36 + n * 2, 4); w.write('WAVEfmt ', 8); w.writeUInt32LE(16, 16); w.writeUInt16LE(1, 20);
w.writeUInt16LE(1, 22); w.writeUInt32LE(sr, 24); w.writeUInt32LE(sr * 2, 28); w.writeUInt16LE(2, 32); w.writeUInt16LE(16, 34);
w.write('data', 36); w.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) w.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
fs.writeFileSync(out, w);
