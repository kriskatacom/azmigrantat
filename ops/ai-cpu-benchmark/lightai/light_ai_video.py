#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import resource
import signal
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np


PROTOCOL_VERSION = 1
SUPPORTED_TARGET = 720
MAX_INPUT_PIXELS = 1920 * 1080
MAX_DURATION_SECONDS = 120.5
MIN_DISPLAY_ASPECT = 0.4
MAX_DISPLAY_ASPECT = 2.5


class AdapterError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def strict_sha256(value: str, name: str) -> str:
    normalized = value.strip().lower()
    if len(normalized) != 64 or any(char not in "0123456789abcdef" for char in normalized):
        raise AdapterError(f"{name} must be a non-empty SHA-256 digest")
    return normalized


def ratio(value: str) -> float:
    numerator, denominator = value.split("/", 1)
    denominator_value = float(denominator)
    if denominator_value == 0:
        raise AdapterError("invalid zero frame-rate denominator")
    return float(numerator) / denominator_value


def sar(value: str | None) -> tuple[int, int]:
    if value in {None, "N/A"}:
        return 1, 1
    numerator, denominator = value.split(":", 1)
    parsed = int(numerator), int(denominator)
    if parsed[0] <= 0 or parsed[1] <= 0:
        raise AdapterError("invalid sample aspect ratio")
    if not 0.5 <= parsed[0] / parsed[1] <= 2.0:
        raise AdapterError("sample aspect ratio is unsupported")
    return parsed


def display_aspect(value: str | None, width: int, height: int, sar_value: tuple[int, int]) -> float:
    if value not in {None, "N/A", "0:1"}:
        numerator, denominator = value.split(":", 1)
        parsed = int(numerator) / int(denominator)
    else:
        parsed = width * sar_value[0] / (height * sar_value[1])
    if not MIN_DISPLAY_ASPECT <= parsed <= MAX_DISPLAY_ASPECT:
        raise AdapterError("input display aspect ratio is unsupported")
    return parsed


def require_safe_artifact(path: Path, require_root_owned: bool) -> None:
    resolved = path.resolve(strict=True)
    if not resolved.is_file() or resolved.is_symlink():
        raise AdapterError(f"artifact is not a regular file: {path}")
    if require_root_owned:
        for candidate in (resolved, *resolved.parents):
            stat_result = candidate.stat()
            if stat_result.st_uid != 0:
                raise AdapterError(f"artifact path is not root-owned: {candidate}")
            if stat_result.st_mode & 0o022:
                raise AdapterError(f"artifact path is group/world writable: {candidate}")
            if candidate == Path("/"):
                break


def model_contract(args: argparse.Namespace) -> tuple[Path, str]:
    raw_model = args.model or os.environ.get("AZMIGRANTAT_AI_MODEL", "")
    if not raw_model.strip():
        raise AdapterError("AI model path is required")
    model = Path(raw_model)
    expected = strict_sha256(
        args.expected_model_sha256 or os.environ.get("AZMIGRANTAT_AI_EXPECTED_MODEL_SHA256", ""),
        "expected model fingerprint",
    )
    require_safe_artifact(model, os.environ.get("AZMIGRANTAT_AI_REQUIRE_ROOT_OWNED", "0") == "1")
    actual = sha256_file(model)
    if actual != expected:
        raise AdapterError("AI model fingerprint mismatch")
    return model.resolve(), actual


def adapter_fingerprint() -> str:
    return sha256_file(Path(__file__).resolve())


def algorithm(args: argparse.Namespace) -> str:
    selected = (args.algorithm or os.environ.get("AZMIGRANTAT_AI_ALGORITHM", "fsrcnn")).lower()
    if selected not in {"fsrcnn", "espcn"}:
        raise AdapterError("unsupported AI algorithm")
    return selected


def profile(args: argparse.Namespace) -> str:
    selected = (args.profile or os.environ.get("AZMIGRANTAT_AI_PROFILE", "restore")).lower()
    if selected not in {"plain", "restore"}:
        raise AdapterError("unsupported restoration profile")
    return selected


def backend(args: argparse.Namespace) -> str:
    selected = (args.backend or os.environ.get("AZMIGRANTAT_AI_BACKEND", "opencv")).lower()
    if selected not in {"opencv", "openvino"}:
        raise AdapterError("unsupported AI inference backend")
    return selected


