# AI Video Restoration V3 — manual comparison

Source: the same three-second segment from the real uploaded video `130`, normalized once to a common 640×360/24 fps compressed input. Every candidate received the same 72 decoded frames. The 1280×720 lossless reference is included only for objective metrics.

## Files to view

- `01-original-compressed-360p-3s.mp4` — common original benchmark input
- `02-standard-ffmpeg-720p-3s.mp4` — current-style standard processing
- `03-ai-realesrgan-x2-720p-3s.mp4` — Real-ESRGAN x2plus
- `04-ai-realesrgan-x4-720p-3s.mp4` — Real-ESRGAN x4v3, DNI 0.5, reduced to 720p
- `05-ai-fastdvdnet-realesrgan-x2-720p-3s.mp4` — temporal FastDVDnet followed by Real-ESRGAN x2plus
- `06-contact-sheet-1.5s.png` — one-frame 2×2 overview (not a substitute for motion review)

## Measured CPU performance

All AI measurements used the same isolated 4-core limit, 8 GB hard RAM limit, no swap, low CPU/IO weights, and a production-queue guard.

| Candidate | 72-frame model time | Model fps | Projected model time for 2 min at 24 fps |
|---|---:|---:|---:|
| Real-ESRGAN x2plus | 394.66 s | 0.182 | ~4 h 23 min |
| Real-ESRGAN x4v3 | 100.31 s | 0.718 | ~1 h 07 min |
| FastDVDnet temporal | 93.50 s | 0.770 | ~1 h 02 min |
| FastDVDnet + x2plus | 488.86 s combined | 0.147 effective | ~5 h 26 min |

The projections exclude decode/encode overhead and are not production promises.

## Reference metrics

| Candidate | PSNR | SSIM |
|---|---:|---:|
| Standard FFmpeg | 28.7365 dB | 0.934034 |
| Real-ESRGAN x2plus | 28.4081 dB | 0.931858 |
| Real-ESRGAN x4v3 | 28.3732 dB | 0.933348 |
| FastDVDnet + x2plus | 28.3208 dB | 0.934734 |

PSNR favors the standard reconstruction; SSIM slightly favors the temporal candidate. The temporal candidate visibly suppresses compression noise but also smooths fine texture. Real-ESRGAN x4v3 retains stronger edges and can introduce reconstructed/hallucinated detail. Human motion review is required before selecting a model.

Exact commands, per-frame timings, ffprobe metadata, checksums, provenance details, and raw PSNR/SSIM logs are included in this directory.
