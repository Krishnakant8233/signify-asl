import json
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models.database import get_db, RecognitionSession, PredictionRecord, SentenceRecord, TrainingRun, ModelVersion
from ..services.dataset_service import dataset_service
from ..services.model_service import model_service
from ..services.cv_service import cv_service
from ..services.word_model_service import word_model_service

router = APIRouter()

import difflib

# Common English vocabulary dictionary for autocorrect (like Signify's autocorrect)
DICTIONARY = [
    "HELLO", "HELP", "HELMET", "HEAR", "HEART", "HAPPY", "HAVE", "HOW", "HERE",
    "WATER", "WANT", "WAIT", "WALK", "WASH", "WHAT", "WHERE", "WHEN", "WHY", "WHO",
    "PLEASE", "PEOPLE", "PLAY", "PAIN", "PEACE", "PHONE", "PERSON",
    "THANK", "THANKS", "THAT", "THERE", "THIS", "TIME", "TODAY", "TOMORROW",
    "GOOD", "GREAT", "GO", "GIVE", "GET", "GIRL", "GAME",
    "YES", "YOU", "YOUR", "YEAR", "YESTERDAY",
    "NAME", "NICE", "NEED", "NO", "NOW", "NEW", "NIGHT",
    "SIGN", "SIGNIFY", "LANGUAGE", "LOVE", "LEARN", "LIKE", "LOOK",
    "FOOD", "FRIEND", "FAMILY", "FINE", "FEEL", "FAST",
    "COME", "CAN", "CALL", "CARE", "COULD", "CLEAN",
    "DOCTOR", "DAY", "DRINK", "DEAR", "DO",
    "EAT", "EVERY", "EASY", "EARLY",
    "MAKE", "MORE", "MUCH", "MANY", "MEET", "MORNING",
    "SORRY", "STOP", "SEE", "SMILE", "SIT", "STAND",
    "TELL", "TALK", "TAKE", "THINK",
    "UNDERSTAND", "USE", "UP",
    "VERY", "VOICE", "VISIT",
    "WELL", "WORK", "WORLD", "WRITE", "WELCOME"
]

@router.get("/autocorrect")
def autocorrect_word(word: str = Query(..., description="Word to autocorrect")):
    w = word.strip().upper()
    if not w:
        return {"originalWord": "", "correctedWord": "", "suggestions": []}
    if w in DICTIONARY:
        return {"originalWord": w, "correctedWord": w, "suggestions": [w]}
    matches = difflib.get_close_matches(w, DICTIONARY, n=3, cutoff=0.55)
    corrected = matches[0] if matches else w
    return {
        "originalWord": w,
        "correctedWord": corrected,
        "suggestions": matches
    }
class PredictWordRequest(BaseModel):
    sequence: List[List[float]] = Field(..., description="Temporal sequence of 30 frames x 126 landmark coordinates")

class RecognizeFrameRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG or PNG image frame from webcam")

class DetectionModeRequest(BaseModel):
    mode: str = Field(..., description="mediapipe or histogram")

class SaveSentenceRequest(BaseModel):
    text: str = Field(..., description="Constructed sentence text")
    source: Optional[str] = "live_recognition"

class TrainModelRequest(BaseModel):
    epochs: Optional[int] = 15
    batch_size: Optional[int] = 32
    learning_rate: Optional[float] = 0.01
    optimizer: Optional[str] = "adam"

class SettingsUpdateRequest(BaseModel):
    confidence_threshold: Optional[float] = 60.0
    stability_threshold: Optional[int] = 4
    detection_mode: Optional[str] = "mediapipe"
    auto_speech_enabled: Optional[bool] = True

# App settings state
CURRENT_SETTINGS = {
    "confidence_threshold": 60.0,
    "stability_threshold": 4,
    "detection_mode": "mediapipe",
    "auto_speech_enabled": True,
    "speech_rate": 1.0,
    "speech_pitch": 1.0,
    "speech_volume": 1.0,
    "selected_voice": None
}

# --- Health Check ---
@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "model_loaded": model_service.active_model is not None,
        "classes_count": len(model_service.active_classes),
        "mediapipe_available": cv_service.hands_detector is not None,
        "current_detection_mode": cv_service.detection_mode
    }

# --- Dataset Endpoints ---
@router.get("/dataset/status")
def get_dataset_status():
    return dataset_service.get_status()

@router.post("/dataset/download")
def download_dataset(source: Optional[str] = "auto"):
    try:
        result = dataset_service.download_and_prepare_dataset(source_choice=source)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dataset/stats")
def get_dataset_stats():
    return dataset_service.get_stats()

# --- Model & Training Endpoints ---
@router.get("/model/status")
def get_model_status():
    return model_service.get_status()

