#!/usr/bin/env python3
"""Apply the pinned FastDVDnet weights to existing frames without adding synthetic noise."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument("--repository", required=True, type=Path)
parser.add_argument("--input-dir", required=True, type=Path)
parser.add_argument("--output-dir", required=True, type=Path)
parser.add_argument("--model", required=True, type=Path)
parser.add_argument("--expected-model-sha256", required=True)
parser.add_argument("--expected-frames", required=True, type=int)
parser.add_argument("--noise-sigma", default=10.0, type=float)
parser.add_argument("--metrics", required=True, type=Path)
args = parser.parse_args()

if sha256(args.model) != args.expected_model_sha256:
    raise RuntimeError("FastDVDnet model checksum mismatch")
sys.path.insert(0, str(args.repository))
from fastdvdnet import denoise_seq_fastdvdnet  # noqa: E402
from models import FastDVDnet  # noqa: E402

paths = sorted(args.input_dir.glob("*.png"))
if len(paths) != args.expected_frames:
    raise RuntimeError(f"expected {args.expected_frames} frames, got {len(paths)}")
frames = []
for path in paths:
    frame = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if frame is None or frame.shape[:2] != (360, 640):
        raise RuntimeError(f"unexpected frame geometry: {path}")
    frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).transpose(2, 0, 1))

torch.set_num_threads(4)
device = torch.device("cpu")
model = FastDVDnet(num_input_frames=5)
raw_state = torch.load(args.model, map_location=device, weights_only=True)
state = {key.removeprefix("module."): value for key, value in raw_state.items()}
model.load_state_dict(state)
model.eval()
sequence = torch.from_numpy(np.stack(frames)).float().div_(255.0)
noise = torch.tensor([args.noise_sigma / 255.0], dtype=torch.float32)

started = time.monotonic()
with torch.no_grad():
    restored = denoise_seq_fastdvdnet(sequence, noise, 5, model)
elapsed = time.monotonic() - started

args.output_dir.mkdir(parents=True, exist_ok=False)
for path, tensor in zip(paths, restored):
    image = tensor.clamp(0, 1).mul(255).round().byte().cpu().numpy().transpose(1, 2, 0)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    if not cv2.imwrite(str(args.output_dir / path.name), image, [cv2.IMWRITE_PNG_COMPRESSION, 1]):
        raise RuntimeError(f"could not write restored frame: {path.name}")

metrics = {
    "model": "FastDVDnet",
    "model_sha256": args.expected_model_sha256,
    "frames": len(paths),
    "noise_sigma_parameter": args.noise_sigma,
    "synthetic_noise_added": False,
    "elapsed_seconds": elapsed,
    "fps": len(paths) / elapsed,
    "torch_version": torch.__version__,
    "threads": torch.get_num_threads(),
}
args.metrics.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")
print(json.dumps(metrics, sort_keys=True), flush=True)
