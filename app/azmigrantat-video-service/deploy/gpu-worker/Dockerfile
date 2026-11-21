# amd64 digest for nvidia/cuda:12.8.1-cudnn-runtime-ubuntu22.04, resolved 2026-11-13.
FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu22.04@sha256:59e0e4376a0f16d10b03d3a14344b80a866a1674cb4948cb318291387ac05010

ARG DEBIAN_FRONTEND=noninteractive
ARG SWIFTVR_SOURCE_URL=https://github.com/H-oliday/SwiftVR/archive/4fb82651efee06a90ac47fd2d9af2f632e84ab45.tar.gz
ARG SWIFTVR_SOURCE_SHA256=5a2ccc9234c50cbcfc9d72a81f37d9d18ba59fa4c3695023533e95732de305a5

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl ffmpeg python3 python3-pip tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 11001 --create-home --home-dir /var/lib/swiftvr --shell /usr/sbin/nologin swiftvr

RUN python3 -m pip install --no-cache-dir \
      torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cu128 \
    && curl --fail --location --silent --show-error "$SWIFTVR_SOURCE_URL" -o /tmp/swiftvr.tar.gz \
    && echo "$SWIFTVR_SOURCE_SHA256  /tmp/swiftvr.tar.gz" | sha256sum --check --strict \
    && mkdir -p /opt/swiftvr \
    && tar -xzf /tmp/swiftvr.tar.gz --strip-components=1 -C /opt/swiftvr \
    && python3 -m pip install --no-cache-dir /opt/swiftvr \
    && rm /tmp/swiftvr.tar.gz

COPY --chmod=0555 verify_model_manifest.py reconstruct_model.py swiftvr_infer.py swiftvr_restore.py healthcheck.py worker_client.py /opt/azmigrantat-gpu-worker/
COPY --chmod=0444 model-manifest.json /opt/azmigrantat-gpu-worker/model-manifest.json
COPY --chmod=0444 python-packages.lock /opt/azmigrantat-gpu-worker/python-packages.lock

# Fail closed if a future resolver run selects different transitive packages.
RUN python3 -m pip freeze --all | LC_ALL=C sort > /tmp/python-packages.lock \
    && diff -u /opt/azmigrantat-gpu-worker/python-packages.lock /tmp/python-packages.lock \
    && rm /tmp/python-packages.lock

RUN install -d -o swiftvr -g swiftvr -m 0700 /work /models
USER swiftvr:swiftvr
WORKDIR /work

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    TORCH_HOME=/var/lib/swiftvr/.cache/torch \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

HEALTHCHECK --interval=30s --timeout=15s --start-period=180s --retries=3 \
  CMD ["python3", "/opt/azmigrantat-gpu-worker/healthcheck.py"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python3", "/opt/azmigrantat-gpu-worker/worker_client.py"]
