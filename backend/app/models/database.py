import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from ..core.config import DATABASE_URL

Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class RecognitionSession(Base):
    __tablename__ = "recognition_sessions"
    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    total_predictions = Column(Integer, default=0)
    detection_mode = Column(String(50), default="mediapipe") # mediapipe or histogram
    notes = Column(Text, nullable=True)

class PredictionRecord(Base):
    __tablename__ = "prediction_records"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    predicted_char = Column(String(10), nullable=False)
    confidence = Column(Float, nullable=False)
    top3_json = Column(JSON, nullable=True)
    detection_method = Column(String(50), default="mediapipe")
    spoken = Column(Boolean, default=False)

class SentenceRecord(Base):
    __tablename__ = "sentence_records"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    text = Column(Text, nullable=False)
    word_count = Column(Integer, default=1)
    character_count = Column(Integer, default=0)
    source = Column(String(50), default="live_recognition")

class TrainingRun(Base):
    __tablename__ = "training_runs"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending") # pending, running, completed, failed
    model_name = Column(String(100), default="cnn_asl_baseline")
    dataset_name = Column(String(100), default="asl_alphabet_hf")
    epochs = Column(Integer, default=15)
    batch_size = Column(Integer, default=32)
    learning_rate = Column(Float, default=0.01)
    optimizer = Column(String(50), default="sgd")
    final_train_acc = Column(Float, nullable=True)
    final_val_acc = Column(Float, nullable=True)
    final_test_acc = Column(Float, nullable=True)
    final_loss = Column(Float, nullable=True)
    history_json = Column(JSON, nullable=True)
    metrics_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    version_tag = Column(String(50), unique=True, index=True)
    weights_path = Column(String(255), nullable=False)
    classes_json = Column(JSON, nullable=False)
    input_shape = Column(String(50), default="64x64x3")
    is_active = Column(Boolean, default=True)
    accuracy = Column(Float, nullable=True)
    description = Column(Text, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
