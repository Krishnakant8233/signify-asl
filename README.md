# Real-Time Sign Gesture Recognition for Assistive Communication

[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-FF6F00?logo=tensorflow&logoColor=white)](https://tensorflow.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

An end-to-end computer vision and deep learning assistive communication system designed to bridge the communication gap between individuals who communicate using sign language and the hearing community.

Built as an academic capstone application, this project faithfully implements the convolutional neural network (CNN) architecture and methodology specified in the academic project report, integrating **MediaPipe** hand tracking, **Otsu histogram skin segmentation**, **browser-native text-to-speech**, and an **assistive sentence builder**.

---

## Key Features

1. **Academic Report CNN Architecture**:
   - Genuine 3-stage Convolutional Neural Network with 583,882 trainable parameters.
   - Stage 1: Conv2D (16 filters, 2×2, ReLU) + MaxPooling2D (2×2).
   - Stage 2: Conv2D (32 filters, 3×3, ReLU) + MaxPooling2D (2×2).
   - Stage 3: Conv2D (64 filters, 5×5, ReLU) + MaxPooling2D (2×2).
   - Dense Head: Flatten + Dense (128 neurons, ReLU) + Dropout (0.2) + Softmax (26 classes A–Z).
   - Loss: Categorical Cross-Entropy, Baseline SGD (lr=0.01) and Adam optimizers.

2. **Automated Multi-Source Public Dataset Pipeline**:
   - Zero-credential cascading downloader:
     - **Primary**: Mendeley Data ASL Alphabet Dataset (Cabana, 2025).
     - **Alternative 1**: Marxulia ASL Alphabets (10,873 RGB hand images across 26 classes A–Z).
     - **Alternative 2**: Voxel51 American Sign Language MNIST (24 classes A–Y).
   - Automatic corruption detection and removal (0 corrupted images, 100% verified).
   - Stratified dataset partitioning: 70% Train (7,609), 15% Validation (1,628), 15% Test (1,636).

3. **Dual-Mode Computer Vision Hand Tracking**:
   - **Mode A: MediaPipe Hands**: 21 3D hand landmarks tracking with dynamic bounding box extraction and 25% boundary padding.
   - **Mode B: Histogram Skin Segmentation**: HSV color space skin thresholding + Otsu binarization + morphological ellipse closing + largest contour bounding box.

4. **Real-Time Prediction Stabilization & Anti-Flicker**:
   - Temporal sliding-window majority buffer (last 6 frames) preventing webcam frame flicker.
   - Duplicate prevention guard: Prevents repeated frame insertions while holding a gesture.

5. **Mandatory Automatic Voice Output (Free & Keyless)**:
   - Uses browser-native **Web Speech API** (`window.speechSynthesis` / `SpeechSynthesisUtterance`).
   - Automatic character speech when a stable gesture is locked.
   - Manual word vocalization ("Speak Word") and sentence vocalization ("Speak Sentence").
   - Voice selector with system voice enumeration, rate (0.5x–2.0x), pitch, and volume sliders.

6. **Full Communication Suite & SQLite Persistence**:
   - Assistive sentence construction ribbon with Space, Backspace, Clear, Copy, and Download (.txt).
   - Common vocabulary banks and predictive word completion.
   - SQLite persistence for recognition session logs and saved sentences.

---

## Architecture Pipeline

```
Webcam Video Feed
      │
      ▼
Hand Detection & Bounding Box
 ├── Mode 1: MediaPipe 21 Landmarks
 └── Mode 2: HSV Skin Mask + Otsu Contour
      │
      ▼
Hand Cropping & Padding (25%)
      │
      ▼
Preprocessing: Resize to 64x64, Normalization (/255.0)
      │
      ▼
Academic Report 3-Stage CNN Inference
 ├── Conv2D(16) -> MaxPool(2x2)
 ├── Conv2D(32) -> MaxPool(2x2)
 ├── Conv2D(64) -> MaxPool(2x2)
 └── Flatten -> Dense(128) -> Dropout(0.2) -> Softmax(26)
      │
      ▼
Temporal Stabilization & Majority Voting
      │
      ├──> New Character Emitted? ──> Browser Web Speech API ("A", "B", ...)
      │
      ▼
Assistive Sentence Builder (e.g. H -> E -> L -> L -> O)
      │
      ├──> Word Completion ("HELLO")
      ├──> Speak Word / Speak Sentence
      └──> SQLite Database Logging
```

---

## Directory Structure

```
ML Project/
├── backend/
│   └── app/
│       ├── api/
│       │   └── routes.py             # FastAPI REST endpoints
│       ├── core/
│       │   └── config.py             # Hyperparameters & paths
│       ├── models/
│       │   └── database.py           # SQLite SQLAlchemy tables
│       ├── services/
│       │   ├── dataset_service.py    # Auto-downloader, validator, splitter
│       │   ├── model_service.py      # CNN builder, trainer, evaluator
│       │   └── cv_service.py         # MediaPipe & Histogram hand detection
│       └── main.py                   # FastAPI application entrypoint
├── dataset/
│   ├── raw/                          # 26 Alphabet class folders (A-Z)
│   ├── splits/                       # train (7,609), val (1,628), test (1,636)
│   └── stats.json                    # Generated dataset statistics
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar
│   │   ├── pages/                    # 8 Dashboard pages
│   │   ├── services/                 # api.ts, speech.ts (Web Speech API)
│   │   └── types/                    # TypeScript interfaces
│   └── package.json
├── models_saved/
│   ├── best_asl_cnn.keras            # Best validation checkpoint
│   ├── asl_cnn_final.keras           # Final trained model
│   └── active_model_meta.json        # Test accuracy, confusion matrix
├── tests/
│   └── test_backend.py               # Automated unit & integration tests
├── prepare_dataset_cli.py            # CLI for dataset download & prep
├── train_model_cli.py                # CLI for CNN model training
├── run_project.bat                   # One-click Windows startup batch script
├── requirements.txt                  # Python dependencies
└── README.md                         # Documentation
```

---

## Quickstart Guide (Windows)

### 1. One-Click Execution

Simply double-click `run_project.bat` or run:
```cmd
run_project.bat
```
This launcher presents options to start both the FastAPI backend and React frontend simultaneously, or run training and testing.

### 2. Manual Startup Commands

#### Step A: Install Backend Dependencies
```bash
pip install -r requirements.txt
```

#### Step B: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

#### Step C: Download & Prepare Dataset (Automated)
```bash
python prepare_dataset_cli.py
```

#### Step D: Train the CNN Model
```bash
python train_model_cli.py
```

#### Step E: Start Backend API
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

#### Step F: Start Frontend UI
```bash
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## Running the Automated Test Suite

To verify the entire application pipeline end-to-end:
```bash
python -m unittest tests/test_backend.py
```

Verified components:
- API Health & Database initialization
- Dataset integrity, splits, and class counts
- CNN architecture conformance with academic report
- Computer vision preprocessing and temporal stabilization
- Sentence CRUD operations
- Assistive application settings

---

## Demonstration Workflow

1. **Dashboard (`/`)**: Displays real-time backend connection, loaded CNN model, and 26-class dataset breakdown.
2. **Live Recognition (`/live`)**:
   - Click **Start Webcam**.
   - Show any ASL gesture (e.g. "A", "B", "C", "L", "V") to the camera.
   - The green box detects the hand; the processed 64×64 thumbnail displays what the CNN sees.
   - Upon stabilization, the browser **vocalizes the character automatically**.
   - Characters stream into the **Sentence Builder**.
   - Click **Speak Word** or **Speak Full Sentence** for instant speech output.
3. **Sentence Builder (`/sentence`)**: Complete words with predictive suggestions, add spaces, copy to clipboard, or download as `.txt`.
4. **Dataset Explorer (`/dataset`)**: View sample counts per letter with interactive charts.
5. **Model Training (`/training`)**: View the 3-stage CNN layer diagram and real-time learning curves.
6. **Model Evaluation (`/evaluation`)**: View test accuracy, precision, recall, and the 26×26 Confusion Matrix heatmap.
7. **Speech Settings (`/speech-settings`)**: Test voice output, change voices, adjust speech rate, and toggle automatic character speech.

---

## Attribution & Dataset Licensing

- **Dataset**: ASL Alphabet Dataset (based on CC BY 4.0 / MIT public domain datasets).
- **Attribution**: Mendeley Data / Cabana, E. (2025). Advancing Accessible AI: A Comprehensive Dataset and Neural Models for Real-Time American Sign Language Alphabet Classification. IntelliSys 2025.
