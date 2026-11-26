import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from ..core.config import MODELS_DIR

WORD_DATASET_DIR = Path(__file__).resolve().parent.parent.parent.parent / "dataset" / "words"
MODEL_PATH = MODELS_DIR / "asl_word_lstm.keras"
META_PATH = MODELS_DIR / "active_word_model_meta.json"

# Reference sign descriptions and gesture definitions for vocabulary explorer
VOCABULARY_GUIDE: Dict[str, Dict[str, str]] = {
    "HELLO": {
        "description": "Dominant hand starts flat at temple/forehead with palm facing out, and moves outward in an open salute gesture.",
        "handshape": "Open B-hand (flat palm, fingers together)",
        "movement": "Outward salute from forehead",
        "two_handed": "No (Dominant hand)"
    },
    "THANK YOU": {
        "description": "Fingertips of dominant flat hand touch chin or lips, then move outward and down toward the listener with an open palm.",
        "handshape": "Flat B-hand",
        "movement": "Forward arc from chin toward listener",
        "two_handed": "No (Dominant hand)"
    },
    "PLEASE": {
        "description": "Dominant flat hand placed against the center of the chest, moving in a clockwise circular motion.",
        "handshape": "Open flat palm",
        "movement": "Circular rubbing motion on chest",
        "two_handed": "No"
    },
    "SORRY": {
        "description": "Dominant hand forms an 'A' or 'S' fist with thumb resting on side, circling over the center of the heart.",
        "handshape": "A-handshape fist",
        "movement": "Circular rubbing motion over heart",
        "two_handed": "No"
    },
    "YES": {
        "description": "Dominant hand forms an 'S' fist and nods up and down at the wrist, mimicking a head nodding yes.",
        "handshape": "Closed fist (S-hand)",
        "movement": "Wrist tilting up and down",
        "two_handed": "No"
    },
    "NO": {
        "description": "Index and middle fingers snap down together to meet the thumb, like a bird's beak snapping shut.",
        "handshape": "Index + Middle + Thumb",
        "movement": "Quick pinch snap together",
        "two_handed": "No"
    },
    "HELP": {
        "description": "Non-dominant flat palm acts as a base; dominant 'A' fist with thumb up rests on base and both hands lift together upward.",
        "handshape": "Dominant fist on flat palm base",
        "movement": "Upward lifting motion",
        "two_handed": "Yes (Bimanual)"
    },
    "WATER": {
        "description": "Dominant hand forms a 'W' handshape (Index, Middle, Ring up) and index finger taps the chin twice.",
        "handshape": "W-handshape",
        "movement": "Double tap on chin",
        "two_handed": "No"
    },
    "FOOD": {
        "description": "Fingertips of dominant hand brought together touching thumb (flattened O) and tapped against the lips twice.",
        "handshape": "Flattened O-hand",
        "movement": "Double tap to mouth",
        "two_handed": "No"
    },
    "LOVE": {
        "description": "Both hands form fists or flat hands and cross over the chest, hugging the heart.",
        "handshape": "Fists or flat palms",
        "movement": "Crossing over chest",
        "two_handed": "Yes (Bimanual)"
    },
    "GOOD": {
        "description": "Dominant flat hand moves from chin downward to rest inside the palm of the non-dominant hand.",
        "handshape": "Flat open hands",
        "movement": "Chin downward to open palm",
        "two_handed": "Yes (Bimanual)"
    },
    "BAD": {
        "description": "Dominant flat hand touches chin, then moves outward and flips downward so palm faces the floor.",
        "handshape": "Flat hand",
        "movement": "Chin outward with downward flip",
        "two_handed": "No"
    },
    "FRIEND": {
        "description": "Both index fingers hooked (X-handshapes) link together once, flip, and link in reverse.",
        "handshape": "Hooked index fingers",
        "movement": "Interlocking hook clasp",
        "two_handed": "Yes (Bimanual)"
    },
    "GOODBYE": {
        "description": "Dominant open hand held upright waving fingers or palm open/close toward the person.",
        "handshape": "Open palm waving",
        "movement": "Waving outward motion",
        "two_handed": "No"
    },
    "MORE": {
        "description": "Both hands form flattened O-shapes with fingertips touching thumb, and tap together at the fingertips twice.",
        "handshape": "Both flattened O-hands",
        "movement": "Tapping fingertips together",
        "two_handed": "Yes (Bimanual)"
    },
    "STOP": {
        "description": "Dominant flat hand comes down with a sharp chopping motion onto the open palm of the non-dominant hand.",
        "handshape": "Flat hands",
        "movement": "Sharp vertical chop onto palm",
        "two_handed": "Yes (Bimanual)"
    },
    "EAT": {
        "description": "Dominant hand forms flattened O with fingertips together, tapping lips once or twice.",
        "handshape": "Flattened O-hand",
        "movement": "Tapping mouth",
        "two_handed": "No"
    },
    "DRINK": {
        "description": "Dominant hand forms a 'C' handshape holding an imaginary cup and tilts back toward the mouth.",
        "handshape": "C-handshape",
        "movement": "Tilting cup to mouth",
        "two_handed": "No"
    },
    "HAPPY": {
        "description": "Both flat hands with palms facing chest brush upward and outward in a circular cheerful motion.",
        "handshape": "Open flat hands",
        "movement": "Upward brushing on chest",
        "two_handed": "Yes (Bimanual)"
    },
    "SAD": {
        "description": "Both open hands with slightly bent fingers start at eye level and draw downward slowly along the face.",
        "handshape": "Loose claw/flat hands",
        "movement": "Downward draw along face",
        "two_handed": "Yes (Bimanual)"
    }
}

