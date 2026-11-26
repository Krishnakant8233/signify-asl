import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Layers,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { ModelStatus, TrainingProgress } from '../types';

export const ModelTraining: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [epochs, setEpochs] = useState<number>(10);
  const [batchSize, setBatchSize] = useState<number>(64);
  const [learningRate, setLearningRate] = useState<number>(0.01);
  const [optimizer, setOptimizer] = useState<string>('adam');
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Poll status and training progress
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [mStatus, tProgress] = await Promise.all([
          api.getModelStatus(),
          api.getTrainingProgress(),
        ]);
        setModelStatus(mStatus);
        setProgress(tProgress);
      } catch (e) {
        console.warn('Status poll error:', e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleStartTraining = async () => {
    try {
      setIsStarting(true);
      setStatusMessage(null);
      await api.trainModel({
        epochs,
        batch_size: batchSize,
        learning_rate: learningRate,
        optimizer,
      });
      setStatusMessage('Training initiated! Monitoring live epochs below.');
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const isTraining = progress?.is_training || modelStatus?.is_training || false;
  const history = progress?.epochs_history || modelStatus?.metadata?.epochs_history || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CNN Model Training & Hyperparameters</h1>
            <p className="text-xs text-gray-400">
              Train the academic report 3-Stage Convolutional Neural Network on the partitioned ASL gesture dataset.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${isTraining ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-medium text-gray-200">
              {isTraining ? `Training Epoch ${progress?.current_epoch || 1}/${progress?.total_epochs || epochs}` : 'Engine Ready'}
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-blue-400 hover:text-blue-200">✕</button>
        </div>
      )}

      {/* Academic CNN Architecture Visualizer */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Academic Project Report CNN Specification</span>
          </h2>
          <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-gray-900 border border-gray-800">
            583,882 Trainable Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 font-mono">Stage 1</span>
              <span className="text-[10px] text-gray-500">64×64×3 Input</span>
            </div>
            <div className="font-semibold text-white">Conv2D (16 filters, 2×2, ReLU)</div>
            <div className="text-[11px] text-gray-400">MaxPooling2D (2×2 pool)</div>
            <div className="text-[10px] font-mono text-emerald-400 pt-1">Output: 32×32×16</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 font-mono">Stage 2</span>
              <span className="text-[10px] text-gray-500">32×32×16</span>
            </div>
            <div className="font-semibold text-white">Conv2D (32 filters, 3×3, ReLU)</div>
            <div className="text-[11px] text-gray-400">MaxPooling2D (2×2 pool)</div>
            <div className="text-[10px] font-mono text-emerald-400 pt-1">Output: 16×16×32</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 font-mono">Stage 3</span>
              <span className="text-[10px] text-gray-500">16×16×32</span>
            </div>
            <div className="font-semibold text-white">Conv2D (64 filters, 5×5, ReLU)</div>
            <div className="text-[11px] text-gray-400">MaxPooling2D (2×2 pool)</div>
            <div className="text-[10px] font-mono text-emerald-400 pt-1">Output: 8×8×64</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-950/80 border border-blue-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400 font-mono">Dense Head</span>
              <span className="text-[10px] text-gray-500">Flatten (4,096)</span>
            </div>
            <div className="font-semibold text-white">Dense (128, ReLU) + Dropout (0.2)</div>
            <div className="text-[11px] text-gray-400">Softmax Output Layer</div>
            <div className="text-[10px] font-mono text-emerald-400 pt-1">Output: 26 Classes (A–Z)</div>
          </div>
        </div>
      </div>

      {/* Hyperparameters & Start Button Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Training Configuration</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Epochs</label>
              <input
                type="number"
                min={1}
                max={50}
                value={epochs}
                disabled={isTraining}
                onChange={(e) => setEpochs(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">Batch Size</label>
              <select
                value={batchSize}
                disabled={isTraining}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value={32}>32</option>
                <option value={64}>64 (Recommended)</option>
                <option value={128}>128</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">Learning Rate</label>
              <input
                type="number"
                step={0.001}
                value={learningRate}
                disabled={isTraining}
                onChange={(e) => setLearningRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Baseline from report: 0.01 SGD</span>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">Optimizer</label>
              <select
                value={optimizer}
                disabled={isTraining}
                onChange={(e) => setOptimizer(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="adam">Adam (Fast Convergence)</option>
                <option value="sgd">SGD (Report Baseline lr=0.01)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleStartTraining}
                disabled={isTraining || isStarting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTraining ? 'Training In Progress...' : 'Start CNN Training'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Loss & Accuracy Curves */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Real-Time Learning Curves</span>
              </h2>
              <p className="text-xs text-gray-400">Epoch-by-epoch loss reduction and validation accuracy tracking</p>
            </div>
            {isTraining && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                Live Epoch Updating
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="epoch" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="accuracy" name="Train Accuracy" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val_accuracy" name="Val Accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="loss" name="Train Loss" stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs space-y-2">
                <Info className="w-6 h-6 text-gray-600" />
                <span>Training metrics and loss curves will render here once training starts.</span>
              </div>
            )}
          </div>

          {/* Quick Metrics Footer */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-800 text-xs">
              <div className="p-3 rounded-xl bg-gray-950 border border-gray-800/80">
                <span className="text-gray-400 block text-[10px]">Latest Train Acc</span>
                <span className="text-lg font-bold text-blue-400 font-mono">
                  {((history[history.length - 1]?.accuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-950 border border-gray-800/80">
                <span className="text-gray-400 block text-[10px]">Latest Val Acc</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {((history[history.length - 1]?.val_accuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-950 border border-gray-800/80">
                <span className="text-gray-400 block text-[10px]">Latest Loss</span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {(history[history.length - 1]?.loss || 0).toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
