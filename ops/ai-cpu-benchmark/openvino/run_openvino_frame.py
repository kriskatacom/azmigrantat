#!/usr/bin/env python3
"""Run one exact 640x360 frame through the exported OpenVINO model."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import cv2
import numpy as np
import openvino as ov


parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True, type=Path)
parser.add_argument("--model", required=True, type=Path)
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--metrics", required=True, type=Path)
args = parser.parse_args()

image = cv2.imread(str(args.input), cv2.IMREAD_COLOR)
if image is None or image.shape[:2] != (360, 640):
    raise RuntimeError(f"expected 640x360 BGR input, got {None if image is None else image.shape}")

tensor = cv2.cvtColor(image, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
tensor = np.transpose(tensor, (2, 0, 1))[None, ...]

core = ov.Core()
compile_started = time.monotonic()
compiled = core.compile_model(
    args.model,
    "CPU",
    {"PERFORMANCE_HINT": "LATENCY", "INFERENCE_NUM_THREADS": 4},
)
compile_seconds = time.monotonic() - compile_started

infer_started = time.monotonic()
result = compiled([tensor])[compiled.output(0)]
inference_seconds = time.monotonic() - infer_started

output = np.clip(result[0], 0.0, 1.0)
output = np.transpose(output, (1, 2, 0))
output = cv2.cvtColor((output * 255.0).round().astype(np.uint8), cv2.COLOR_RGB2BGR)
if output.shape[:2] not in {(720, 1280), (1440, 2560)}:
    raise RuntimeError(f"unexpected native model output shape: {output.shape}")
if output.shape[:2] == (1440, 2560):
    output = cv2.resize(output, (1280, 720), interpolation=cv2.INTER_LANCZOS4)
args.output.parent.mkdir(parents=True, exist_ok=True)
if not cv2.imwrite(str(args.output), output):
    raise RuntimeError(f"failed to write {args.output}")

metrics = {
    "openvino_version": ov.__version__,
    "device": "CPU",
    "performance_hint": "LATENCY",
    "inference_num_threads": 4,
    "input_shape": list(tensor.shape),
    "native_output_shape": list(result.shape),
    "final_output_shape": list(output.shape),
    "compile_seconds": compile_seconds,
    "inference_seconds": inference_seconds,
}
args.metrics.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")
print(json.dumps(metrics, sort_keys=True))
