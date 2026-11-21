#!/usr/bin/env python3
"""Apply the pinned OpenVINO Real-ESRGAN IR to a directory of video frames."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import time
from pathlib import Path

import cv2
import numpy as np
import openvino as ov


parser = argparse.ArgumentParser()
parser.add_argument("--input-dir", required=True, type=Path)
parser.add_argument("--output-dir", required=True, type=Path)
parser.add_argument("--model", required=True, type=Path)
parser.add_argument("--metrics", required=True, type=Path)
parser.add_argument("--frame-metrics", required=True, type=Path)
parser.add_argument("--expected-frames", required=True, type=int)
args = parser.parse_args()

paths = sorted(args.input_dir.glob("*.png"))
if len(paths) != args.expected_frames:
    raise RuntimeError(f"expected {args.expected_frames} input frames, got {len(paths)}")
args.output_dir.mkdir(parents=True, exist_ok=False)

core = ov.Core()
compile_started = time.monotonic()
compiled = core.compile_model(
    args.model,
    "CPU",
    {"PERFORMANCE_HINT": "LATENCY", "INFERENCE_NUM_THREADS": 4},
)
compile_seconds = time.monotonic() - compile_started

frame_seconds: list[float] = []
run_started = time.monotonic()
with args.frame_metrics.open("w", newline="") as csv_stream:
    writer = csv.writer(csv_stream)
    writer.writerow(["frame", "inference_seconds"])
    for index, path in enumerate(paths, start=1):
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None or image.shape[:2] != (360, 640):
            raise RuntimeError(f"invalid frame {path}: {None if image is None else image.shape}")
        tensor = cv2.cvtColor(image, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))[None, ...]

        started = time.monotonic()
        result = compiled([tensor])[compiled.output(0)]
        elapsed = time.monotonic() - started
        frame_seconds.append(elapsed)
        writer.writerow([index, f"{elapsed:.9f}"])
        csv_stream.flush()

        output = np.clip(result[0], 0.0, 1.0)
        output = np.transpose(output, (1, 2, 0))
        output = cv2.cvtColor((output * 255.0).round().astype(np.uint8), cv2.COLOR_RGB2BGR)
        if output.shape[:2] not in {(720, 1280), (1440, 2560)}:
            raise RuntimeError(f"unexpected output for {path}: {output.shape}")
        if output.shape[:2] == (1440, 2560):
            output = cv2.resize(output, (1280, 720), interpolation=cv2.INTER_LANCZOS4)
        destination = args.output_dir / path.name
        if not cv2.imwrite(str(destination), output, [cv2.IMWRITE_PNG_COMPRESSION, 1]):
            raise RuntimeError(f"failed to write {destination}")
        print(f"frame={index}/{len(paths)} inference_seconds={elapsed:.6f}", flush=True)

run_seconds = time.monotonic() - run_started
ordered = sorted(frame_seconds)
metrics = {
    "openvino_version": ov.__version__,
    "device": "CPU",
    "performance_hint": "LATENCY",
    "inference_num_threads": 4,
    "frames": len(paths),
    "compile_seconds": compile_seconds,
    "frame_inference_seconds_total": sum(frame_seconds),
    "video_loop_seconds_total": run_seconds,
    "frame_seconds_min": min(frame_seconds),
    "frame_seconds_mean": statistics.fmean(frame_seconds),
    "frame_seconds_median": statistics.median(frame_seconds),
    "frame_seconds_p95": ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))],
    "frame_seconds_max": max(frame_seconds),
}
args.metrics.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")
print(json.dumps(metrics, sort_keys=True), flush=True)
