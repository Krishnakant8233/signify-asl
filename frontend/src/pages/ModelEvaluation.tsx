import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Award,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { ModelMetadata } from '../types';

export const ModelEvaluation: React.FC = () => {
  const [evaluationTarget, setEvaluationTarget] = useState<'alphabet' | 'word'>('alphabet');
  const [meta, setMeta] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ actual: string; predicted: string; count: number } | null>(null);

  useEffect(() => {
    fetchEvaluation(evaluationTarget);
  }, [evaluationTarget]);

  const fetchEvaluation = async (target: 'alphabet' | 'word' = evaluationTarget) => {
    try {
      setLoading(true);
      setError(null);
      if (target === 'word') {
        const data = await api.getWordsEvaluation();
        setMeta(data);
      } else {
        const data = await api.getModelEvaluation();
        setMeta(data);
      }
    } catch (e: any) {
      setError(e.message || `${target === 'word' ? 'Word LSTM' : 'Alphabet CNN'} evaluation data not found.`);
    } finally {
      setLoading(false);
    }
  };

  const report = meta?.classification_report || {};
  const classes = meta?.classes || [];
  const cm = meta?.confusion_matrix || [];

  // Macro metrics
  const macroAvg = report['macro avg'] || {};
  const weightedAvg = report['weighted avg'] || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {evaluationTarget === 'word'
                ? 'ASL Word Sequence Model Evaluation (Bi-LSTM)'
                : 'CNN Alphabet Model Evaluation & Validation'}
            </h1>
            <p className="text-xs text-gray-400">
              {evaluationTarget === 'word'
                ? 'Empirical metrics for 20 ASL single-sign words evaluated on 30-frame temporal landmark sequences.'
                : 'Genuine classification report, test accuracy, precision, recall, and 26×26 confusion matrix evaluated on unseen test data.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Toggle */}
          <div className="flex items-center p-1 bg-gray-950 border border-gray-800 rounded-xl">
            <button
              onClick={() => setEvaluationTarget('alphabet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                evaluationTarget === 'alphabet' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Alphabet CNN
            </button>
            <button
              onClick={() => setEvaluationTarget('word')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                evaluationTarget === 'word' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Word Bi-LSTM
            </button>
          </div>

          <button
            onClick={() => fetchEvaluation()}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-8 rounded-3xl bg-[#111827] border border-gray-800 text-center space-y-3">
          <Info className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Model Evaluation Pending</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={() => fetchEvaluation()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
          >
            Check Again
          </button>
        </div>
      ) : (
        <>
          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Test Accuracy</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
                {meta?.test_accuracy ? `${(meta.test_accuracy * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Evaluated on independent test split</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Macro Precision</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-2 font-mono">
                {macroAvg.precision ? `${(macroAvg.precision * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Average across all 26 classes</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Macro Recall</span>
              <div className="text-3xl font-extrabold text-indigo-400 mt-2 font-mono">
                {macroAvg.recall ? `${(macroAvg.recall * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">True positive detection rate</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Macro F1-Score</span>
              <div className="text-3xl font-extrabold text-cyan-400 mt-2 font-mono">
                {macroAvg['f1-score'] ? `${(macroAvg['f1-score'] * 100).toFixed(1)}%` : '—'}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Harmonic mean of precision & recall</p>
            </div>
          </div>

          {/* Interactive Confusion Matrix Heatmap */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Confusion Matrix Heatmap (26 × 26 ASL Gestures)
                </h2>
                <p className="text-xs text-gray-400">Rows: Actual Gesture Label • Columns: Predicted Gesture Label</p>
              </div>

              {hoveredCell && (
                <div className="text-xs font-mono px-3 py-1 bg-gray-900 border border-gray-700 rounded-xl text-blue-300">
                  Actual: <strong>{hoveredCell.actual}</strong> → Predicted: <strong>{hoveredCell.predicted}</strong> ({hoveredCell.count} instances)
                </div>
              )}
            </div>

            {cm.length > 0 ? (
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full">
                  <div className="grid grid-cols-[auto_repeat(26,1fr)] gap-0.5 text-center text-[10px] font-mono">
                    {/* Header Row */}
                    <div className="w-6 h-6 flex items-center justify-center font-bold text-gray-500"></div>
                    {classes.map((c) => (
                      <div key={c} className="w-6 h-6 flex items-center justify-center font-bold text-blue-400 bg-gray-900/40 rounded-sm">
                        {c}
                      </div>
                    ))}

                    {/* Matrix Rows */}
                    {cm.map((row, rIdx) => {
                      const actualChar = classes[rIdx] || String(rIdx);
                      const maxInRow = Math.max(...row, 1);
                      return (
                        <React.Fragment key={rIdx}>
                          <div className="w-6 h-6 flex items-center justify-center font-bold text-blue-400 bg-gray-900/40 rounded-sm">
                            {actualChar}
                          </div>
                          {row.map((val, cIdx) => {
                            const predChar = classes[cIdx] || String(cIdx);
                            const isDiagonal = rIdx === cIdx;
                            const intensity = val / maxInRow;
                            const bgStyle = isDiagonal
                              ? `rgba(16, 185, 129, ${Math.max(0.15, intensity)})`
                              : val > 0
                              ? `rgba(239, 68, 68, ${Math.max(0.1, intensity * 0.8)})`
                              : 'transparent';

                            return (
                              <div
                                key={cIdx}
                                onMouseEnter={() => setHoveredCell({ actual: actualChar, predicted: predChar, count: val })}
                                onMouseLeave={() => setHoveredCell(null)}
                                style={{ backgroundColor: bgStyle }}
                                className={`w-6 h-6 flex items-center justify-center rounded-sm transition-all cursor-pointer border ${
                                  isDiagonal ? 'border-emerald-500/20 text-emerald-300 font-bold' : 'border-gray-900 text-gray-500'
                                } hover:scale-125 hover:z-20 hover:border-white`}
                              >
                                {val > 0 ? val : ''}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs">
                Confusion matrix will appear once model training and evaluation are complete.
              </div>
            )}
          </div>

          {/* Detailed Classification Report Table */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Per-Class Classification Report
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px]">
                    <th className="py-3 px-4">Gesture Class</th>
                    <th className="py-3 px-4">Precision</th>
                    <th className="py-3 px-4">Recall</th>
                    <th className="py-3 px-4">F1-Score</th>
                    <th className="py-3 px-4">Test Support</th>
                    <th className="py-3 px-4 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {classes.map((cls) => {
                    const row = report[cls] || { precision: 0, recall: 0, 'f1-score': 0, support: 0 };
                    const f1 = row['f1-score'] || 0;
                    return (
                      <tr key={cls} className="hover:bg-gray-900/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-white font-sans flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {cls}
                          </span>
                          <span>Gesture "{cls}"</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-300">{(row.precision * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-gray-300">{(row.recall * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-emerald-400 font-semibold">{(f1 * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-gray-400">{row.support} samples</td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f1 >= 0.85
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : f1 >= 0.70
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {f1 >= 0.85 ? 'Excellent' : f1 >= 0.70 ? 'Strong' : 'Moderate'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic & Dataset Limitations Section */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Academic Scope & Dataset Limitations Notice
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300 pt-1">
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Vocabulary Scope (20 Words)</span>
                </div>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  This prototype recognizes isolated target vocabulary words and A–Z alphabet signs. It is not an unrestricted sign language translator and does not claim full natural ASL sentence synthesis.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>Signer & Recording Variation</span>
                </div>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  WLASL training samples originate from varied video resolutions, angles, and signers. MediaPipe landmark normalization mitigates scale differences, but lighting and occlusion remain operative factors.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-1.5">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Non-Manual ASL Features</span>
                </div>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Complete ASL incorporates facial grammar (e.g. raised eyebrows, mouth morphemes) and torso orientation. The landmark pipeline focuses on upper body & hand articulators for real-time mobile performance.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
