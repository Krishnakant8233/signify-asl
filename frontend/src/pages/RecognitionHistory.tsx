import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Download,
  RefreshCw,
  Volume2,
  CheckCircle,
  FileSpreadsheet,
  Hand
} from 'lucide-react';
import { api } from '../services/api';
import { PredictionHistoryRecord } from '../types';

export const RecognitionHistory: React.FC = () => {
  const [history, setHistory] = useState<PredictionHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getRecognitionHistory(100);
      setHistory(data);
    } catch (e) {
      console.warn('Could not load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.predicted_char.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.detection_method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['ID,Timestamp,Character,Confidence,Detection_Method,Spoken\n'];
    const rows = history.map((r) =>
      `${r.id},"${r.timestamp}","${r.predicted_char}",${r.confidence.toFixed(2)},"${r.detection_method}",${r.spoken}`
    );
    const blob = new Blob([...headers, rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recognition_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Recognition & Inference Log</h1>
            <p className="text-xs text-gray-400">
              Auditable database log of all stable gesture predictions emitted by the CNN inference pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
        {/* Search */}
        <div className="flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by letter or method..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-gray-400">
            Showing {filteredHistory.length} records
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Gesture</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Detection Method</th>
                <th className="py-3 px-4">Voice Spoken</th>
                <th className="py-3 px-4">Top 3 Candidates</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                    No recognition records logged yet. Run live webcam recognition to generate real-time log data.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 inline-flex items-center justify-center font-bold text-sm">
                        {row.predicted_char}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {row.confidence.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-300">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[11px]">
                        {row.detection_method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {row.spoken ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-sans text-[11px]">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Spoken</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 font-sans text-[11px]">Muted</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      {row.top3 && row.top3.length > 0
                        ? row.top3.map((c) => `${c.character} (${c.confidence}%)`).join(', ')
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-[11px] font-sans">
                      {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
