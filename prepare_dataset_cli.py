import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from app.services.dataset_service import dataset_service

if __name__ == "__main__":
    print("Starting automated ASL dataset download and preparation...")
    res = dataset_service.download_and_prepare_dataset(source_choice="auto")
    print("Dataset preparation result:")
    print("  Status:", res.get("status"))
    print("  Source:", res.get("source", {}).get("name"))
    print("  Valid images:", res.get("validation", {}).get("valid_images"))
    print("  Corrupted removed:", res.get("validation", {}).get("corrupted_images_removed"))
    print("  Splits:", res.get("splits"))
    print("  Total Classes:", res.get("stats", {}).get("total_classes"))
    print("  Classes:", res.get("stats", {}).get("classes"))