class WordModelService:
    def __init__(self):
        self.model = None
        self.classes: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.sequence_length = 30
        self.feature_dim = 126
        self._load_model_if_exists()

    def _load_model_if_exists(self):
        if META_PATH.exists():
            try:
                with open(META_PATH, "r") as f:
                    self.metadata = json.load(f)
                self.classes = self.metadata.get("classes", [])
                self.sequence_length = self.metadata.get("sequence_length", 30)
                self.feature_dim = self.metadata.get("feature_dim", 126)
            except Exception as e:
                print(f"[WordModelService] Warning: Could not read metadata: {e}")

        if MODEL_PATH.exists():
            try:
                import tensorflow as tf
                self.model = tf.keras.models.load_model(str(MODEL_PATH))
                print(f"[WordModelService] Loaded Word Sequence Model with {len(self.classes)} vocabulary classes.")
            except Exception as e:
                print(f"[WordModelService] Warning: Could not load word model weights: {e}")

    def predict_sequence(self, sequence: List[List[float]]) -> Dict[str, Any]:
        """
        Infers the ASL word from a temporal sequence of landmark coordinates.
        Input sequence shape: (T, 126) where T is typically 30 frames.
        """
        if not self.classes:
            return {
                "word": "UNKNOWN",
                "confidence": 0.0,
                "top3": [],
                "is_stable": False,
                "error": "Word model not yet trained or loaded."
            }

        seq_arr = np.array(sequence, dtype=np.float32)

        # Pad or interpolate to expected sequence length (30)
        if len(seq_arr) < self.sequence_length:
            pad_len = self.sequence_length - len(seq_arr)
            padding = np.tile(seq_arr[-1:], (pad_len, 1)) if len(seq_arr) > 0 else np.zeros((pad_len, self.feature_dim), dtype=np.float32)
            seq_arr = np.vstack([seq_arr, padding]) if len(seq_arr) > 0 else padding
        elif len(seq_arr) > self.sequence_length:
            indices = np.linspace(0, len(seq_arr) - 1, self.sequence_length).astype(int)
            seq_arr = seq_arr[indices]

        # Reshape to (1, 30, 126)
        input_tensor = np.expand_dims(seq_arr, axis=0)

        if self.model is not None:
            preds = self.model.predict(input_tensor, verbose=0)[0]
        else:
            # Fallback uniform distribution if model is still training
            preds = np.ones(len(self.classes)) / len(self.classes)

        top_indices = np.argsort(preds)[::-1][:3]
        top3 = [
            {"word": self.classes[idx], "confidence": round(float(preds[idx]) * 100, 1)}
            for idx in top_indices
        ]

        best_idx = top_indices[0]
        best_word = self.classes[best_idx]
        best_conf = round(float(preds[best_idx]) * 100, 1)

        # Dynamic motion trajectory stabilization:
        # Check if confidence meets threshold
        is_stable = best_conf >= 55.0

        return {
            "word": best_word if is_stable else "UNKNOWN",
            "confidence": best_conf,
            "top3": top3,
            "is_stable": is_stable,
            "description": VOCABULARY_GUIDE.get(best_word, {}).get("description", "")
        }

    def get_vocabulary(self) -> List[Dict[str, Any]]:
        """Returns vocabulary catalog with descriptions and training status."""
        result = []
        for word, info in VOCABULARY_GUIDE.items():
            is_supported = word in self.classes
            result.append({
                "word": word,
                "description": info["description"],
                "handshape": info["handshape"],
                "movement": info["movement"],
                "two_handed": info["two_handed"],
                "is_supported": is_supported,
                "model_status": "Trained & Active" if is_supported else "Ready for training"
            })
        return result

    def get_evaluation_metrics(self) -> Dict[str, Any]:
        """Returns empirical evaluation metrics from actual test set evaluation."""
        if not self.metadata:
            return {
                "status": "not_evaluated",
                "message": "Word recognition model evaluation has not been generated yet."
            }
        return self.metadata

word_model_service = WordModelService()
