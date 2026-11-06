import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseProcessingMode, hasFaststartFromBuffer, normalizeFormatName } from '../src/processing';

const probe = (format: string, videoCodec = 'h264', audioCodec: string | null = 'aac') => ({ format, duration: 2, size: 100, videoCodec, audioCodec, width: 720, height: 1280 });
function box(type: string, size: number): Buffer { const result = Buffer.alloc(size); result.writeUInt32BE(size, 0); result.write(type, 4, 4, 'ascii'); return result; }

test('faststart parser and processing decision tree select direct, remux, or transcode', () => {
    const faststart = Buffer.concat([box('ftyp', 8), box('moov', 8), box('mdat', 8)]);
    const tailMoov = Buffer.concat([box('ftyp', 8), box('mdat', 8), box('moov', 8)]);
    assert.equal(hasFaststartFromBuffer(faststart), true);
    assert.equal(hasFaststartFromBuffer(tailMoov), false);
    assert.equal(chooseProcessingMode(probe('mp4'), true), 'direct');
    assert.equal(chooseProcessingMode(probe('mov'), true), 'remux');
    assert.equal(chooseProcessingMode(probe('mp4'), false), 'remux');
    assert.equal(chooseProcessingMode(probe('mp4', 'vp9'), true), 'transcode');
    assert.equal(chooseProcessingMode(probe('mp4', 'h264', 'opus'), true), 'transcode');
});

test('normalizes FFprobe MP4 aliases instead of rejecting mov/mp4 output', () => {
    assert.equal(normalizeFormatName('mov,mp4,m4a,3gp,3g2,mj2'), 'mp4');
    assert.equal(normalizeFormatName('matroska,webm'), 'matroska');
    assert.equal(normalizeFormatName(''), '');
});
