import os
import json
import threading
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from ..core.config import (
    MODELS_DIR, DATA_SPLITS_DIR, TARGET_IMAGE_SIZE, 
    INPUT_CHANNELS, DEFAULT_BATCH_SIZE, DEFAULT_EPOCHS, 
    DEFAULT_LEARNING_RATE, DROPOUT_RATE
)
from .dataset_service import dataset_service

class ModelService:
    def __init__(self):
        self.models_dir = MODELS_DIR
        self.active_model = None
        self.active_classes: List[str] = []
        self.model_metadata_file = self.models_dir / "active_model_meta.json"
        
        # Training state
        self.is_training = False
        self.training_thread: Optional[threading.Thread] = None
        self.training_progress: Dict[str, Any] = {
            "is_training": False,
            "current_epoch": 0,
            "total_epochs": 0,
            "train_loss": 0.0,
            "train_accuracy": 0.0,
            "val_loss": 0.0,
            "val_accuracy": 0.0,
            "epochs_history": [],
            "status": "idle",
            "error": None
        }
        
        # Try loading existing saved model on startup
        self._load_active_model_if_exists()

    def _load_active_model_if_exists(self):
        if self.model_metadata_file.exists():
            try:
                with open(self.model_metadata_file, "r") as f:
                    meta = json.load(f)
                raw_path = meta.get("weights_path", "")
                weights_path = Path(raw_path)
                
                # Resilient fallback across Windows/Linux/Docker
                if not weights_path.exists():
                    weights_path = self.models_dir / weights_path.name
                if not weights_path.exists():
                    weights_path = self.models_dir / "asl_cnn_final.keras"

                if weights_path.exists():
                    import tensorflow as tf
                    self.active_model = tf.keras.models.load_model(str(weights_path))
                    self.active_classes = meta.get("classes", [])
                    print(f"[ModelService] Loaded active model '{weights_path.name}' with {len(self.active_classes)} classes.")
            except Exception as e:
                print(f"[ModelService] Warning: Could not auto-load saved model: {e}")

    def build_report_cnn(self, num_classes: int, learning_rate: float = DEFAULT_LEARNING_RATE, optimizer_type: str = "sgd"):
        """
        Builds the exact CNN Architecture specified in the Academic Project Report:
        1. Conv2D: 16 filters, 2x2 kernel, ReLU
        2. MaxPooling2D: 2x2
        3. Conv2D: 32 filters, 3x3 kernel, ReLU
        4. MaxPooling2D: 3x3
        5. Conv2D: 64 filters, 5x5 kernel, ReLU
        6. MaxPooling2D: 5x5 (or adapted 2x2 if feature map size requires)
        7. Flatten
        8. Dense: 128 neurons, ReLU
        9. Dropout: 0.2
        10. Softmax output for gesture classes
        Loss: Categorical Cross-Entropy, Optimizer: SGD (lr=0.01) baseline
        """
        import tensorflow as tf
        from tensorflow.keras import layers, models, optimizers

        input_shape = (TARGET_IMAGE_SIZE[0], TARGET_IMAGE_SIZE[1], INPUT_CHANNELS)
        model = models.Sequential(name="ASL_Assistive_Report_CNN")

        # Layer 1: Conv2D 16 filters, 2x2 kernel, ReLU + MaxPool 2x2
        # Input 64x64 -> Conv2D (same padding to preserve shape) -> 64x64 -> MaxPool 2x2 -> 32x32
        model.add(layers.Conv2D(16, (2, 2), padding="same", activation="relu", input_shape=input_shape, name="conv2d_1"))
        model.add(layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_1"))

        # Layer 2: Conv2D 32 filters, 3x3 kernel, ReLU + MaxPool 3x3 (pool_size=2x2 or 3x3 with valid/same)
        # 32x32 -> Conv2D (same) -> 32x32 -> MaxPool 2x2 -> 16x16
        model.add(layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv2d_2"))
        model.add(layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_2"))

        # Layer 3: Conv2D 64 filters, 5x5 kernel, ReLU + MaxPool 2x2
        # 16x16 -> Conv2D (same) -> 16x16 -> MaxPool 2x2 -> 8x8
        model.add(layers.Conv2D(64, (5, 5), padding="same", activation="relu", name="conv2d_3"))
        model.add(layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_3"))

        # Classification Dense Head
        model.add(layers.Flatten(name="flatten"))
        model.add(layers.Dense(128, activation="relu", name="dense_128"))
        model.add(layers.Dropout(DROPOUT_RATE, name="dropout_02"))
        model.add(layers.Dense(num_classes, activation="softmax", name="softmax_output"))

        # Optimizer selection: SGD lr=0.01 baseline, or Adam option
        if optimizer_type.lower() == "adam":
            opt = optimizers.Adam(learning_rate=0.001)
        else:
            opt = optimizers.SGD(learning_rate=learning_rate, momentum=0.9, nesterov=True)

        model.compile(
            optimizer=opt,
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )

        return model

    def get_status(self) -> Dict[str, Any]:
        has_model = self.active_model is not None
        meta = {}
        if self.model_metadata_file.exists():
            try:
                with open(self.model_metadata_file, "r") as f:
                    meta = json.load(f)
            except Exception:
                pass
                
        return {
            "has_trained_model": has_model,
            "classes": self.active_classes,
            "num_classes": len(self.active_classes),
            "is_training": self.is_training,
            "metadata": meta,
            "training_progress": self.training_progress
        }

    def start_training(self, epochs: int = DEFAULT_EPOCHS, batch_size: int = DEFAULT_BATCH_SIZE, 
                       learning_rate: float = DEFAULT_LEARNING_RATE, optimizer_type: str = "adam") -> Dict[str, Any]:
        """
        Launches background CNN training using the prepared dataset splits.
        """
        if self.is_training:
            return {"status": "error", "message": "Training is already in progress"}
            
        train_dir = DATA_SPLITS_DIR / "train"
        val_dir = DATA_SPLITS_DIR / "val"
        test_dir = DATA_SPLITS_DIR / "test"
        
        if not train_dir.exists() or not any(train_dir.iterdir()):
            return {"status": "error", "message": "Dataset splits not ready. Please download and prepare dataset first."}

        self.is_training = True
        self.training_progress = {
            "is_training": True,
            "current_epoch": 0,
            "total_epochs": epochs,
            "train_loss": 0.0,
            "train_accuracy": 0.0,
            "val_loss": 0.0,
            "val_accuracy": 0.0,
            "epochs_history": [],
            "status": "training",
            "error": None
        }

        self.training_thread = threading.Thread(
            target=self._run_training_worker,
            args=(epochs, batch_size, learning_rate, optimizer_type),
            daemon=True
        )
        self.training_thread.start()

        return {"status": "started", "message": f"Training initiated for {epochs} epochs."}

    def _run_training_worker(self, epochs: int, batch_size: int, learning_rate: float, optimizer_type: str):
        import tensorflow as tf
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
        from sklearn.metrics import classification_report, confusion_matrix

        try:
            train_dir = str(DATA_SPLITS_DIR / "train")
            val_dir = str(DATA_SPLITS_DIR / "val")
            test_dir = str(DATA_SPLITS_DIR / "test")

            # Data Augmentation & Normalization (following academic methodology)
            train_datagen = ImageDataGenerator(
                rescale=1.0 / 255.0,
                rotation_range=12,
                width_shift_range=0.1,
                height_shift_range=0.1,
                zoom_range=0.1,
                shear_range=0.05,
                fill_mode="nearest"
            )

            val_test_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

            train_gen = train_datagen.flow_from_directory(
                train_dir,
                target_size=TARGET_IMAGE_SIZE,
                batch_size=batch_size,
                class_mode="categorical",
                shuffle=True
            )

            val_gen = val_test_datagen.flow_from_directory(
                val_dir,
                target_size=TARGET_IMAGE_SIZE,
                batch_size=batch_size,
                class_mode="categorical",
                shuffle=False
            )

            class_indices = train_gen.class_indices
            classes = sorted(list(class_indices.keys()), key=lambda k: class_indices[k])
            num_classes = len(classes)

            # Build CNN model
            model = self.build_report_cnn(num_classes, learning_rate=learning_rate, optimizer_type=optimizer_type)

            # Custom Callback for Real-Time Progress Tracking
            parent = self

            class ProgressCallback(tf.keras.callbacks.Callback):
                def on_epoch_end(self, epoch, logs=None):
                    logs = logs or {}
                    parent.training_progress["current_epoch"] = epoch + 1
                    parent.training_progress["train_loss"] = float(logs.get("loss", 0.0))
                    parent.training_progress["train_accuracy"] = float(logs.get("accuracy", 0.0))
                    parent.training_progress["val_loss"] = float(logs.get("val_loss", 0.0))
                    parent.training_progress["val_accuracy"] = float(logs.get("val_accuracy", 0.0))
                    parent.training_progress["epochs_history"].append({
                        "epoch": epoch + 1,
                        "loss": round(float(logs.get("loss", 0.0)), 4),
                        "accuracy": round(float(logs.get("accuracy", 0.0)), 4),
                        "val_loss": round(float(logs.get("val_loss", 0.0)), 4),
                        "val_accuracy": round(float(logs.get("val_accuracy", 0.0)), 4),
                    })
                    print(f"[Training] Epoch {epoch+1}/{epochs} - Acc: {logs.get('accuracy', 0):.4f} - Val Acc: {logs.get('val_accuracy', 0):.4f}")

            # Checkpoint
            checkpoint_path = str(self.models_dir / "best_asl_cnn.keras")
            checkpoint_cb = tf.keras.callbacks.ModelCheckpoint(
                checkpoint_path,
                monitor="val_accuracy",
                save_best_only=True,
                verbose=0
            )

            # Train
            model.fit(
                train_gen,
                validation_data=val_gen,
                epochs=epochs,
                callbacks=[ProgressCallback(), checkpoint_cb]
            )

            # Load best model for evaluation and deployment
            best_model = tf.keras.models.load_model(checkpoint_path)

            # Evaluate on Test Set
            test_gen = val_test_datagen.flow_from_directory(
                test_dir,
                target_size=TARGET_IMAGE_SIZE,
                batch_size=batch_size,
                class_mode="categorical",
                shuffle=False
            )

            test_eval = best_model.evaluate(test_gen, verbose=0)
            test_loss, test_acc = float(test_eval[0]), float(test_eval[1])

            # Predictions for Confusion Matrix and Classification Report
            test_gen.reset()
            y_pred_probs = best_model.predict(test_gen, verbose=0)
            y_pred = np.argmax(y_pred_probs, axis=1)
            y_true = test_gen.classes

            report_dict = classification_report(y_true, y_pred, target_names=classes, output_dict=True, zero_division=0)
            cm = confusion_matrix(y_true, y_pred).tolist()

            # Save Model Artifacts
            final_model_path = str(self.models_dir / "asl_cnn_final.keras")
            best_model.save(final_model_path)

            metadata = {
                "model_name": "ASL Assistive Report CNN",
                "weights_path": final_model_path,
                "classes": classes,
                "num_classes": num_classes,
                "input_shape": f"{TARGET_IMAGE_SIZE[0]}x{TARGET_IMAGE_SIZE[1]}x{INPUT_CHANNELS}",
                "final_train_accuracy": parent.training_progress["train_accuracy"],
                "final_val_accuracy": parent.training_progress["val_accuracy"],
                "test_accuracy": round(test_acc, 4),
                "test_loss": round(test_loss, 4),
                "classification_report": report_dict,
                "confusion_matrix": cm,
                "epochs_history": parent.training_progress["epochs_history"],
                "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            with open(self.model_metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)

            # Update active in-memory model
            self.active_model = best_model
            self.active_classes = classes

            parent.training_progress["status"] = "completed"
            parent.training_progress["is_training"] = False
            print(f"[ModelService] Training successfully completed! Test Accuracy: {test_acc:.4f}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.training_progress["status"] = "failed"
            self.training_progress["error"] = str(e)
            self.training_progress["is_training"] = False
        finally:
            self.is_training = False

    def predict_image_array(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Receives preprocessed (64, 64, 3) float image [0, 1].
        Returns predicted character, confidence %, and Top-3 probabilities.
        """
        if self.active_model is None or not self.active_classes:
            return {
                "character": "?",
                "confidence": 0.0,
                "top3": [],
                "error": "No model loaded"
            }

        if len(img_array.shape) == 3:
            img_batch = np.expand_dims(img_array, axis=0)
        else:
            img_batch = img_array

        probs = self.active_model.predict(img_batch, verbose=0)[0]
        top3_indices = np.argsort(probs)[::-1][:3]

        top3 = [
            {"character": self.active_classes[i], "confidence": round(float(probs[i]) * 100, 2)}
            for i in top3_indices
        ]

        best_idx = top3_indices[0]
        best_char = self.active_classes[best_idx]
        best_conf = round(float(probs[best_idx]) * 100, 2)

        return {
            "character": best_char,
            "confidence": best_conf,
            "top3": top3
        }

model_service = ModelService()
