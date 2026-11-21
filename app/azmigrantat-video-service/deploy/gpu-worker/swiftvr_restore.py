#!/usr/bin/env python3
"""Bounded SwiftVR invocation with composition-safe input and audio finalization.

The remote transport/orchestrator owns authorization and fencing. This program
only reads one local input and writes one lease-scoped output in its workspace.
"""

import argparse
import json
import math
import os
import queue
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path


GPU_LINE = re.compile(r"\[gpu\].*out=(\d+)f.*gpu_fps=([0-9.]+)")


def command_output(command: list[str]) -> str:
    return subprocess.check_output(command, text=True, stderr=subprocess.STDOUT, timeout=30)


def probe(path: Path) -> dict:
    raw = command_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(path),
    ])
    return json.loads(raw)


def video_stream(value: dict) -> dict:
    return next(stream for stream in value["streams"] if stream.get("codec_type") == "video")


def fraction(value: str | None) -> float:
    if not value or value in {"0/0", "0:1", "N/A"}:
        return 0.0
    separator = "/" if "/" in value else ":"
    numerator, denominator = value.split(separator, 1)
    return float(numerator) / float(denominator) if float(denominator) else 0.0


def display_dimensions(stream: dict) -> tuple[int, int]:
    width, height = int(stream["width"]), int(stream["height"])
    sar = fraction(stream.get("sample_aspect_ratio")) or 1.0
    display_width = max(1, round(width * sar))
    rotation = int(stream.get("tags", {}).get("rotate") or 0)
    for side_data in stream.get("side_data_list", []):
        if "rotation" in side_data:
            rotation = int(side_data["rotation"])
    if abs(rotation) % 180 == 90:
        return height, display_width
    return display_width, height


def workspace_size(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def terminate_group(process: subprocess.Popen, grace_seconds: int = 10) -> None:
    if process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)


def run_bounded(command: list[str], timeout_seconds: int, workspace: Path, max_workspace_bytes: int,
                cancel_file: Path | None, progress_total_frames: int = 0) -> None:
    process = subprocess.Popen(
        command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        bufsize=1, start_new_session=True,
    )
    lines: queue.Queue[str | None] = queue.Queue()

    def reader() -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line)
        lines.put(None)

    threading.Thread(target=reader, daemon=True).start()
    started = time.monotonic()
    processed = 0
    try:
        while process.poll() is None:
            if time.monotonic() - started > timeout_seconds:
                raise TimeoutError("SwiftVR execution deadline exceeded.")
            if cancel_file and cancel_file.exists():
                raise InterruptedError("SwiftVR job was cancelled.")
            if workspace_size(workspace) > max_workspace_bytes:
                raise RuntimeError("SwiftVR workspace limit exceeded.")
            try:
                line = lines.get(timeout=1)
            except queue.Empty:
                continue
            if line:
                print(line, end="", flush=True)
                match = GPU_LINE.search(line)
                if match:
                    processed += int(match.group(1))
                    progress = min(95, int(processed * 95 / progress_total_frames)) if progress_total_frames else 0
                    print(json.dumps({"event": "progress", "progress": progress, "processed_frames": processed,
                                      "total_frames": progress_total_frames, "measured_fps": float(match.group(2))}), flush=True)
        if process.returncode != 0:
            raise RuntimeError(f"SwiftVR exited with status {process.returncode}.")
    except BaseException:
        terminate_group(process)
        raise


