#!/usr/bin/env python3
import json
import subprocess

import torch


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA is unavailable")
    name = torch.cuda.get_device_name(0)
    if "5090" not in name:
        raise SystemExit(f"Unexpected GPU: {name}")
    subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"], check=True, timeout=10)
    print(json.dumps({"healthy": True, "gpu": name, "torch": torch.__version__, "cuda": torch.version.cuda}))


if __name__ == "__main__":
    main()
