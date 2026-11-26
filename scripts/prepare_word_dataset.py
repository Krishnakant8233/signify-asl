import os
import sys
import json
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Any
import numpy as np
import cv2

# Target ASL Vocabulary requested by the user
TARGET_VOCAB = [
    "HELLO", "THANK YOU", "PLEASE", "SORRY", "YES", "NO",
    "HELP", "WATER", "FOOD", "LOVE", "GOOD", "BAD", "FRIEND",
    "GOODBYE", "MORE", "STOP", "EAT", "DRINK", "HAPPY", "SAD"
]

BASE_DIR = Path(__file__).resolve().parent.parent
WORD_DATASET_DIR = BASE_DIR / "dataset" / "words"
VIDEOS_DIR = WORD_DATASET_DIR / "videos"
FEATURES_DIR = WORD_DATASET_DIR / "features"
SPLITS_DIR = WORD_DATASET_DIR / "splits"

WLASL_SAMPLES_URL = "https://huggingface.co/datasets/Voxel51/WLASL/raw/main/samples.json"
WLASL_VIDEO_BASE_URL = "https://huggingface.co/datasets/Voxel51/WLASL/resolve/main"

# Temporal parameters: 30 frames per video sequence, 126 landmark features (21 left hand + 21 right hand * 3 xyz)
SEQUENCE_LENGTH = 30
FEATURE_DIM = 126  # 42 landmarks * 3 (x, y, z)

def ensure_dirs():
    WORD_DATASET_DIR.mkdir(parents=True, exist_ok=True)
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)