def super_resolution(model: Path, selected_algorithm: str, selected_backend: str, width: int, height: int):
    if selected_backend == "openvino":
        if selected_algorithm != "espcn":
            raise AdapterError("the OpenVINO production backend supports ESPCN only")
        try:
            import openvino as ov
        except ImportError as error:
            raise AdapterError("OpenVINO runtime is not installed") from error
        core = ov.Core()
        network = core.read_model(str(model))
        network.reshape({network.input(0): [1, height, width, 1]})
        compiled = core.compile_model(network, "CPU", {"PERFORMANCE_HINT": "LATENCY", "INFERENCE_NUM_THREADS": 2})
        output = compiled.output(0)

        def infer(frame: np.ndarray) -> np.ndarray:
            ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
            luminance = ycrcb[:, :, 0].astype(np.float32) / 255.0
            result = compiled([luminance[np.newaxis, :, :, np.newaxis]])[output]
            if result.shape != (1, 1, height * 2, width * 2):
                raise AdapterError("OpenVINO ESPCN returned the wrong dimensions")
            enhanced_y = np.clip(result[0, 0] * 255.0, 0, 255).astype(np.uint8)
            chroma = cv2.resize(ycrcb[:, :, 1:3], (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
            return cv2.cvtColor(cv2.merge((enhanced_y, chroma[:, :, 0], chroma[:, :, 1])), cv2.COLOR_YCrCb2BGR)

        return infer, ov.__version__

    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(model))
    sr.setModel(selected_algorithm, 2)
    return sr.upsample, cv2.__version__


def preflight(args: argparse.Namespace) -> int:
    model, model_sha = model_contract(args)
    selected_algorithm = algorithm(args)
    selected_profile = profile(args)
    selected_backend = backend(args)
    infer, runtime_version = super_resolution(model, selected_algorithm, selected_backend, 16, 16)
    probe = np.zeros((16, 16, 3), dtype=np.uint8)
    result = infer(probe)
    if result.shape[:2] != (32, 32):
        raise AdapterError("AI model preflight returned the wrong dimensions")
    print(json.dumps({
        "protocol_version": PROTOCOL_VERSION,
        "ready": True,
        "engine": f"{selected_backend}-{selected_algorithm}-x2-{selected_profile}-v1",
        "runtime_version": runtime_version,
        "adapter_fingerprint": adapter_fingerprint(),
        "model_fingerprint": model_sha,
        "supported_target_short_sides": [SUPPORTED_TARGET],
        "enforces_workspace_limit": True,
    }, separators=(",", ":")))
    return 0


def probe_media(path: Path) -> dict:
    command = [
        "ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path),
    ]
    completed = subprocess.run(command, check=True, capture_output=True, text=True, timeout=15)
    payload = json.loads(completed.stdout)
    video_streams = [stream for stream in payload.get("streams", []) if stream.get("codec_type") == "video"]
    audio_streams = [stream for stream in payload.get("streams", []) if stream.get("codec_type") == "audio"]
    if len(video_streams) != 1 or len(audio_streams) > 1:
        raise AdapterError("exactly one video and at most one audio stream are supported")
    video = video_streams[0]
    width = int(video.get("width", 0))
    height = int(video.get("height", 0))
    duration = float(video.get("duration") or payload.get("format", {}).get("duration") or 0)
    if width <= 0 or height <= 0 or width * height > MAX_INPUT_PIXELS:
        raise AdapterError("input dimensions are unsupported")
    if duration <= 0 or duration > MAX_DURATION_SECONDS:
        raise AdapterError("input duration is unsupported")
    sar_numerator, sar_denominator = sar(video.get("sample_aspect_ratio"))
    aspect = display_aspect(video.get("display_aspect_ratio"), width, height, (sar_numerator, sar_denominator))
    rotation = 0
    has_display_matrix = False
    for item in video.get("side_data_list", []):
        if "rotation" in item:
            rotation = int(item["rotation"])
            has_display_matrix = True
    if not has_display_matrix:
        rotation = int(video.get("tags", {}).get("rotate", rotation))
    rotation = ((rotation % 360) + 360) % 360
    if rotation not in {0, 90, 180, 270}:
        raise AdapterError("input rotation is unsupported")
    if rotation in {90, 270}:
        aspect = 1 / aspect
    fps = ratio(video.get("avg_frame_rate", "0/1"))
    nominal_fps = ratio(video.get("r_frame_rate", "0/1"))
    if not 10 <= fps <= 60 or not 1 <= nominal_fps <= 120:
        raise AdapterError("unsupported frame rate")
    variable_frame_rate = abs(fps - nominal_fps) > 0.01
    frame_probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames", "-show_entries",
        "frame=best_effort_timestamp_time,pkt_duration_time", "-of", "json", str(path),
    ], check=True, capture_output=True, text=True, timeout=30)
    decoded_frames = json.loads(frame_probe.stdout).get("frames", [])
    timestamps = [float(frame["best_effort_timestamp_time"]) for frame in decoded_frames if "best_effort_timestamp_time" in frame]
    if len(timestamps) < 2 or any(right <= left for left, right in zip(timestamps, timestamps[1:])):
        raise AdapterError("non-monotonic or unavailable packet timestamps are unsupported")
    cadence = [right - left for left, right in zip(timestamps, timestamps[1:])]
    median_cadence = sorted(cadence)[len(cadence) // 2]
    if variable_frame_rate or any(abs(delta - median_cadence) > max(0.0005, median_cadence * 0.01) for delta in cadence):
        raise AdapterError("variable/discontinuous frame cadence is not supported without timestamp-preserving inference")
    frames = int(video.get("nb_frames") or round(duration * fps))
    if frames <= 0 or (not variable_frame_rate and abs(frames / fps - duration) > max(0.15, 2 / fps)):
        raise AdapterError("frame count and duration are inconsistent")
    field_order = str(video.get("field_order") or "unknown").lower()
    if field_order not in {"unknown", "progressive", "tt", "bb", "tb", "bt"}:
        raise AdapterError("input field order is unsupported")
    audio = audio_streams[0] if audio_streams else {}
    pixel_format = str(video.get("pix_fmt") or "unknown").lower()
    color_transfer = str(video.get("color_transfer") or "unknown").lower()
    if any(marker in pixel_format for marker in ("10", "12", "16")) or color_transfer in {"smpte2084", "arib-std-b67"}:
        raise AdapterError("HDR/high-bit-depth input is not supported by the SDR AI model")
    return {
        "width": width,
        "height": height,
        "duration": duration,
        "fps": fps,
        "frames": frames,
        "expected_frames": round(duration * fps) if variable_frame_rate else frames,
        "has_audio": bool(audio_streams),
        "sar_numerator": sar_numerator,
        "sar_denominator": sar_denominator,
        "display_aspect": aspect,
        "rotation": rotation,
        "field_order": field_order,
        "interlaced": field_order in {"tt", "bb", "tb", "bt"},
        "variable_frame_rate": variable_frame_rate,
        "video_start_time": float(video.get("start_time") or 0),
        "audio_start_time": float(audio.get("start_time") or 0) if audio else None,
        "color_range": str(video.get("color_range") or "unknown"),
        "color_space": str(video.get("color_space") or "unknown"),
        "color_transfer": color_transfer,
        "color_primaries": str(video.get("color_primaries") or "unknown"),
    }


def even(value: float) -> int:
    return max(2, int(round(value / 2.0)) * 2)


def scaled_dimensions(width: int, height: int, short_side: int) -> tuple[int, int]:
    scale = short_side / min(width, height)
    return even(width * scale), even(height * scale)


def aspect_dimensions(display_ratio: float, short_side: int) -> tuple[int, int]:
    if display_ratio >= 1:
        return even(short_side * display_ratio), even(short_side)
    return even(short_side), even(short_side / display_ratio)


def terminate(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=2)


def run(args: argparse.Namespace) -> int:
    if args.target_short_side != SUPPORTED_TARGET:
        raise AdapterError("only 720p AI output is enabled")
    if args.deadline_seconds <= 5 or args.deadline_seconds > 4 * 3600:
        raise AdapterError("deadline must be between 6 seconds and 4 hours")
    if args.max_workspace_bytes <= 0 or args.max_workspace_bytes > 10 * 1024 ** 3:
        raise AdapterError("workspace limit is invalid")
    source = Path(args.input).resolve(strict=True)
    output = Path(args.output).resolve(strict=False)
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise AdapterError("output path already exists")
    media = probe_media(source)
    estimated_output = int(media["duration"] * 8 * 1024 * 1024 / 8 + 64 * 1024 * 1024)
    if estimated_output > args.max_workspace_bytes:
        raise AdapterError("output estimate exceeds workspace limit")
    free_bytes = os.statvfs(output.parent).f_bavail * os.statvfs(output.parent).f_frsize
    if free_bytes < args.max_workspace_bytes + 10 * 1024 ** 3:
        raise AdapterError("insufficient reserved disk space")
    resource.setrlimit(resource.RLIMIT_FSIZE, (args.max_workspace_bytes, args.max_workspace_bytes))

    model, expected_model_sha = model_contract(args)
    selected_algorithm = algorithm(args)
    selected_profile = profile(args)
    selected_backend = backend(args)
    cv2.setNumThreads(max(1, min(2, int(os.environ.get("AZMIGRANTAT_AI_OPENCV_THREADS", "2")))))

    input_short = min(480, max(360, min(media["width"], media["height"])))
    model_width, model_height = aspect_dimensions(media["display_aspect"], input_short)
    native_width, native_height = model_width * 2, model_height * 2
    output_width, output_height = aspect_dimensions(media["display_aspect"], SUPPORTED_TARGET)
    infer, runtime_version = super_resolution(model, selected_algorithm, selected_backend, model_width, model_height)
    filters = []
    if media["interlaced"]:
        filters.append("bwdif=mode=send_frame:parity=auto:deint=all")
    filters.append(f"scale={model_width}:{model_height}:flags=lanczos")
    if selected_profile == "restore":
        filters.extend([
            "deblock=filter=strong:block=8:alpha=0.035:beta=0.025:gamma=0.02:delta=0.02",
            "hqdn3d=1.2:1.2:3.0:3.0",
        ])
    filters.extend(["setsar=1", "format=bgr24"])

    decode_command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "2", "-filter_threads", "2",
        "-i", str(source), "-map", "0:v:0", "-vf", ",".join(filters), "-pix_fmt", "bgr24",
        "-f", "rawvideo", "pipe:1",
    ]
    encode_command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "2", "-filter_threads", "2",
        "-thread_queue_size", "512", "-f", "rawvideo", "-pix_fmt", "bgr24", "-video_size", f"{native_width}x{native_height}",
        "-framerate", f"{media['fps']:.8f}", "-i", "pipe:0", "-thread_queue_size", "512", "-i", str(source),
        "-map", "0:v:0", "-map", "1:a:0?", "-vf", f"scale={output_width}:{output_height}:flags=lanczos,setsar=1,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-threads", "2",
        "-c:a", "aac", "-b:a", "128k", "-shortest", "-metadata:s:v:0", "rotate=0", "-movflags", "+faststart", "-f", "mp4", str(output),
    ]
    color_options = {
        "color_range": "-color_range", "color_space": "-colorspace",
        "color_transfer": "-color_trc", "color_primaries": "-color_primaries",
    }
    insert_at = encode_command.index("-movflags")
    for key, option in color_options.items():
        if media[key] not in {"", "unknown", "reserved", "unspecified"}:
            encode_command[insert_at:insert_at] = [option, media[key]]
            insert_at += 2
    decode: subprocess.Popen | None = None
    encode: subprocess.Popen | None = None
    deadline = time.monotonic() + args.deadline_seconds
    frame_bytes = model_width * model_height * 3
    processed = 0
    started = time.monotonic()
    try:
        decode = subprocess.Popen(decode_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        encode = subprocess.Popen(encode_command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        assert decode.stdout is not None and encode.stdin is not None
        while processed < media["expected_frames"]:
            if time.monotonic() >= deadline:
                raise AdapterError("AI adapter deadline exceeded")
            payload = decode.stdout.read(frame_bytes)
            if not payload:
                break
            while len(payload) < frame_bytes:
                chunk = decode.stdout.read(frame_bytes - len(payload))
                if not chunk:
                    raise AdapterError("decoder returned an incomplete frame")
                payload += chunk
            frame = np.frombuffer(payload, dtype=np.uint8).reshape((model_height, model_width, 3))
            enhanced = infer(frame)
            try:
                encode.stdin.write(enhanced.tobytes())
            except BrokenPipeError as error:
                encode_code = encode.wait(timeout=5)
                encode_error = encode.stderr.read().decode("utf-8", "replace")[-4096:] if encode.stderr else ""
                raise AdapterError(f"encoder closed input pipe ({encode_code}): {encode_error}") from error
            processed += 1
            if processed == 1 or processed % 30 == 0:
                if output.exists() and output.stat().st_size > args.max_workspace_bytes:
                    raise AdapterError("workspace byte limit exceeded")
                current_free = os.statvfs(output.parent).f_bavail * os.statvfs(output.parent).f_frsize
                if current_free < 10 * 1024 ** 3:
                    raise AdapterError("reserved free disk threshold was crossed")
            if processed == 1 or processed % max(1, media["expected_frames"] // 100) == 0:
                print(f"progress={min(97, max(1, int(processed * 97 / media['expected_frames'])))}", flush=True)
        encode.stdin.close()
        decode_code = decode.wait(timeout=10)
        encode_code = encode.wait(timeout=max(10, int(deadline - time.monotonic())))
        decode_error = decode.stderr.read().decode("utf-8", "replace")[-4096:] if decode.stderr else ""
        encode_error = encode.stderr.read().decode("utf-8", "replace")[-4096:] if encode.stderr else ""
        if decode_code != 0 or encode_code != 0:
            raise AdapterError(f"media pipeline failed: decode={decode_code} {decode_error}; encode={encode_code} {encode_error}")
        if abs(processed - media["expected_frames"]) > 1:
            raise AdapterError(f"processed frame count mismatch: {processed} != {media['expected_frames']}")
        if sha256_file(model) != expected_model_sha:
            raise AdapterError("AI model changed during processing")
        if output.stat().st_size > args.max_workspace_bytes:
            raise AdapterError("final output exceeds workspace byte limit")
        output_media = probe_media(output)
        if min(output_media["width"], output_media["height"]) != SUPPORTED_TARGET:
            raise AdapterError("output dimensions are invalid")
        if abs(output_media["frames"] - processed) > 1:
            raise AdapterError("output frame count is invalid")
        if abs(output_media["display_aspect"] - media["display_aspect"]) / media["display_aspect"] > 0.005:
            raise AdapterError("output display aspect ratio changed")
        if output_media["rotation"] != 0:
            raise AdapterError("output rotation metadata was not normalized")
        if media["has_audio"] and output_media["audio_start_time"] is not None:
            input_offset = media["audio_start_time"] - media["video_start_time"]
            output_offset = output_media["audio_start_time"] - output_media["video_start_time"]
            if abs(input_offset - output_offset) > max(0.08, 2 / media["fps"]):
                raise AdapterError("output audio/video synchronization drift is unsafe")
        if abs(output_media["duration"] - media["duration"]) > max(0.15, 2 / media["fps"]):
            raise AdapterError("output duration drift is invalid")
        print(json.dumps({
            "event": "completed",
            "algorithm": selected_algorithm,
            "backend": selected_backend,
            "runtime_version": runtime_version,
            "profile": selected_profile,
            "frames": processed,
            "elapsed_seconds": round(time.monotonic() - started, 3),
            "fps": round(processed / max(0.001, time.monotonic() - started), 3),
        }, separators=(",", ":")), flush=True)
        return 0
    except Exception:
        output.unlink(missing_ok=True)
        raise
    finally:
        terminate(decode)
        terminate(encode)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--protocol-version", type=int, required=True)
    result.add_argument("--preflight", action="store_true")
    result.add_argument("--model")
    result.add_argument("--expected-model-sha256")
    result.add_argument("--algorithm")
    result.add_argument("--profile")
    result.add_argument("--backend")
    result.add_argument("--input")
    result.add_argument("--output")
    result.add_argument("--target-short-side", type=int)
    result.add_argument("--deadline-seconds", type=int)
    result.add_argument("--max-workspace-bytes", type=int)
    result.add_argument("--natural-detail", action="store_true")
    result.add_argument("--preserve-audio", action="store_true")
    result.add_argument("--preserve-timestamps", action="store_true")
    return result


def main() -> int:
    args = parser().parse_args()
    if args.protocol_version != PROTOCOL_VERSION:
        raise AdapterError("unsupported protocol version")
    if args.preflight:
        return preflight(args)
    required = [args.input, args.output, args.target_short_side, args.deadline_seconds, args.max_workspace_bytes]
    if any(value is None for value in required):
        raise AdapterError("processing arguments are incomplete")
    if not args.natural_detail or not args.preserve_audio or not args.preserve_timestamps:
        raise AdapterError("safe media-preservation flags are required")
    return run(args)


if __name__ == "__main__":
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    try:
        raise SystemExit(main())
    except (AdapterError, subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        print(f"error={error}", file=sys.stderr)
        raise SystemExit(2)
