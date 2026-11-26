export interface HealthStatus {
  status: string;
  timestamp: number;
  model_loaded: boolean;
  classes_count: number;
  mediapipe_available: boolean;
  current_detection_mode: string;
}

export interface PredictionTop3 {
  character: string;
  confidence: number;
}

export interface FrameRecognitionResult {
  hand_detected: boolean;
  detection_mode: string;
  character: string;
  confidence: number;
  top3: PredictionTop3[];
  is_stable: boolean;
  stable_character?: string | null;
  new_character_emitted?: string | null;
  preview_crop_b64?: string | null;
  bbox?: { x1: number; y1: number; x2: number; y2: number } | null;
  error?: string;
}

export interface DatasetStats {
  source?: {
    name: string;
    url: string;
    license: string;
    attribution: string;
  };
  total_classes: number;
  classes: string[];
  total_valid_images: number;
  sample_dimensions: { width: number; height: number; mode: string };
  class_distribution: Record<string, number>;
  split_distribution: { train: number; val: number; test: number };
  license: string;
  attribution: string;
}

export interface DatasetStatus {
  has_raw_data: boolean;
  has_splits: boolean;
  dataset_ready: boolean;
  stats?: DatasetStats | null;
}

export interface TrainingProgress {
  is_training: boolean;
  current_epoch: number;
  total_epochs: number;
  train_loss: number;
  train_accuracy: number;
  val_loss: number;
  val_accuracy: number;
  epochs_history: Array<{
    epoch: number;
    loss: number;
    accuracy: number;
    val_loss: number;
    val_accuracy: number;
  }>;
  status: string;
  error?: string | null;
}

export interface ModelMetadata {
  model_name: string;
  weights_path: string;
  classes: string[];
  num_classes: number;
  input_shape: string;
  final_train_accuracy: number;
  final_val_accuracy: number;
  test_accuracy: number;
  test_loss: number;
  classification_report?: Record<string, any>;
  confusion_matrix?: number[][];
  epochs_history?: Array<{
    epoch: number;
    loss: number;
    accuracy: number;
    val_loss: number;
    val_accuracy: number;
  }>;
  trained_at?: string;
}

export interface ModelStatus {
  has_trained_model: boolean;
  classes: string[];
  num_classes: number;
  is_training: boolean;
  metadata?: ModelMetadata;
  training_progress: TrainingProgress;
}

export interface SavedSentence {
  id: number;
  created_at: string;
  text: string;
  word_count: number;
  character_count: number;
  source: string;
}

export interface PredictionHistoryRecord {
  id: number;
  timestamp: string;
  predicted_char: string;
  confidence: number;
  top3?: PredictionTop3[];
  detection_method: string;
  spoken: boolean;
}

export interface AppSettings {
  confidence_threshold: number;
  stability_threshold: number;
  detection_mode: string;
  auto_speech_enabled: boolean;
  speech_rate: number;
  speech_pitch: number;
  speech_volume: number;
  selected_voice?: string | null;
}