def padded_source_dimensions(width: int, height: int, target_width: int, target_height: int) -> tuple[int, int]:
    source_ratio = width / height
    target_ratio = target_width / target_height
    if source_ratio > target_ratio:
        padded_width = width
        padded_height = math.ceil(width / target_ratio)
    else:
        padded_height = height
        padded_width = math.ceil(height * target_ratio)
    return math.ceil(padded_width / 8) * 8, math.ceil(padded_height / 8) * 8


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--target-width", required=True, type=int)
    parser.add_argument("--target-height", required=True, type=int)
    parser.add_argument("--timeout-seconds", type=int, default=7200)
    parser.add_argument("--max-workspace-bytes", type=int, default=96 * 1024**3)
    parser.add_argument("--cancel-file", type=Path)
    parser.add_argument("--clip-len", type=int, default=24)
    args = parser.parse_args()
    if args.target_width < 64 or args.target_height < 64 or args.target_width % 8 or args.target_height % 8:
        raise SystemExit("Target dimensions must be positive multiples of 8.")
    if args.clip_len < 4 or args.clip_len % 4:
        raise SystemExit("clip-len must be a positive multiple of 4.")
    if not args.input.is_file() or args.output.exists():
        raise SystemExit("Input must exist and output must not already exist.")

    source = probe(args.input)
    source_video = video_stream(source)
    source_width, source_height = display_dimensions(source_video)
    source_fps = fraction(source_video.get("avg_frame_rate")) or fraction(source_video.get("r_frame_rate")) or 30.0
    source_duration = float(source.get("format", {}).get("duration") or source_video.get("duration") or 0)
    source_frames = int(source_video.get("nb_frames") or max(1, round(source_duration * source_fps)))
    has_audio = any(stream.get("codec_type") == "audio" for stream in source["streams"])

    args.output.parent.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix="swiftvr-", dir=args.output.parent))
    normalized = workspace / "normalized.mp4"
    restored = workspace / "restored-silent.mp4"
    staged = workspace / "final.mp4"
    try:
        pad_width, pad_height = padded_source_dimensions(source_width, source_height, args.target_width, args.target_height)
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", str(args.input),
            "-map", "0:v:0", "-an", "-vf",
            f"scale=trunc(iw*sar/2)*2:ih,pad={pad_width}:{pad_height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
            "-r", f"{source_fps:.8f}", "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(normalized),
        ], check=True, timeout=min(args.timeout_seconds, 900), start_new_session=True)
        print(json.dumps({"event": "progress", "progress": 2, "state": "normalized"}), flush=True)
        run_bounded([
            sys.executable, "/opt/azmigrantat-gpu-worker/swiftvr_infer.py", "--input", str(normalized), "--output", str(restored),
            "--checkpoint", str(args.checkpoint), "--width", str(args.target_width), "--height", str(args.target_height),
            "--clip-len", str(args.clip_len), "--fps", f"{source_fps:.8f}",
        ], args.timeout_seconds, workspace, args.max_workspace_bytes, args.cancel_file, source_frames)
        finalize = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", str(restored)]
        if has_audio:
            finalize += ["-i", str(args.input), "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "aac",
                         "-af", "aresample=async=1:first_pts=0,apad", "-shortest"]
        else:
            finalize += ["-map", "0:v:0", "-c:v", "copy", "-an"]
        finalize += ["-metadata:s:v:0", "rotate=0", "-movflags", "+faststart", str(staged)]
        subprocess.run(finalize, check=True, timeout=min(args.timeout_seconds, 900), start_new_session=True)

        result = probe(staged); result_video = video_stream(result)
        result_duration = float(result.get("format", {}).get("duration") or result_video.get("duration") or 0)
        if int(result_video["width"]) != args.target_width or int(result_video["height"]) != args.target_height:
            raise RuntimeError("SwiftVR output dimensions are invalid.")
        if source_duration > 0 and abs(result_duration - source_duration) > max(0.5, 2 / source_fps):
            raise RuntimeError("SwiftVR output duration differs from the source.")
        if has_audio and not any(stream.get("codec_type") == "audio" for stream in result["streams"]):
            raise RuntimeError("SwiftVR output lost the source audio.")
        os.replace(staged, args.output)
        print(json.dumps({"event": "progress", "progress": 100, "state": "completed",
                          "duration_seconds": result_duration}), flush=True)
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


if __name__ == "__main__":
    main()
