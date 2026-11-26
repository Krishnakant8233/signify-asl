import unittest
import sys
import os
import numpy as np
import base64
import cv2
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root and backend to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "backend"))

from backend.app.main import app
from backend.app.services.dataset_service import dataset_service
from backend.app.services.model_service import model_service
from backend.app.services.cv_service import cv_service
from backend.app.models.database import SessionLocal, SentenceRecord, PredictionRecord, init_db

class TestSignGestureApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Test API health check endpoint"""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("classes_count", data)

    def test_02_dataset_status_and_stats(self):
        """Test dataset status and statistics endpoints"""
        res = self.client.get("/api/dataset/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_raw_data"])
        self.assertTrue(data["has_splits"])
        self.assertTrue(data["dataset_ready"])

        stats_res = self.client.get("/api/dataset/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertEqual(stats["total_classes"], 26)
        self.assertEqual(len(stats["classes"]), 26)
        self.assertGreater(stats["total_valid_images"], 5000)

    def test_03_cnn_architecture_conformance(self):
        """Verify CNN matches academic report specifications"""
        model = model_service.build_report_cnn(num_classes=26)
        layer_names = [layer.name for layer in model.layers]
        
        # Verify 3 Conv/Pool stages + Dense + Dropout + Output
        self.assertTrue(any("conv2d_1" in n for n in layer_names))
        self.assertTrue(any("conv2d_2" in n for n in layer_names))
        self.assertTrue(any("conv2d_3" in n for n in layer_names))
        self.assertTrue(any("dense_128" in n for n in layer_names))
        self.assertTrue(any("dropout" in n for n in layer_names))
        self.assertTrue(any("softmax_output" in n for n in layer_names))

        # Test dummy prediction shape
        dummy_input = np.random.rand(1, 64, 64, 3).astype(np.float32)
        out = model.predict(dummy_input, verbose=0)
        self.assertEqual(out.shape, (1, 26))

    def test_04_cv_stabilization_and_frame_processing(self):
        """Test webcam frame processing and temporal anti-flicker stabilization"""
        cv_service.reset_stabilizer()
        
        # Create a synthetic test image (black frame with skin-tone colored ellipse simulating hand)
        test_frame = np.zeros((240, 320, 3), dtype=np.uint8)
        cv2.ellipse(test_frame, (160, 120), (50, 70), 0, 0, 360, (140, 170, 220), -1) # BGR skin tone

        _, buf = cv2.imencode(".jpg", test_frame)
        b64_str = base64.b64encode(buf).decode("utf-8")

        # Test histogram detection mode
        cv_service.set_detection_mode("histogram")
        res = cv_service.process_frame_base64(b64_str)
        self.assertIn("hand_detected", res)
        self.assertIn("top3", res)

        # Test mode reset
        cv_service.set_detection_mode("mediapipe")
        self.assertEqual(cv_service.detection_mode, "mediapipe")

    def test_05_sentence_builder_crud(self):
        """Test sentence creation, retrieval, and deletion in SQLite"""
        test_phrase = "HELLO WORLD TEST"
        
        # Save sentence
        save_res = self.client.post("/api/sentence/save", json={"text": test_phrase})
        self.assertEqual(save_res.status_code, 200)
        sentence_id = save_res.json()["id"]

        # Retrieve sentence history
        hist_res = self.client.get("/api/sentence/history")
        self.assertEqual(hist_res.status_code, 200)
        items = hist_res.json()
        self.assertTrue(any(item["id"] == sentence_id for item in items))

        # Delete sentence
        del_res = self.client.delete(f"/api/sentence/{sentence_id}")
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.json()["status"], "ok")

    def test_06_app_settings(self):
        """Test fetching and updating assistive communication settings"""
        res = self.client.get("/api/settings")
        self.assertEqual(res.status_code, 200)
        settings = res.json()
        self.assertIn("confidence_threshold", settings)
        self.assertIn("auto_speech_enabled", settings)

        # Update settings
        up_res = self.client.post("/api/settings", json={
            "confidence_threshold": 65.0,
            "auto_speech_enabled": True
        })
        self.assertEqual(up_res.status_code, 200)
        self.assertEqual(up_res.json()["confidence_threshold"], 65.0)

if __name__ == "__main__":
    unittest.main()
