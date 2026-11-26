import {
  HealthStatus,
  FrameRecognitionResult,
  DatasetStatus,
  DatasetStats,
  ModelStatus,
  ModelMetadata,
  TrainingProgress,
  SavedSentence,
  PredictionHistoryRecord,
  AppSettings
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async (): Promise<HealthStatus> => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  // Dataset
  getDatasetStatus: async (): Promise<DatasetStatus> => {
    const res = await fetch(`${API_BASE}/dataset/status`);
    if (!res.ok) throw new Error('Failed to fetch dataset status');
    return res.json();
  },

  getDatasetStats: async (): Promise<DatasetStats> => {
    const res = await fetch(`${API_BASE}/dataset/stats`);
    if (!res.ok) throw new Error('Failed to fetch dataset stats');
    return res.json();
  },

  downloadDataset: async (source: string = 'auto'): Promise<any> => {
    const res = await fetch(`${API_BASE}/dataset/download?source=${source}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Dataset download failed');
    }
    return res.json();
  },

  // Model & Training
  getModelStatus: async (): Promise<ModelStatus> => {
    const res = await fetch(`${API_BASE}/model/status`);
    if (!res.ok) throw new Error('Failed to fetch model status');
    return res.json();
  },

  trainModel: async (params: {
    epochs: number;
    batch_size: number;
    learning_rate: number;
    optimizer: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/model/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training failed to start');
    }
    return res.json();
  },

  getTrainingProgress: async (): Promise<TrainingProgress> => {
    const res = await fetch(`${API_BASE}/model/training-progress`);
    if (!res.ok) throw new Error('Failed to fetch training progress');
    return res.json();
  },

  getModelEvaluation: async (): Promise<ModelMetadata> => {
    const res = await fetch(`${API_BASE}/model/evaluation`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Evaluation not available');
    }
    return res.json();
  },

  // Live Frame Recognition
  recognizeFrame: async (base64Image: string): Promise<FrameRecognitionResult> => {
    const res = await fetch(`${API_BASE}/recognize/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!res.ok) throw new Error('Recognition failed');
    return res.json();
  },

  setDetectionMode: async (mode: 'mediapipe' | 'histogram'): Promise<any> => {
    const res = await fetch(`${API_BASE}/cv/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return res.json();
  },

  resetCvStabilizer: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/cv/reset`, { method: 'POST' });
    return res.json();
  },

  // Sentences
  saveSentence: async (text: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/sentence/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save sentence');
    }
    return res.json();
  },

  getSentenceHistory: async (): Promise<SavedSentence[]> => {
    const res = await fetch(`${API_BASE}/sentence/history`);
    if (!res.ok) throw new Error('Failed to fetch sentences');
    return res.json();
  },

  deleteSentence: async (id: number): Promise<any> => {
    const res = await fetch(`${API_BASE}/sentence/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Recognition History
  getRecognitionHistory: async (limit: number = 100): Promise<PredictionHistoryRecord[]> => {
    const res = await fetch(`${API_BASE}/recognition/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // ASL Complete Word-Level Recognition
  getWordsVocabulary: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/words/vocabulary`);
    if (!res.ok) throw new Error('Failed to fetch words vocabulary');
    return res.json();
  },

  getWordsEvaluation: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/words/evaluation`);
    if (!res.ok) throw new Error('Failed to fetch words evaluation');
    return res.json();
  },

  predictWordSequence: async (sequence: number[][]): Promise<{
    word: string;
    confidence: number;
    top3: Array<{ word: string; confidence: number }>;
    is_stable: boolean;
    description?: string;
  }> => {
    const res = await fetch(`${API_BASE}/words/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence }),
    });
    if (!res.ok) throw new Error('Failed to predict word');
    return res.json();
  },
};
