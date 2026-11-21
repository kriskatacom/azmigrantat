"""Compatibility alias for BasicSR 1.4.2 on torchvision 0.20.

BasicSR imports rgb_to_grayscale from the removed
torchvision.transforms.functional_tensor module. The implementation remains
available in torchvision.transforms.functional. This shim exposes only that
single symbol and does not change inference math or model weights.
"""

import os
import sys
import types

import torch
from torchvision.transforms.functional import rgb_to_grayscale

threads = int(os.environ.get("AZMIGRANTAT_TORCH_THREADS", "2"))
torch.set_num_threads(threads)
torch.set_num_interop_threads(1)

module = types.ModuleType("torchvision.transforms.functional_tensor")
module.rgb_to_grayscale = rgb_to_grayscale
sys.modules[module.__name__] = module
