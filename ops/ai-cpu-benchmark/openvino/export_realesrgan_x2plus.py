#!/usr/bin/env python3
"""Export the pinned RealESRGAN_x2plus model to a static OpenVINO IR."""

from __future__ import annotations

import hashlib
from pathlib import Path

import openvino as ov
import torch
from basicsr.archs.rrdbnet_arch import RRDBNet


LAB = Path("/srv/azmigrantat-video/ai-cpu-lab-20261113")
WEIGHTS = LAB / "models/RealESRGAN_x2plus.pth"
OUTPUT = LAB / "runtime/openvino/RealESRGAN_x2plus-640x360.xml"
EXPECTED = "49fafd45f8fd7aa8d31ab2a22d14d91b536c34494a5cfe31eb5d89c2fa266abb"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


actual = sha256(WEIGHTS)
if actual != EXPECTED:
    raise RuntimeError(f"checksum mismatch for {WEIGHTS}: {actual}")

checkpoint = torch.load(WEIGHTS, map_location="cpu", weights_only=True)
parameters = checkpoint.get("params_ema", checkpoint.get("params"))
if parameters is None:
    raise RuntimeError("checkpoint has neither params_ema nor params")
model = RRDBNet(
    num_in_ch=3,
    num_out_ch=3,
    num_feat=64,
    num_block=23,
    num_grow_ch=32,
    scale=2,
).eval()
model.load_state_dict(parameters, strict=True)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
example = torch.zeros((1, 3, 360, 640), dtype=torch.float32)
with torch.inference_mode():
    converted = ov.convert_model(model, example_input=example)
ov.save_model(converted, OUTPUT, compress_to_fp16=False)

print(f"openvino_version={ov.__version__}")
print(f"torch_version={torch.__version__}")
print("model=RealESRGAN_x2plus")
print("input_shape=1,3,360,640")
print(f"output={OUTPUT}")
print(f"output_xml_sha256={sha256(OUTPUT)}")
print(f"output_bin_sha256={sha256(OUTPUT.with_suffix('.bin'))}")
