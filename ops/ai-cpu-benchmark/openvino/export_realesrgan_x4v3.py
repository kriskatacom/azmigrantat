#!/usr/bin/env python3
"""Export the pinned Real-ESRGAN general x4v3 DNI=0.5 model to OpenVINO IR."""

from __future__ import annotations

import hashlib
from pathlib import Path

import openvino as ov
import torch
from realesrgan.archs.srvgg_arch import SRVGGNetCompact


LAB = Path("/srv/azmigrantat-video/ai-cpu-lab-20261113")
STRONG = LAB / "models/realesr-general-x4v3.pth"
WEAK = LAB / "models/realesr-general-wdn-x4v3.pth"
OUTPUT = LAB / "runtime/openvino/realesr-general-x4v3-dn050-640x360.xml"
EXPECTED = {
    STRONG: "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292",
    WEAK: "1641f8c4464b9f097c9fdda5589273713f67cf59f3d909e0bd688f0cee269dca",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


for path, expected in EXPECTED.items():
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"checksum mismatch for {path}: {actual}")

strong = torch.load(STRONG, map_location="cpu", weights_only=True)["params"]
weak = torch.load(WEAK, map_location="cpu", weights_only=True)["params"]
if strong.keys() != weak.keys():
    raise RuntimeError("strong and weak model parameter sets differ")

blended = {name: 0.5 * strong[name] + 0.5 * weak[name] for name in strong}
model = SRVGGNetCompact(
    num_in_ch=3,
    num_out_ch=3,
    num_feat=64,
    num_conv=32,
    upscale=4,
    act_type="prelu",
).eval()
model.load_state_dict(blended, strict=True)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
example = torch.zeros((1, 3, 360, 640), dtype=torch.float32)
with torch.inference_mode():
    converted = ov.convert_model(model, example_input=example)
ov.save_model(converted, OUTPUT, compress_to_fp16=False)

print(f"openvino_version={ov.__version__}")
print(f"torch_version={torch.__version__}")
print("model=realesr-general-x4v3")
print("denoise_strength=0.5")
print("input_shape=1,3,360,640")
print(f"output={OUTPUT}")
print(f"output_xml_sha256={sha256(OUTPUT)}")
print(f"output_bin_sha256={sha256(OUTPUT.with_suffix('.bin'))}")
