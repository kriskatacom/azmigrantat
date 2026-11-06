import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import type { VideoServiceConfig } from './config';
import { UploadStore } from './store';
import type { ProcessingJob, ProcessingOutcome, ProbeResult } from './types';

export type CommandResult = { stdout: string; stderr: string };
export interface CommandRunner { run(binary: string, args: string[], timeoutMs: number): Promise<CommandResult>; }

export class SafeCommandRunner implements CommandRunner {
    run(binary: string, args: string[], timeoutMs: number): Promise<CommandResult> {
        return new Promise((resolve, reject) => {
            const child = spawn(binary, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
            let stdout = ''; let stderr = ''; let timedOut = false;
            child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
            const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
            child.once('error', (error) => { clearTimeout(timer); reject(error); });
            child.once('close', (code, signal) => { clearTimeout(timer); if (timedOut) return reject(new Error(`${basename(binary)} timed out.`)); if (code !== 0) return reject(new Error(`${basename(binary)} failed (${signal || code}): ${stderr.slice(-2000)}`)); resolve({ stdout, stderr }); });
        });
    }
}

export function hasFaststartFromBuffer(buffer: Buffer): boolean {
    let offset = 0; let sawMdat = false;
    while (offset + 8 <= buffer.length) {
        let size = buffer.readUInt32BE(offset); const type = buffer.subarray(offset + 4, offset + 8).toString('ascii'); let header = 8;
        if (size === 1) { if (offset + 16 > buffer.length) return false; const extended = Number(buffer.readBigUInt64BE(offset + 8)); if (!Number.isSafeInteger(extended)) return false; size = extended; header = 16; }
        if (size === 0) return !sawMdat && type === 'moov';
        if (size < header) return false;
        if (type === 'mdat') sawMdat = true;
        if (type === 'moov') return !sawMdat;
        offset += size;
        if (offset > buffer.length) return false;
    }
    return false;
}

export function chooseProcessingMode(probe: ProbeResult, faststart: boolean): 'direct' | 'remux' | 'transcode' {
    const compatible = probe.videoCodec === 'h264' && (probe.audioCodec === null || probe.audioCodec === 'aac');
    if (!compatible) return 'transcode';
    if (probe.format === 'mp4' && faststart) return 'direct';
    return 'remux';
}

export function normalizeFormatName(formatName: string): string {
    const formats = formatName.split(',').map((format) => format.trim().toLowerCase()).filter(Boolean);
    return formats.includes('mp4') ? 'mp4' : (formats[0] || '');
}

export class FfmpegProcessor {
    constructor(private readonly config: VideoServiceConfig, private readonly store: UploadStore, private readonly runner: CommandRunner = new SafeCommandRunner()) {}

    async probe(filePath: string): Promise<ProbeResult> {
        const result = await this.runner.run(this.config.ffprobeBin, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath], this.config.processTimeoutSeconds * 1000);
        const payload = JSON.parse(result.stdout) as { format?: { format_name?: string; duration?: string; size?: string }; streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }> };
        const video = payload.streams?.find((stream) => stream.codec_type === 'video'); const audio = payload.streams?.find((stream) => stream.codec_type === 'audio');
        if (!video?.codec_name || !video.width || !video.height) throw new Error('FFprobe did not find a valid video stream.');
        return { format: normalizeFormatName(payload.format?.format_name || ''), duration: Math.max(0, Number(payload.format?.duration || 0)), size: Math.max(0, Number(payload.format?.size || 0)), videoCodec: video.codec_name.toLowerCase(), audioCodec: audio?.codec_name?.toLowerCase() || null, width: video.width, height: video.height };
    }

    async process(job: ProcessingJob): Promise<ProcessingOutcome> {
        if (!Number.isSafeInteger(job.video_id) || job.video_id < 1) throw new Error('Unsafe video identifier.');
        this.store.assertOwnedPath(job.source_path);
        const sourceStat = await stat(job.source_path);
        if (!sourceStat.isFile() || sourceStat.size !== job.size) throw new Error('Processing source is missing or changed.');
        const probe = await this.probe(job.source_path);
        const header = await this.store.readHeader(job.source_path, 16 * 1024 * 1024);
        const mode = chooseProcessingMode(probe, hasFaststartFromBuffer(header));
        const output = await this.store.processingPath(job.upload_id, '.mp4');
        if (mode === 'direct') await this.store.copyToProcessing(job.source_path, output);
        else if (mode === 'remux') await this.runner.run(this.config.ffmpegBin, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', job.source_path, '-map', '0', '-c', 'copy', '-movflags', '+faststart', '-y', output], this.config.processTimeoutSeconds * 1000);
        else await this.runner.run(this.config.ffmpegBin, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', job.source_path, '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', output], this.config.processTimeoutSeconds * 1000);
        const verified = await this.probe(output); if (verified.format !== 'mp4' || verified.videoCodec !== 'h264' || (verified.audioCodec !== null && verified.audioCodec !== 'aac')) throw new Error('Processed output failed playback compatibility verification.');
        const thumbnail = await this.store.processingPath(job.upload_id, '.jpg');
        await this.runner.run(this.config.ffmpegBin, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', '0.5', '-i', output, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '2', '-y', thumbnail], this.config.processTimeoutSeconds * 1000);
        return { mode, outputPath: output, thumbnailPath: thumbnail, probe: verified };
    }
}
