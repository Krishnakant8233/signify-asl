import cv2
import numpy as np
import base64
from typing import Dict, Any, Optional, Tuple, List
from collections import deque
from ..core.config import TARGET_IMAGE_SIZE
from .model_service import model_service

class ComputerVisionService:
    def __init__(self):
        self.detection_mode = "mediapipe" # "mediapipe" or "histogram"
        self.mp_hands = None
        self.hands_detector = None
        self._init_mediapipe()

        # Stabilization and anti-flicker buffers
        self.history_len = 6
        self.prediction_buffer = deque(maxlen=self.history_len)
        self.confidence_threshold = 60.0 # Min confidence to accept gesture
        self.stability_threshold = 4     # Number of consistent frames required
        self.last_stable_char = None
        self.last_emitted_char = None

    def _init_mediapipe(self):
        try:
            import mediapipe as mp
            if hasattr(mp, "solutions") and hasattr(mp.solutions, "hands"):
                self.mp_hands = mp.solutions.hands
            else:
                from mediapipe.python.solutions import hands
                self.mp_hands = hands

            self.hands_detector = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            print("[CVService] MediaPipe Hands initialized successfully.")
        except Exception as e:
            print(f"[CVService] Warning: Could not initialize MediaPipe: {e}. Falling back to histogram mode.")
            self.detection_mode = "histogram"

    def set_detection_mode(self, mode: str):
        if mode in ["mediapipe", "histogram"]:
            self.detection_mode = mode
            print(f"[CVService] Detection mode set to: {mode}")

    def reset_stabilizer(self):
        self.prediction_buffer.clear()
        self.last_stable_char = None
        self.last_emitted_char = None

    def process_frame_base64(self, base64_image_str: str) -> Dict[str, Any]:
        """
        Receives raw base64 frame from frontend webcam.
        Detects hand via MediaPipe or Histogram method.
        Crops, preprocesses, and runs CNN inference.
        Applies temporal stabilization to prevent repeated frame duplicate characters.
        """
        # Decode base64 to cv2 BGR image
        try:
            if "," in base64_image_str:
                base64_image_str = base64_image_str.split(",")[1]
            img_bytes = base64.b64decode(base64_image_str)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("Could not decode image frame")
        except Exception as e:
            return {"error": f"Invalid frame data: {e}", "hand_detected": False}

        h, w, c = frame.shape
        hand_detected = False
        hand_crop = None
        bbox = None

        if self.detection_mode == "mediapipe" and self.hands_detector:
            hand_crop, bbox = self._detect_hand_mediapipe(frame)
            if hand_crop is not None:
                hand_detected = True
        
        # Fallback or explicit histogram mode
        if not hand_detected:
            if self.detection_mode == "histogram" or self.hands_detector is None:
                hand_crop, bbox = self._detect_hand_histogram(frame)
                if hand_crop is not None:
                    hand_detected = True

        if not hand_detected or hand_crop is None:
            self.prediction_buffer.append("NONE")
            return {
                "hand_detected": False,
                "detection_mode": self.detection_mode,
                "character": "",
                "confidence": 0.0,
                "top3": [],
                "is_stable": False,
                "new_character_emitted": None,
                "preview_crop_b64": None
            }

        # Preprocess hand crop for CNN
        # Resize to (64, 64) and convert BGR to RGB
        crop_rgb = cv2.cvtColor(hand_crop, cv2.COLOR_BGR2RGB)
        resized_crop = cv2.resize(crop_rgb, TARGET_IMAGE_SIZE, interpolation=cv2.INTER_AREA)
        normalized_crop = resized_crop.astype(np.float32) / 255.0

        # Model Inference
        pred_result = model_service.predict_image_array(normalized_crop)
        pred_char = pred_result.get("character", "?")
        confidence = pred_result.get("confidence", 0.0)
        top3 = pred_result.get("top3", [])

        # Temporal Stabilization
        self.prediction_buffer.append(pred_char)
        
        # Check stability
        is_stable = False
        new_emitted_char = None

        if confidence >= self.confidence_threshold:
            # Count occurrences of pred_char in recent buffer
            count = sum(1 for c in self.prediction_buffer if c == pred_char)
            if count >= self.stability_threshold:
                is_stable = True
                self.last_stable_char = pred_char
                
                # Check if this is a new stable character that hasn't been emitted yet
                if pred_char != self.last_emitted_char and pred_char not in ["?", "NONE"]:
                    new_emitted_char = pred_char
                    self.last_emitted_char = pred_char

        # Generate base64 thumbnail of the cropped hand
        _, buf = cv2.imencode('.jpg', hand_crop)
        preview_crop_b64 = base64.b64encode(buf).decode('utf-8')

        return {
            "hand_detected": True,
            "detection_mode": self.detection_mode,
            "character": pred_char,
            "confidence": confidence,
            "top3": top3,
            "is_stable": is_stable,
            "stable_character": self.last_stable_char,
            "new_character_emitted": new_emitted_char, # Triggers automatic browser TTS
            "preview_crop_b64": f"data:image/jpeg;base64,{preview_crop_b64}",
            "bbox": bbox
        }

    def _detect_hand_mediapipe(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Dict[str, int]]]:
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands_detector.process(rgb_frame)

        if not results.multi_hand_landmarks:
            return None, None

        hand_landmarks = results.multi_hand_landmarks[0]
        x_coords = [int(lm.x * w) for lm in hand_landmarks.landmark]
        y_coords = [int(lm.y * h) for lm in hand_landmarks.landmark]

        min_x, max_x = max(0, min(x_coords)), min(w, max(x_coords))
        min_y, max_y = max(0, min(y_coords)), min(h, max(y_coords))

        # Add 25% padding around hand bounding box
        box_w = max_x - min_x
        box_h = max_y - min_y
        padding = int(max(box_w, box_h) * 0.25)

        x1 = max(0, min_x - padding)
        y1 = max(0, min_y - padding)
        x2 = min(w, max_x + padding)
        y2 = min(h, max_y + padding)

        if x2 - x1 < 20 or y2 - y1 < 20:
            return None, None

        crop = frame[y1:y2, x1:x2]
        return crop, {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

    def _detect_hand_histogram(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Dict[str, int]]]:
        """
        Histogram / HSV color-space skin segmentation as detailed in the project report.
        Uses skin color range in HSV + Otsu thresholding + morphological filtering + largest contour.
        """
        h, w, _ = frame.shape
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Standard skin tone range in HSV
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        
        mask = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # Morphological operations to remove noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.erode(mask, kernel, iterations=1)
        mask = cv2.dilate(mask, kernel, iterations=2)
        mask = cv2.GaussianBlur(mask, (3, 3), 0)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None, None

        # Filter by minimum area
        valid_contours = [c for c in contours if cv2.contourArea(c) > 3000]
        if not valid_contours:
            return None, None

        largest_c = max(valid_contours, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest_c)

        # Padding
        pad = int(max(bw, bh) * 0.2)
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(w, x + bw + pad)
        y2 = min(h, y + bh + pad)

        crop = frame[y1:y2, x1:x2]
        return crop, {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

cv_service = ComputerVisionService()
