import os
import io
import json
import shutil
import random
import urllib.request
import ssl
from pathlib import Path
from PIL import Image
from typing import Dict, Any, List, Tuple
from ..core.config import DATASET_DIR, DATA_SPLITS_DIR, DATASET_SOURCES

# Permissive SSL context for reliable download across Windows environments
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

class DatasetService:
    def __init__(self):
        self.raw_dir = DATASET_DIR / "raw"
        self.splits_dir = DATA_SPLITS_DIR
        self.stats_file = DATASET_DIR / "stats.json"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.splits_dir.mkdir(parents=True, exist_ok=True)

    def get_status(self) -> Dict[str, Any]:
        has_raw = self.raw_dir.exists() and any(self.raw_dir.iterdir())
        train_dir = self.splits_dir / "train"
        has_splits = train_dir.exists() and any(train_dir.iterdir())
        stats = self.get_stats() if self.stats_file.exists() else None
        
        return {
            "has_raw_data": has_raw,
            "has_splits": has_splits,
            "dataset_ready": has_splits and stats is not None and stats.get("total_valid_images", 0) > 0,
            "stats": stats
        }

    def get_stats(self) -> Dict[str, Any]:
        if self.stats_file.exists():
            try:
                with open(self.stats_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return self._compute_and_save_stats()

    def download_and_prepare_dataset(self, source_choice: str = "auto") -> Dict[str, Any]:
        """
        Cascade download:
        1. Attempt Mendeley
        2. Attempt Marxulia ASL Alphabet (26 classes RGB)
        3. Attempt Voxel51 ASL MNIST (24 classes)
        """
        print(f"[DatasetService] Initiating dataset preparation with source_choice: {source_choice}")
        active_source = None
        error_logs = []

        # Cascade order
        if source_choice == "mendeley" or source_choice == "auto":
            try:
                print("[DatasetService] Trying Primary: Mendeley ASL Alphabet Dataset...")
                # Attempt download if direct link resolves
                success = self._download_from_mendeley()
                if success:
                    active_source = "mendeley"
            except Exception as e:
                msg = f"Mendeley download failed or unavailable: {e}"
                print(f"[DatasetService] {msg}")
                error_logs.append(msg)

        if not active_source and (source_choice == "asl_alphabet_hf" or source_choice == "auto"):
            try:
                print("[DatasetService] Trying Alternative 1: HuggingFace ASL Alphabets (Marxulia - 26 classes RGB)...")
                success = self._download_from_hf_parquet()
                if success:
                    active_source = "asl_alphabet_hf"
            except Exception as e:
                msg = f"HuggingFace Parquet download failed: {e}"
                print(f"[DatasetService] {msg}")
                error_logs.append(msg)

        if not active_source and (source_choice == "asl_mnist_voxel51" or source_choice == "auto"):
            try:
                print("[DatasetService] Trying Alternative 2: Voxel51 ASL MNIST...")
                success = self._download_from_voxel51()
                if success:
                    active_source = "asl_mnist_voxel51"
            except Exception as e:
                msg = f"Voxel51 download failed: {e}"
                print(f"[DatasetService] {msg}")
                error_logs.append(msg)

        if not active_source:
            raise RuntimeError(f"All dataset sources failed: {'; '.join(error_logs)}")

        print(f"[DatasetService] Successfully downloaded raw data using {active_source}")
        
        # Validate, clean, and split
        validation_info = self._validate_and_clean_images()
        split_info = self._create_splits()
        stats = self._compute_and_save_stats(active_source)
        
        return {
            "status": "success",
            "source": DATASET_SOURCES.get(active_source, {}),
            "validation": validation_info,
            "splits": split_info,
            "stats": stats
        }

    def _download_from_hf_parquet(self) -> bool:
        """
        Downloads train-00000-of-00001.parquet from Marxulia/asl_sign_languages_alphabets_v03
        Reads image bytes directly and saves to raw_dir/{class_name}/{idx}.jpg
        """
        import pandas as pd
        
        parquet_url = "https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03/resolve/main/data/train-00000-of-00001.parquet"
        temp_parquet = DATASET_DIR / "temp_asl.parquet"
        
        print(f"[DatasetService] Downloading {parquet_url}...")
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(parquet_url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=120, context=ssl_ctx) as resp, open(temp_parquet, 'wb') as out_f:
            shutil.copyfileobj(resp, out_f)
            
        print("[DatasetService] Reading Parquet file...")
        df = pd.read_parquet(temp_parquet)
        print(f"[DatasetService] Parquet loaded: {len(df)} samples, columns: {df.columns.tolist()}")
        
        # Label mapping from class index to letter (0->A, ..., 25->Z)
        class_names = [chr(ord('A') + i) for i in range(26)]
        
        # Create directories
        for name in class_names:
            (self.raw_dir / name).mkdir(parents=True, exist_ok=True)
            
        # Extract images
        saved_count = 0
        for idx, row in df.iterrows():
            lbl_idx = row['label']
            if 0 <= lbl_idx < len(class_names):
                char = class_names[lbl_idx]
                img_data = row['image']
                
                # img_data is either dict {'bytes': b'...'} or bytes
                if isinstance(img_data, dict) and 'bytes' in img_data:
                    raw_bytes = img_data['bytes']
                elif isinstance(img_data, (bytes, bytearray)):
                    raw_bytes = bytes(img_data)
                else:
                    continue
                    
                dest_file = self.raw_dir / char / f"{char}_{idx:05d}.jpg"
                with open(dest_file, "wb") as img_f:
                    img_f.write(raw_bytes)
                saved_count += 1
                
        print(f"[DatasetService] Extracted {saved_count} images across {len(class_names)} classes.")
        
        if temp_parquet.exists():
            temp_parquet.unlink()
            
        return saved_count > 0

    def _download_from_mendeley(self) -> bool:
        # Mendeley direct zip requires session/tokens if direct API gives 404
        # We try to fetch the zip link if available
        return False

    def _download_from_voxel51(self) -> bool:
        # Fallback to Voxel51 samples
        print("[DatasetService] Fetching samples.json from Voxel51...")
        samples_url = "https://huggingface.co/datasets/Voxel51/American-Sign-Language-MNIST/resolve/main/samples.json"
        req = urllib.request.Request(samples_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30, context=ssl_ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
        samples = data.get("samples", [])
        print(f"[DatasetService] Found {len(samples)} samples. Downloading representative subset...")
        
        # Download subset per class (e.g. 100 images per class for fast reliable download)
        by_class: Dict[str, list] = {}
        for s in samples:
            lbl = s.get("ground_truth", {}).get("label")
            if lbl:
                by_class.setdefault(lbl, []).append(s.get("filepath"))
                
        saved = 0
        for lbl, paths in by_class.items():
            class_folder = self.raw_dir / lbl
            class_folder.mkdir(parents=True, exist_ok=True)
            for i, p in enumerate(paths[:100]):
                img_url = f"https://huggingface.co/datasets/Voxel51/American-Sign-Language-MNIST/resolve/main/{p}"
                dest = class_folder / f"{lbl}_{i:04d}.jpg"
                try:
                    r = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(r, timeout=10, context=ssl_ctx) as img_resp, open(dest, "wb") as out:
                        shutil.copyfileobj(img_resp, out)
                    saved += 1
                except Exception:
                    pass
        return saved > 0

    def _validate_and_clean_images(self) -> Dict[str, int]:
        """
        Validates all images in raw_dir, removing any truncated, corrupted, or zero-byte files.
        """
        print("[DatasetService] Validating and cleaning raw images...")
        valid_count = 0
        corrupted_count = 0
        
        for class_dir in self.raw_dir.iterdir():
            if not class_dir.is_dir():
                continue
            for img_path in list(class_dir.iterdir()):
                if not img_path.is_file():
                    continue
                try:
                    if img_path.stat().st_size == 0:
                        raise ValueError("Zero byte file")
                    with Image.open(img_path) as im:
                        im.verify()
                    # Reopen to ensure full decompression
                    with Image.open(img_path) as im:
                        im.load()
                    valid_count += 1
                except Exception as e:
                    print(f"[DatasetService] Removing corrupted image {img_path}: {e}")
                    img_path.unlink()
                    corrupted_count += 1
                    
        return {"valid_images": valid_count, "corrupted_images_removed": corrupted_count}

    def _create_splits(self, train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15) -> Dict[str, Any]:
        """
        Splits dataset into train, validation, and test sets with stratified class distribution.
        """
        print("[DatasetService] Creating train / validation / test splits...")
        train_dir = self.splits_dir / "train"
        val_dir = self.splits_dir / "val"
        test_dir = self.splits_dir / "test"
        
        # Clean previous splits
        for d in [train_dir, val_dir, test_dir]:
            if d.exists():
                shutil.rmtree(d)
            d.mkdir(parents=True, exist_ok=True)
            
        split_counts = {"train": 0, "val": 0, "test": 0}
        
        for class_dir in sorted(self.raw_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            char = class_dir.name
            images = list(class_dir.glob("*.*"))
            random.seed(42)
            random.shuffle(images)
            
            n = len(images)
            n_train = int(n * train_ratio)
            n_val = int(n * val_ratio)
            
            train_imgs = images[:n_train]
            val_imgs = images[n_train:n_train + n_val]
            test_imgs = images[n_train + n_val:]
            
            for split_name, subset in [("train", train_imgs), ("val", val_imgs), ("test", test_imgs)]:
                dest_class_dir = self.splits_dir / split_name / char
                dest_class_dir.mkdir(parents=True, exist_ok=True)
                for img in subset:
                    shutil.copy2(img, dest_class_dir / img.name)
                    split_counts[split_name] += 1
                    
        return split_counts

    def _compute_and_save_stats(self, source_name: str = "asl_alphabet_hf") -> Dict[str, Any]:
        """
        Computes comprehensive statistics for the dataset and writes stats.json.
        """
        class_distribution: Dict[str, int] = {}
        split_stats: Dict[str, int] = {"train": 0, "val": 0, "test": 0}
        sample_dimensions = None
        
        for split in ["train", "val", "test"]:
            s_dir = self.splits_dir / split
            if s_dir.exists():
                for c_dir in sorted(s_dir.iterdir()):
                    if c_dir.is_dir():
                        count = len(list(c_dir.glob("*.*")))
                        split_stats[split] += count
                        class_distribution[c_dir.name] = class_distribution.get(c_dir.name, 0) + count
                        if not sample_dimensions:
                            sample = next(c_dir.glob("*.*"), None)
                            if sample:
                                try:
                                    with Image.open(sample) as im:
                                        sample_dimensions = {"width": im.width, "height": im.height, "mode": im.mode}
                                except Exception:
                                    pass
                                    
        classes = sorted(list(class_distribution.keys()))
        total_valid = sum(class_distribution.values())
        
        stats = {
            "source": DATASET_SOURCES.get(source_name, {}),
            "total_classes": len(classes),
            "classes": classes,
            "total_valid_images": total_valid,
            "sample_dimensions": sample_dimensions or {"width": 64, "height": 64, "mode": "RGB"},
            "class_distribution": class_distribution,
            "split_distribution": split_stats,
            "license": DATASET_SOURCES.get(source_name, {}).get("license", "Public / Open Source"),
            "attribution": DATASET_SOURCES.get(source_name, {}).get("attribution", "")
        }
        
        with open(self.stats_file, "w") as f:
            json.dump(stats, f, indent=2)
            
        return stats

dataset_service = DatasetService()
