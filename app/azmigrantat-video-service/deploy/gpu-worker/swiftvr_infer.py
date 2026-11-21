#!/usr/bin/env python3
"""Pinned SwiftVR Python-API invocation; avoids relying on mutable CLI flags."""
import argparse, json
from swiftvr import SwiftVRPipeline

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--checkpoint", required=True)
parser.add_argument("--width", required=True, type=int)
parser.add_argument("--height", required=True, type=int)
parser.add_argument("--clip-len", default=24, type=int)
parser.add_argument("--fps", required=True, type=float)
args = parser.parse_args()

pipe = SwiftVRPipeline.from_pretrained(args.checkpoint)
pipe.to("cuda", dtype="bfloat16", attention_backend="sdpa", torch_compile=False)
result = pipe.restore_video(args.input, args.output, resolution=(args.width, args.height), clip_len=args.clip_len,
                            dit_overlap=0, fps=args.fps, quality=90, queue_size=1, ffmpeg_preset="fast", verbose=True)
print(json.dumps({"event": "swiftvr_complete", **result}), flush=True)