@router.post("/model/train")
def train_model(req: TrainModelRequest, db: Session = Depends(get_db)):
    if model_service.is_training:
        raise HTTPException(status_code=400, detail="Training is already active")
    
    # Record in database
    run_record = TrainingRun(
        model_name="ASL_Assistive_Report_CNN",
        epochs=req.epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
        optimizer=req.optimizer,
        status="running"
    )
    db.add(run_record)
    db.commit()
    db.refresh(run_record)

    result = model_service.start_training(
        epochs=req.epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
        optimizer_type=req.optimizer
    )
    return {**result, "run_id": run_record.id}

@router.get("/model/training-progress")
def get_training_progress():
    return model_service.training_progress

@router.get("/model/evaluation")
def get_model_evaluation():
    if model_service.model_metadata_file.exists():
        try:
            with open(model_service.model_metadata_file, "r") as f:
                meta = json.load(f)
            return meta
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not read evaluation metadata: {e}")
    raise HTTPException(status_code=404, detail="No evaluation metadata found. Train a model first.")

# --- Computer Vision & Recognition Endpoints ---
@router.post("/recognize/frame")
def recognize_frame(req: RecognizeFrameRequest, db: Session = Depends(get_db)):
    res = cv_service.process_frame_base64(req.image)
    
    # If a stable character was recognized and emitted, log to DB
    if res.get("new_character_emitted"):
        char = res["new_character_emitted"]
        rec = PredictionRecord(
            predicted_char=char,
            confidence=res.get("confidence", 0.0),
            top3_json=res.get("top3", []),
            detection_method=cv_service.detection_mode,
            spoken=CURRENT_SETTINGS.get("auto_speech_enabled", True)
        )
        try:
            db.add(rec)
            db.commit()
        except Exception:
            db.rollback()
            
    return res

@router.post("/cv/mode")
def set_detection_mode(req: DetectionModeRequest):
    cv_service.set_detection_mode(req.mode)
    CURRENT_SETTINGS["detection_mode"] = req.mode
    return {"status": "ok", "mode": cv_service.detection_mode}

@router.post("/cv/reset")
def reset_cv_stabilizer():
    cv_service.reset_stabilizer()
    return {"status": "ok", "message": "Stabilizer buffer cleared"}

# --- Sentence Builder Endpoints ---
@router.post("/sentence/save")
def save_sentence(req: SaveSentenceRequest, db: Session = Depends(get_db)):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Sentence cannot be empty")
    
    words = text.split()
    record = SentenceRecord(
        text=text,
        word_count=len(words),
        character_count=len(text),
        source=req.source
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"status": "ok", "id": record.id, "text": record.text}

@router.get("/sentence/history")
def get_sentence_history(limit: int = 50, db: Session = Depends(get_db)):
    records = db.query(SentenceRecord).order_by(SentenceRecord.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "text": r.text,
            "word_count": r.word_count,
            "character_count": r.character_count,
            "source": r.source
        }
        for r in records
    ]

@router.delete("/sentence/{sentence_id}")
def delete_sentence(sentence_id: int, db: Session = Depends(get_db)):
    record = db.query(SentenceRecord).filter(SentenceRecord.id == sentence_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Sentence not found")
    db.delete(record)
    db.commit()
    return {"status": "ok", "deleted_id": sentence_id}

# --- Recognition History Endpoints ---
@router.get("/recognition/history")
def get_recognition_history(limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(PredictionRecord).order_by(PredictionRecord.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "predicted_char": r.predicted_char,
            "confidence": r.confidence,
            "top3": r.top3_json,
            "detection_method": r.detection_method,
            "spoken": r.spoken
        }
        for r in records
    ]

# --- Settings Endpoints ---
@router.get("/settings")
def get_settings():
    return CURRENT_SETTINGS

@router.post("/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.confidence_threshold is not None:
        cv_service.confidence_threshold = req.confidence_threshold
        CURRENT_SETTINGS["confidence_threshold"] = req.confidence_threshold
    if req.stability_threshold is not None:
        cv_service.stability_threshold = req.stability_threshold
        CURRENT_SETTINGS["stability_threshold"] = req.stability_threshold
    if req.detection_mode is not None:
        cv_service.set_detection_mode(req.detection_mode)
        CURRENT_SETTINGS["detection_mode"] = req.detection_mode
    if req.auto_speech_enabled is not None:
        CURRENT_SETTINGS["auto_speech_enabled"] = req.auto_speech_enabled
    return CURRENT_SETTINGS

# --- ASL Complete Word-Level Recognition Endpoints ---
@router.get("/words/vocabulary")
def get_words_vocabulary():
    """Returns catalog of supported ASL word signs, movement descriptions, and training status."""
    return word_model_service.get_vocabulary()

@router.get("/words/evaluation")
def get_words_evaluation():
    """Returns actual test metrics, confusion matrix, and training history for the word sequence model."""
    return word_model_service.get_evaluation_metrics()

@router.post("/words/predict")
def predict_word_sequence(req: PredictWordRequest):
    """Predicts ASL word from a temporal landmark sequence."""
    return word_model_service.predict_sequence(req.sequence)
