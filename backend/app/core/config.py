import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATASET_DIR = BASE_DIR / "dataset"
MODELS_DIR = BASE_DIR / "models_saved"
DATA_SPLITS_DIR = DATASET_DIR / "splits"

# Ensure directories exist
DATASET_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_SPLITS_DIR.mkdir(parents=True, exist_ok=True)

# Database
DB_FILE = BASE_DIR / "asl_assistive.db"
DATABASE_URL = f"sqlite:///{DB_FILE}"

# Model Hyperparameters following the Academic Project Report
TARGET_IMAGE_SIZE = (64, 64)  # Dimensions compatible with the 3 Conv/Pool stages
INPUT_CHANNELS = 3            # RGB for MediaPipe/webcam compatibility
DEFAULT_BATCH_SIZE = 32
DEFAULT_EPOCHS = 15
DEFAULT_LEARNING_RATE = 0.01   # Baseline SGD learning rate as specified
DROPOUT_RATE = 0.2

# Dataset Source Cascade configuration
DATASET_SOURCES = {
    "mendeley": {
        "name": "Mendeley Data ASL Alphabet Dataset (Cabana 2025)",
        "url": "https://data.mendeley.com/datasets/jdyksv2jhh/1",
        "license": "CC BY 4.0",
        "attribution": "Cabana, E. (2025). Advancing Accessible AI. IntelliSys 2025."
    },
    "asl_alphabet_hf": {
        "name": "HuggingFace ASL Alphabets (Marxulia)",
        "url": "https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03",
        "license": "MIT / CC BY 4.0",
        "attribution": "Marxulia ASL Sign Languages Alphabets v03 (26 classes A-Z, 10,873 images)"
    },
    "asl_mnist_voxel51": {
        "name": "Voxel51 American Sign Language MNIST",
        "url": "https://huggingface.co/datasets/Voxel51/American-Sign-Language-MNIST",
        "license": "MIT / CC0",
        "attribution": "Voxel51 ASL MNIST FiftyOne Dataset (24 classes A-Y excluding J/Z)"
    }
}
