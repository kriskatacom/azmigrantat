# AI video enhancement CPU benchmark — 2026-11-13

## Outcome

Two real 10-second, 24 fps videos (240 frames each) were processed on the
OneProvider Ryzen 7 3700X server. Both AI runs used the same degraded 640×360
input, the same 1280×720 H.264 output settings, four CPU threads, an 8 GiB
memory limit, low CPU/I/O priority, empty-queue guards, cleanup traps and hard
systemd timeouts. The later lightweight ESPCN mode is enabled only for the
verified test account; 1080p AI and global access remain disabled.

| Pipeline | Total AI stage | Mean/frame | p95/frame | Max RSS | Output |
|---|---:|---:|---:|---:|---|
| Standard FFmpeg | existing baseline | — | — | — | `02-standard-ffmpeg-720p-10s.mp4` |
| Real-ESRGAN general x4v3, DNI 0.5, OpenVINO | 335.86 s | 1.280 s | 1.294 s | 486,300 KiB | `03-ai-openvino-720p-10s.mp4` |
| RealESRGAN_x2plus, OpenVINO | 1,319.94 s | 5.428 s | 5.474 s | 1,069,312 KiB | `06-ai-x2plus-720p-10s.mp4` |

The native PyTorch CPU backend was rejected after a bounded one-frame run hit
its 300-second timeout without producing an output. OpenVINO completed the same
x4v3 frame in 1.326 seconds.

## Provenance

- Source: Blender Foundation, *Tears of Steel* 720p, segment 00:01:34–00:01:44,
  CC-BY-3.0. SHA-256:
  `efa9062d9cdb7a338e40ad530dfdf234806743f29ae6a1a136b97ece4e588e8f`.
- Code: official `xinntao/Real-ESRGAN`, commit
  `fa4c8a03ae3dbc9ea6ed471a6ab5da94ac15c2ea` (v0.3.0), BSD-3-Clause.
- `realesr-general-x4v3.pth`, release v0.2.5.0, SHA-256
  `8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292`.
- `realesr-general-wdn-x4v3.pth`, release v0.2.5.0, SHA-256
  `1641f8c4464b9f097c9fdda5589273713f67cf59f3d909e0bd688f0cee269dca`.
- `RealESRGAN_x2plus.pth`, release v0.2.1, SHA-256
  `49fafd45f8fd7aa8d31ab2a22d14d91b536c34494a5cfe31eb5d89c2fa266abb`.
- Runtime: OpenVINO 2024.6.0, PyTorch 2.5.1+cpu, Python 3.12.3.
- x4v3 IR SHA-256: XML
  `d0b01b572ed54f1a80734b4e1cda81828afc40fc793e71263e24a4df5ab5d234`,
  BIN `a8ceaddf6a538df0633d5688138f5e16c765e2a59696777969f854b2576434f3`.
- x2plus IR SHA-256: XML
  `55d7cb1560c0c635bbcc305eab714fea92d34e3b4cb7ce153de551569e4ffb22`,
  BIN `841dd8686fadff69a194b97042f4262e771bec466786ee4482c469d1bd358277`.

The complete dependency snapshot, per-frame timings, run manifests and media
checksums are stored beside this file. Reproduction scripts are in
`ops/ai-cpu-benchmark/`.

## Practical CPU limits

Linear estimates from the measured 240-frame runs, before upload/download and
queue overhead:

| Input duration | x4v3 AI stage | x2plus AI stage |
|---:|---:|---:|
| 30 seconds | ~16.8 minutes | ~65.2 minutes |
| 60 seconds | ~33.6 minutes | ~130.3 minutes |
| 5 minutes | ~2.8 hours | ~10.9 hours |

These measurements validate only 360p → 720p. No 1080p AI performance claim is
made. A separate bounded benchmark is required before offering 1080p.

## Visual observations

- x4v3 produces the clearest denoising and edge enhancement, but smooths some
  low-contrast texture.
- x2plus is more conservative and retains more natural texture; its improvement
  over the standard result is subtler and costs roughly 3.9× more CPU time.
- No gross face deformation or strong halo was seen in the sampled frames.
- Temporal flicker must be judged from the videos by a human; static contact
  sheets cannot establish temporal stability.

No mobile functional tests were run and nothing was published to Google Play.

## Fast CPU restoration implementation

The selected production candidate is ESPCN x2 plus conservative FFmpeg
deblocking/denoising before inference. It uses the same source, output encoder,
2-CPU quota and 10 GiB hard memory boundary as the other lightweight
candidates. The classical prefilter removes part of the old-phone block/noise
pattern; the ESPCN neural network performs the actual learned super-resolution.
No face-restoration model is used.

| 10-second 360p → 720p pipeline | Wall time | Peak RSS | Linear 2-minute estimate |
|---|---:|---:|---:|
| ESPCN plain | 36.56 s | 290,408 KiB | 7.31 min |
| ESPCN restore | 37.11 s | 290,528 KiB | 7.42 min |
| FSRCNN plain | 51.99 s | 356,452 KiB | 10.40 min |
| FSRCNN restore | 52.46 s | 356,248 KiB | 10.49 min |
| Real-ESRGAN x4v3 baseline | 335.86 s | 486,300 KiB | 67.17 min |

The required sustained run used 2 minutes / 2,880 frames, not an extrapolation:

- ESPCN restore AI pipeline: **446.09 s (7 min 26 s)**.
- Standard FFmpeg comparison: 63.84 s.
- AI process peak RSS: 290,220 KiB; mean CPU use: 186% under a 200% quota.
- Output: 1280×720, H.264/AAC, 2,880 frames, exactly 120.000 seconds.
- cgroup: `CPUQuota=200%`, `MemoryHigh=8G`, `MemoryMax=10G`, swap disabled,
  `TasksMax=96`, low CPU and I/O weights.

Visual inspection on identical frames found ESPCN restore visibly reduces block
noise and jagged edges relative to the standard output while keeping faces and
natural shapes conservative. Real-ESRGAN x4v3 is visibly sharper, but its
measured speed is not usable for this CPU production path. Temporal stability
still requires the requested human playback review.

### Fast-model provenance

- ESPCN source: `fannymonori/TF-ESPCN`, commit
  `5c628eca82028161a53e1265cc3a5b571ab8625f`, Apache-2.0.
- `ESPCN_x2.pb` SHA-256:
  `59f77351e1d7c0057bf6fe088b4a8a07e42c468c8c8aebb674a6b4ea1823221d`.
- OpenCV contrib headless 4.11.0.86 wheel SHA-256:
  `3e7a86bf02e8157a2d9fce26d44eaafd31113fc21fc8b4f44ff56c28ab32fdba`.
- NumPy 2.1.3 wheel SHA-256:
  `2312b2aa89e1f43ecea6da6ea9a810d06aae08321609d8dc0d0eda6d946a541b`.
- Adapter SHA-256:
  `c6934ec21485692a03e3ec1d824f7c00d61ab3474f900ed9c8a3a23738c2e275`.

### Manual comparison files

- `01-original-degraded-360p-10s.mp4`
- `02-standard-ffmpeg-720p-10s.mp4`
- `03-ai-openvino-720p-10s.mp4` (slow x4v3 baseline)
- `08-fast-ai-espcn-restore-720p-10s.mp4`
- `09-original-degraded-360p-120s.mp4`
- `10-standard-ffmpeg-720p-120s.mp4`
- `11-fast-ai-espcn-restore-720p-120s.mp4`