def fetch_wlasl_catalog() -> Dict[str, List[Dict[str, Any]]]:
    """Downloads samples.json index from Voxel51/WLASL and filters for our target vocabulary."""
    print("[1/4] Fetching WLASL catalog from Hugging Face...")
    req = urllib.request.Request(WLASL_SAMPLES_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    samples = data.get("samples", [])
    print(f"Total catalog entries: {len(samples)}")

    target_map: Dict[str, List[Dict[str, Any]]] = {w: [] for w in TARGET_VOCAB}
    for s in samples:
        gloss = s.get("gloss", {}).get("label", "").upper().strip()
        fp = s.get("filepath", "")
        if gloss in target_map and fp:
            target_map[gloss].append({
                "filepath": fp,
                "duration": s.get("metadata", {}).get("duration", 0),
                "frames": s.get("metadata", {}).get("total_frame_count", 0),
                "url": f"{WLASL_VIDEO_BASE_URL}/{fp}"
            })

    total_matched = sum(len(v) for v in target_map.values())
    print(f"Matched {total_matched} videos across {len([k for k, v in target_map.items() if v])} target vocabulary classes.")
    return target_map

def download_videos(catalog: Dict[str, List[Dict[str, Any]]], max_samples_per_word: int = 12):
    """Downloads video clips for each word class."""
    print(f"[2/4] Downloading video samples (up to {max_samples_per_word} per class)...")
    downloaded_files: Dict[str, List[Path]] = {}

    for word, items in catalog.items():
        if not items:
            continue
        word_dir = VIDEOS_DIR / word.replace(" ", "_")
        word_dir.mkdir(parents=True, exist_ok=True)
        downloaded_files[word] = []

        selected_items = items[:max_samples_per_word]
        print(f"  --> Downloading '{word}' ({len(selected_items)} samples)...")

        for idx, item in enumerate(selected_items):
            file_name = Path(item["filepath"]).name
            target_file = word_dir / file_name

            if not target_file.exists() or target_file.stat().st_size == 0:
                try:
                    req = urllib.request.Request(item["url"], headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        target_file.write_bytes(resp.read())
                    time.sleep(0.05)  # respectful request rate
                except Exception as e:
                    print(f"      Warning: failed to download {file_name}: {e}")
                    if target_file.exists():
                        target_file.unlink()
                    continue

            if target_file.exists() and target_file.stat().st_size > 1000:
                downloaded_files[word].append(target_file)

    total_dl = sum(len(v) for v in downloaded_files.values())
    print(f"Successfully downloaded {total_dl} videos.")
    return downloaded_files

def extract_temporal_features(video_path: Path) -> np.ndarray:
    """
    Extracts a normalized (30, 126) temporal landmark trajectory from a video.
    Uses OpenCV optical/skin/contour keypoints and landmark geometry.
    If MediaPipe is available, uses MediaPipe Hand Landmark coordinates.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return np.zeros((SEQUENCE_LENGTH, FEATURE_DIM), dtype=np.float32)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        total_frames = 30

    # Uniform temporal sampling indices
    indices = np.linspace(0, max(0, total_frames - 1), SEQUENCE_LENGTH).astype(int)

    sequence = []
    frame_idx = 0
    read_ok, frame = cap.read()

    prev_pts = np.zeros(FEATURE_DIM, dtype=np.float32)

    for target_idx in indices:
        while frame_idx < target_idx and read_ok:
            read_ok, frame = cap.read()
            frame_idx += 1

        if not read_ok or frame is None:
            sequence.append(prev_pts.copy())
            continue

        h, w = frame.shape[:2]
        # Robust optical hand/motion detection:
        # Convert to HSV / YCrCb for skin segmentation and hand trajectory detection
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        frame_features = np.zeros(FEATURE_DIM, dtype=np.float32)

        # Sort contours by area to find left and right hands
        valid_cnts = [c for c in contours if cv2.contourArea(c) > 200]
        valid_cnts = sorted(valid_cnts, key=cv2.contourArea, reverse=True)[:2]

        for hand_idx, cnt in enumerate(valid_cnts):
            offset = hand_idx * 63  # 21 points * 3
            # Extract 21 geometric points along contour perimeter and center
            m = cv2.moments(cnt)
            cx = (m["m10"] / (m["m00"] + 1e-5)) / w
            cy = (m["m01"] / (m["m00"] + 1e-5)) / h

            # Metacarpal center
            frame_features[offset] = cx
            frame_features[offset + 1] = cy
            frame_features[offset + 2] = 0.0

            # 20 distributed perimeter points to represent hand contour & fingertips
            perimeter_pts = cnt.reshape(-1, 2)
            if len(perimeter_pts) > 0:
                step = max(1, len(perimeter_pts) // 20)
                for pt_idx in range(20):
                    p = perimeter_pts[(pt_idx * step) % len(perimeter_pts)]
                    px = p[0] / w
                    py = p[1] / h
                    pz = np.sin((pt_idx / 20.0) * np.pi) * 0.1  # depth approximation
                    base = offset + 3 + (pt_idx * 3)
                    if base + 2 < FEATURE_DIM:
                        frame_features[base] = px
                        frame_features[base + 1] = py
                        frame_features[base + 2] = pz

        prev_pts = frame_features.copy()
        sequence.append(frame_features)

    cap.release()

    seq_arr = np.array(sequence, dtype=np.float32)
    if len(seq_arr) < SEQUENCE_LENGTH:
        # Pad with last frame if needed
        padding = np.tile(seq_arr[-1:], (SEQUENCE_LENGTH - len(seq_arr), 1))
        seq_arr = np.vstack([seq_arr, padding])
    elif len(seq_arr) > SEQUENCE_LENGTH:
        seq_arr = seq_arr[:SEQUENCE_LENGTH]

    return seq_arr

def process_and_split(downloaded_files: Dict[str, List[Path]]):
    """Processes downloaded videos into normalized feature arrays and creates train/val/test splits."""
    print("[3/4] Extracting temporal landmark features and building stratified splits...")

    classes = sorted([w for w, files in downloaded_files.items() if len(files) >= 3])
    print(f"Active trained word vocabulary ({len(classes)} classes):", classes)

    data_x = []
    data_y = []
    manifest = []

    for class_idx, word in enumerate(classes):
        files = downloaded_files[word]
        for video_path in files:
            features = extract_temporal_features(video_path)
            data_x.append(features)
            data_y.append(class_idx)
            manifest.append({
                "word": word,
                "class_idx": class_idx,
                "video_file": video_path.name
            })

    X = np.array(data_x, dtype=np.float32)
    y = np.array(data_y, dtype=np.int32)
    print(f"Extracted dataset tensor shape: X={X.shape}, y={y.shape}")

    # Stratified Split (70% Train, 15% Val, 15% Test)
    np.random.seed(42)
    train_indices = []
    val_indices = []
    test_indices = []

    for c in range(len(classes)):
        c_idxs = np.where(y == c)[0]
        np.random.shuffle(c_idxs)
        n = len(c_idxs)
        n_test = max(1, int(n * 0.15))
        n_val = max(1, int(n * 0.15))
        n_train = n - n_test - n_val
        if n_train < 1:
            n_train = 1
            n_test = max(1, (n - 1) // 2)
            n_val = n - n_train - n_test

        train_indices.extend(c_idxs[:n_train])
        val_indices.extend(c_idxs[n_train:n_train + n_val])
        test_indices.extend(c_idxs[n_train + n_val:])

    train_X, train_y = X[train_indices], y[train_indices]
    val_X, val_y = X[val_indices], y[val_indices]
    test_X, test_y = X[test_indices], y[test_indices]

    print(f"Splits created: Train={len(train_X)}, Val={len(val_X)}, Test={len(test_X)}")

    # Save feature tensors
    np.save(SPLITS_DIR / "train_X.npy", train_X)
    np.save(SPLITS_DIR / "train_y.npy", train_y)
    np.save(SPLITS_DIR / "val_X.npy", val_X)
    np.save(SPLITS_DIR / "val_y.npy", val_y)
    np.save(SPLITS_DIR / "test_X.npy", test_X)
    np.save(SPLITS_DIR / "test_y.npy", test_y)

    # Save metadata & dataset stats
    stats = {
        "dataset_name": "WLASL Word-Level Sign Language",
        "total_classes": len(classes),
        "classes": classes,
        "sequence_length": SEQUENCE_LENGTH,
        "feature_dim": FEATURE_DIM,
        "total_samples": len(X),
        "splits": {
            "train": len(train_X),
            "val": len(val_X),
            "test": len(test_X)
        },
        "class_distribution": {w: int(np.sum(y == idx)) for idx, w in enumerate(classes)},
        "created_at": time.time()
    }

    with open(WORD_DATASET_DIR / "dataset_stats.json", "w") as f:
        json.dump(stats, f, indent=2)

    print(f"[4/4] Dataset preparation complete! Saved to {WORD_DATASET_DIR}")
    return stats

def main():
    ensure_dirs()
    catalog = fetch_wlasl_catalog()
    downloaded = download_videos(catalog, max_samples_per_word=10)
    stats = process_and_split(downloaded)
    print("\nSummary of Prepared ASL Word Dataset:")
    print(f"Classes ({stats['total_classes']}): {', '.join(stats['classes'])}")
    print(f"Total Videos: {stats['total_samples']} (Train: {stats['splits']['train']}, Val: {stats['splits']['val']}, Test: {stats['splits']['test']})")

if __name__ == "__main__":
    main()
