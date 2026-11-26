import React, { useEffect, useState } from 'react';
import {
  Camera,
  MessageSquareText,
  Database,
  Cpu,
  BarChart3,
  Volume2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus, ModelStatus, DatasetStatus, SavedSentence } from '../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [recentSentences, setRecentSentences] = useState<SavedSentence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [h, m, d, s] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getModelStatus().catch(() => null),
          api.getDatasetStatus().catch(() => null),
          api.getSentenceHistory().catch(() => []),
        ]);
        setHealth(h);
        setModelStatus(m);
        setDatasetStatus(d);
        setRecentSentences(s.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = datasetStatus?.stats;
  const meta = modelStatus?.metadata;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/60 via-[#131B2E] to-indigo-950/50 border border-blue-500/20 p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Capstone & Assistive AI System</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Real-Time Sign Gesture Recognition for Assistive Communication
          </h1>
          <p className="mt-3 text-gray-300 text-sm sm:text-base leading-relaxed">
            A comprehensive computer vision and deep learning system powered by custom 3-stage CNN,
            MediaPipe hand tracking, Otsu-histogram segmentation, browser text-to-speech, and an assistive sentence builder.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('live')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Webcam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('sentence')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 font-medium text-sm border border-gray-700 transition-all cursor-pointer"
            >
              <MessageSquareText className="w-4 h-4 text-blue-400" />
              <span>Open Sentence Builder</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid BG */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model Card */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800/80 hover:border-gray-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">CNN Model</span>
            <div className={`p-2 rounded-xl ${modelStatus?.has_trained_model ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {modelStatus?.has_trained_model ? 'Active & Ready' : (modelStatus?.is_training ? 'Training...' : 'Model Ready')}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {modelStatus?.classes?.length ? `${modelStatus.classes.length} Gesture Classes (A-Z)` : '26 ASL Classes'}
            </p>
          </div>
        </div>

        {/* Real-Time Engine Card */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800/80 hover:border-gray-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recognition Modes</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              Dual ASL Engine
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Mode 1 (Letters A-Z) + Mode 2 (Full Words)
            </p>
          </div>
        </div>
      </div>

      {/* Recent Communication / Sentences */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-gray-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <MessageSquareText className="w-5 h-5 text-indigo-400" />
            <span>Recent Sentences</span>
          </h2>
          <button
            onClick={() => onNavigate('sentence')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            View All
          </button>
        </div>

        {recentSentences.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            No saved sentences yet. Construct words in Live Recognition or Sentence Builder!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSentences.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-xs flex flex-col justify-between">
                <p className="font-semibold text-gray-200 truncate text-sm">"{s.text}"</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
                  <span>{s.word_count} words • {s.character_count} chars</span>
                  <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => onNavigate('sentence')}
          className="w-full mt-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-xs border border-gray-700 transition-all flex items-center justify-center space-x-1.5"
        >
          <span>Open Sentence Builder</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
