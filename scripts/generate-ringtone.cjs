const fs = require("node:fs");
const path = require("node:path");

const sampleRate = 44100;
const durationSeconds = 4;
const sampleCount = sampleRate * durationSeconds;
const samples = Buffer.alloc(sampleCount * 2);
const notes = [659.25, 783.99, 987.77, 783.99];

for (let index = 0; index < sampleCount; index += 1) {
  const time = index / sampleRate;
  const beat = Math.floor(time / 0.5);
  const withinBeat = time % 0.5;
  const isRest = beat % 4 === 3;
  const frequency = notes[beat % notes.length];
  const attack = Math.min(1, withinBeat / 0.025);
  const release = Math.min(1, (0.38 - withinBeat) / 0.08);
  const envelope = isRest || withinBeat > 0.38 ? 0 : attack * Math.max(0, release);
  const tone =
    Math.sin(2 * Math.PI * frequency * time) * 0.7 +
    Math.sin(2 * Math.PI * frequency * 1.5 * time) * 0.3;
  samples.writeInt16LE(Math.round(tone * envelope * 9000), index * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + samples.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(samples.length, 40);

const outputDirectory = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, "incoming-call.wav"), Buffer.concat([header, samples]));
