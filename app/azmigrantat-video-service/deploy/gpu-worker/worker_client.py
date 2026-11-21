#!/usr/bin/env python3
"""Outbound-only, lease-scoped SwiftVR worker protocol client."""
import hashlib, http.client, json, os, queue, shutil, signal, subprocess, threading, time, urllib.parse, urllib.request
from pathlib import Path

BASE = os.environ["GPU_ORCHESTRATOR_PUBLIC_URL"].rstrip("/")
BOOTSTRAP = os.environ["GPU_BOOTSTRAP_TOKEN"]
WORK = Path("/work/job")
MODEL = Path(os.environ.get("SWIFTVR_MODEL_DIR", "/models/swiftvr"))

def token_claims(token):
    import base64
    payload = token.split(".", 1)[0]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))

def request_json(method, path, token, body=None):
    data = None if body is None else json.dumps(body, separators=(",", ":")).encode()
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)

def download(path, token, destination):
    req = urllib.request.Request(BASE + path, method="GET", headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=120) as response, destination.open("xb") as output:
        while chunk := response.read(1024 * 1024): output.write(chunk)

def upload(path, token, source):
    url = urllib.parse.urlsplit(BASE + path)
    if url.scheme != "https": raise RuntimeError("GPU worker transport must use HTTPS")
    connection = http.client.HTTPSConnection(url.hostname, url.port or 443, timeout=120)
    connection.putrequest("PUT", url.path); connection.putheader("Authorization", "Bearer " + token); connection.putheader("Content-Type", "application/octet-stream"); connection.putheader("Content-Length", str(source.stat().st_size)); connection.endheaders()
    with source.open("rb") as stream:
        while chunk := stream.read(1024 * 1024): connection.send(chunk)
    response = connection.getresponse(); payload = response.read()
    if response.status not in (200, 201): raise RuntimeError(f"result upload rejected with HTTP {response.status}")
    return json.loads(payload)

def sha256(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024): value.update(chunk)
    return value.hexdigest()

def probe(path):
    return json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], text=True, timeout=30))

def run_initialization(command, heartbeat, timeout):
    process = subprocess.Popen(command, start_new_session=True)
    deadline = time.monotonic() + timeout
    try:
        while process.poll() is None:
            if time.monotonic() >= deadline:
                raise TimeoutError("model initialization timed out")
            heartbeat("initializing", 1)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                pass
        if process.returncode != 0:
            raise RuntimeError(f"model initialization exited with status {process.returncode}")
    except BaseException:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: os.killpg(process.pid, signal.SIGKILL)
        raise

def main():
    process = None
    WORK.mkdir(parents=True, exist_ok=False)
    try:
        contract = request_json("POST", "/v1/gpu-worker/bootstrap", BOOTSTRAP); caps = contract["capabilities"]; paths = contract["paths"]
        progress_claims = token_claims(caps["progress"])
        def heartbeat(state, progress):
            nonlocal caps
            payload = {"version": 1, "job_id": contract["job_id"], "lease_token": progress_claims["lease_token"], "worker_id": progress_claims["worker_id"], "state": state, "progress": progress, "processed_frames": 0, "total_frames": 0, "heartbeat_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            reply = request_json("POST", paths["progress"], caps["progress"], payload); caps.update(reply.get("capabilities", {}))
        heartbeat("initializing", 1)
        chunks = os.environ.get("SWIFTVR_MODEL_CHUNKS_DIR")
        if chunks:
            run_initialization(["python3", "/opt/azmigrantat-gpu-worker/reconstruct_model.py", "--chunks", chunks, "--manifest", os.environ["SWIFTVR_RECONSTRUCTION_MANIFEST"], "--output", str(MODEL)], heartbeat, 1800)
        run_initialization(["python3", "/opt/azmigrantat-gpu-worker/verify_model_manifest.py", "--manifest", "/opt/azmigrantat-gpu-worker/model-manifest.json", "--checkpoint", str(MODEL)], heartbeat, 900)
        heartbeat("ready", 2)
        source, result, cancel = WORK / "source.bin", WORK / "result.mp4", WORK / "cancel"
        download(paths["source"], caps["source"], source)
        width, height = int(contract["target_width"]), int(contract["target_height"])
        command = ["python3", "/opt/azmigrantat-gpu-worker/swiftvr_restore.py", "--input", str(source), "--output", str(result), "--checkpoint", str(MODEL), "--target-width", str(width), "--target-height", str(height), "--timeout-seconds", str(max(60, int(contract["deadline_at"] / 1000 - time.time()))), "--cancel-file", str(cancel)]
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True); lines = queue.Queue()
        threading.Thread(target=lambda: [lines.put(line) for line in process.stdout], daemon=True).start()
        last = {"progress": 1, "processed_frames": 0, "total_frames": 0, "state": "starting"}; heartbeat = 0.0
        while process.poll() is None:
            try:
                line = lines.get(timeout=1); print(line, end="", flush=True)
                try:
                    event = json.loads(line)
                    if event.get("event") == "progress": last.update({key: event[key] for key in ("progress", "processed_frames", "total_frames", "measured_fps") if key in event}); last["state"] = "restoring"
                except (json.JSONDecodeError, TypeError): pass
            except queue.Empty: pass
            if time.monotonic() - heartbeat >= 10:
                progress_claims = token_claims(caps["progress"])
                payload = {"version": 1, "job_id": contract["job_id"], "lease_token": progress_claims["lease_token"], "worker_id": progress_claims["worker_id"], "state": last["state"], "progress": last["progress"], "processed_frames": last.get("processed_frames", 0), "total_frames": last.get("total_frames", 0), "heartbeat_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
                reply = request_json("POST", paths["progress"], caps["progress"], payload); caps.update(reply.get("capabilities", {})); heartbeat = time.monotonic()
                if request_json("GET", paths["cancel"], caps["cancel"]).get("cancel_requested"): cancel.touch()
        if process.returncode != 0: raise RuntimeError(f"SwiftVR process exited with status {process.returncode}")
        uploaded = upload(paths["result"], caps["result"], result); metadata = probe(result); video = next(item for item in metadata["streams"] if item["codec_type"] == "video")
        claims = token_claims(caps["complete"])
        completion = {"version": 1, "job_id": contract["job_id"], "lease_token": claims["lease_token"], "worker_id": claims["worker_id"], "result_sha256": uploaded["sha256"], "result_size": result.stat().st_size, "duration_seconds": float(metadata["format"]["duration"]), "width": int(video["width"]), "height": int(video["height"]), "fps": 0, "audio_present": any(item["codec_type"] == "audio" for item in metadata["streams"]), "processing_seconds": 0, "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        request_json("POST", paths["complete"], caps["complete"], completion)
    except BaseException:
        if process is not None and process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: os.killpg(process.pid, signal.SIGKILL)
        raise
    finally:
        shutil.rmtree(WORK, ignore_errors=True)

if __name__ == "__main__": main()
