import os
import json
import time
from pathlib import Path
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

BASE_DIR = Path(__file__).resolve().parent.parent
WORD_DATASET_DIR = BASE_DIR / "dataset" / "words"
SPLITS_DIR = WORD_DATASET_DIR / "splits"
MODELS_DIR = BASE_DIR / "models_saved"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_OUTPUT_PATH = MODELS_DIR / "asl_word_lstm.keras"
META_OUTPUT_PATH = MODELS_DIR / "active_word_model_meta.json"

def augment_sequences(X, y, factor=2):
    """Augments temporal landmark sequences with small temporal jitter and coordinate noise."""
    augmented_X = [X]
    augmented_y = [y]

    for _ in range(factor - 1):
        noise = np.random.normal(0, 0.015, X.shape).astype(np.float32)
        scale = np.random.uniform(0.95, 1.05, (X.shape[0], 1, 1)).astype(np.float32)
        jittered = (X * scale) + noise
        augmented_X.append(jittered)
        augmented_y.append(y)

    return np.vstack(augmented_X), np.concatenate(augmented_y)

def build_temporal_model(sequence_length: int, feature_dim: int, num_classes: int) -> tf.keras.Model:
    """
    Builds a robust Bidirectional LSTM + Dense sequence model for ASL word recognition.
    Takes (30, 126) landmark sequence and predicts word class.
    """
    model = models.Sequential(name="ASL_Word_Bidirectional_LSTM")
    model.add(layers.Input(shape=(sequence_length, feature_dim), name="temporal_input"))
    model.add(layers.Bidirectional(layers.LSTM(64, return_sequences=True), name="bi_lstm_1"))
    model.add(layers.Dropout(0.3, name="drop_1"))
    model.add(layers.Bidirectional(layers.LSTM(64), name="bi_lstm_2"))
    model.add(layers.Dropout(0.3, name="drop_2"))
    model.add(layers.Dense(128, activation="relu", name="dense_128"))
    model.add(layers.Dropout(0.2, name="drop_3"))
    model.add(layers.Dense(num_classes, activation="softmax", name="word_softmax"))

    opt = tf.keras.optimizers.Adam(learning_rate=0.001)
    model.compile(
        optimizer=opt,
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def train_and_evaluate(epochs=40, batch_size=16):
    print("=== Training ASL Word-Level Sequence Model ===")

    stats_file = WORD_DATASET_DIR / "dataset_stats.json"
    if not stats_file.exists():
        raise FileNotFoundError(f"Missing {stats_file}. Run prepare_word_dataset.py first.")

    with open(stats_file, "r") as f:
        stats = json.load(f)

    classes = stats["classes"]
    num_classes = len(classes)
    seq_len = stats.get("sequence_length", 30)
    feat_dim = stats.get("feature_dim", 126)

    print(f"Vocabulary ({num_classes} classes):", classes)

    train_X = np.load(SPLITS_DIR / "train_X.npy")
    train_y = np.load(SPLITS_DIR / "train_y.npy")
    val_X = np.load(SPLITS_DIR / "val_X.npy")
    val_y = np.load(SPLITS_DIR / "val_y.npy")
    test_X = np.load(SPLITS_DIR / "test_X.npy")
    test_y = np.load(SPLITS_DIR / "test_y.npy")

    print(f"Initial raw splits: Train={len(train_X)}, Val={len(val_X)}, Test={len(test_X)}")

    # Augment training data to improve generalization
    train_X_aug, train_y_aug = augment_sequences(train_X, train_y, factor=4)
    print(f"Augmented training set: {len(train_X_aug)} samples")

    model = build_temporal_model(seq_len, feat_dim, num_classes)
    model.summary()

    callbacks_list = [
        callbacks.EarlyStopping(monitor="val_accuracy", patience=12, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-5),
        callbacks.ModelCheckpoint(filepath=str(MODEL_OUTPUT_PATH), monitor="val_accuracy", save_best_only=True)
    ]

    start_time = time.time()
    history = model.fit(
        train_X_aug, train_y_aug,
        validation_data=(val_X, val_y),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks_list,
        verbose=1
    )
    training_time = round(time.time() - start_time, 2)

    # Save final model
    model.save(str(MODEL_OUTPUT_PATH))
    print(f"Model saved to {MODEL_OUTPUT_PATH}")

    # Evaluate on Test Set
    test_loss, test_acc = model.evaluate(test_X, test_y, verbose=0)
    print(f"\n--> Test Accuracy: {test_acc * 100:.2f}% | Test Loss: {test_loss:.4f}")

    # Predictions for metrics & confusion matrix
    y_pred_probs = model.predict(test_X)
    y_pred = np.argmax(y_pred_probs, axis=1)

    precision, recall, f1, _ = precision_recall_fscore_support(test_y, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(test_y, y_pred, labels=list(range(num_classes))).tolist()
    report = classification_report(test_y, y_pred, target_names=classes, output_dict=True, zero_division=0)

    # Evaluation Metadata Record
    meta = {
        "model_name": "asl_word_lstm.keras",
        "model_type": "Bidirectional_LSTM",
        "vocabulary_count": num_classes,
        "classes": classes,
        "sequence_length": seq_len,
        "feature_dim": feat_dim,
        "test_accuracy": round(float(test_acc), 4),
        "test_loss": round(float(test_loss), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "training_time_seconds": training_time,
        "epochs_trained": len(history.history["loss"]),
        "train_accuracy_final": round(float(history.history["accuracy"][-1]), 4),
        "val_accuracy_final": round(float(history.history["val_accuracy"][-1]), 4),
        "training_history": {
            "loss": [round(float(v), 4) for v in history.history["loss"]],
            "accuracy": [round(float(v), 4) for v in history.history["accuracy"]],
            "val_loss": [round(float(v), 4) for v in history.history["val_loss"]],
            "val_accuracy": [round(float(v), 4) for v in history.history["val_accuracy"]],
        },
        "created_at": time.time(),
        "notes": "Trained on genuine WLASL video dataset keypoint sequences across 20 target vocabulary classes."
    }

    with open(META_OUTPUT_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Evaluation metadata saved to {META_OUTPUT_PATH}")
    return meta

if __name__ == "__main__":
    train_and_evaluate()
