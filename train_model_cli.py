import sys
import os
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from app.services.model_service import model_service

if __name__ == "__main__":
    print("==================================================")
    print("STARTING GENUINE CNN MODEL TRAINING ON ASL DATASET")
    print("Architecture: 3-Stage Conv2D (16->32->64) + MaxPool + Dense(128) + Dropout(0.2)")
    print("Optimizer: Adam / Baseline SGD lr=0.01")
    print("==================================================")

    # We train for 10 epochs with batch size 64 for rapid yet strong convergence
    model_service._run_training_worker(
        epochs=10,
        batch_size=64,
        learning_rate=0.001,
        optimizer_type="adam"
    )
    print("Training finished.")
