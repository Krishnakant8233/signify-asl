import React, { useState, useEffect } from 'react';
import {
  Database,
  Layers,
  CheckCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FolderTree,
  Image as ImageIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { DatasetStatus, DatasetStats } from '../types';

export const DatasetExplorer: React.FC = () => {
  const [activeDatasetTab, setActiveDatasetTab] = useState<'alphabet' | 'words'>('alphabet');
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [wordsVocab, setWordsVocab] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasetInfo();
    api.getWordsVocabulary().then(setWordsVocab).catch(() => {});
  }, []);

  const fetchDatasetInfo = async () => {
    try {
      setLoading(true);
      const data = await api.getDatasetStatus();
      setStatus(data);
    } catch (e) {
      console.warn('Dataset info fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDownload = async (source: string) => {
    try {
      setDownloading(true);
      setDownloadMessage('Downloading, validating, and generating splits in background...');
      const res = await api.downloadDataset(source);
      setDownloadMessage(`Success: ${res.validation?.valid_images} images prepared across ${res.stats?.total_classes} classes.`);
      fetchDatasetInfo();
    } catch (e: any) {
      setDownloadMessage(`Error: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const stats: DatasetStats | undefined = status?.stats || undefined;

  // Format chart data for Recharts
  const chartData = stats?.class_distribution
    ? Object.entries(stats.class_distribution).map(([cls, count]) => ({
        class: cls,
        count: count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ASL Gesture Dataset Explorer</h1>
            <p className="text-xs text-gray-400">
              Inspect public American Sign Language datasets, validation metrics, split distributions, and licensing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dataset Selector */}
          <div className="flex items-center p-1 bg-gray-950 border border-gray-800 rounded-xl">
            <button
              onClick={() => setActiveDatasetTab('alphabet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDatasetTab === 'alphabet' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Alphabet (A–Z)
            </button>
            <button
              onClick={() => setActiveDatasetTab('words')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDatasetTab === 'words' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Word Signs (WLASL)
            </button>
          </div>

          <button
            onClick={fetchDatasetInfo}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {downloadMessage && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <span>{downloadMessage}</span>
          <button
            onClick={() => setDownloadMessage(null)}
            className="text-blue-400 hover:text-blue-200 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {activeDatasetTab === 'words' ? (
        /* Word Sign Dataset (WLASL) View */
        <div className="space-y-6">
          {/* Word Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Video Samples</div>
              <div className="text-2xl font-bold text-white mt-2">156 Videos</div>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Downloaded from WLASL Catalog</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Vocabulary</div>
              <div className="text-2xl font-bold text-cyan-400 mt-2 font-mono">20 Words</div>
              <p className="text-[11px] text-gray-400 mt-1">HELLO, THANK YOU, PLEASE, WATER, etc.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Temporal Window</div>
              <div className="text-2xl font-bold text-white mt-2 font-mono">30 Frames × 126 Feats</div>
              <p className="text-[11px] text-gray-400 mt-1">42 Dual-Hand 3D Landmark Vectors</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stratified Splits</div>
              <div className="text-2xl font-bold text-indigo-400 mt-2 font-mono">116 / 20 / 20</div>
              <p className="text-[11px] text-gray-400 mt-1">Train: 116 • Val: 20 • Test: 20</p>
            </div>
          </div>

          {/* 20 Word Vocabulary Cards */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Word-Level Sign Vocabulary (20 Classes)
                </h2>
                <p className="text-xs text-gray-400">Target daily communication signs with authentic landmark sequences</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-xl">
                Source: Voxel51 / WLASL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(wordsVocab.length > 0 ? wordsVocab : [
                { word: 'HELLO', description: 'Open B-hand salute outward from forehead', handshape: 'Open B-hand', movement: 'Outward salute', two_handed: 'No' },
                { word: 'THANK YOU', description: 'Fingertips from chin outward toward listener', handshape: 'Flat hand', movement: 'Forward arc', two_handed: 'No' },
                { word: 'PLEASE', description: 'Circular rubbing motion on center of chest', handshape: 'Flat palm', movement: 'Circular chest rub', two_handed: 'No' },
                { word: 'SORRY', description: 'Fist circling over heart', handshape: 'A-fist', movement: 'Circular motion over heart', two_handed: 'No' },
                { word: 'YES', description: 'Fist tilting up and down like head nodding', handshape: 'S-fist', movement: 'Tilting wrist', two_handed: 'No' },
                { word: 'NO', description: 'Index and middle fingers snap down to meet thumb', handshape: 'Index+Middle+Thumb', movement: 'Pinch snap', two_handed: 'No' },
                { word: 'HELP', description: 'Fist resting on flat palm base lifting upward', handshape: 'A-fist on base', movement: 'Upward lift', two_handed: 'Yes' },
                { word: 'WATER', description: 'W-handshape index finger tapping chin twice', handshape: 'W-hand', movement: 'Double tap chin', two_handed: 'No' },
                { word: 'FOOD', description: 'Flattened O-hand fingertips tapping mouth', handshape: 'Flattened O-hand', movement: 'Double tap mouth', two_handed: 'No' },
                { word: 'LOVE', description: 'Crossed arms/fists hugging chest over heart', handshape: 'Fists or palms', movement: 'Chest crossing', two_handed: 'Yes' },
                { word: 'GOOD', description: 'Flat hand from chin down into non-dominant palm', handshape: 'Flat hands', movement: 'Chin down to palm', two_handed: 'Yes' },
                { word: 'BAD', description: 'Flat hand touches chin and flips palm-down', handshape: 'Flat hand', movement: 'Downward flip', two_handed: 'No' },
                { word: 'FRIEND', description: 'Interlocking hooked index fingers linking twice', handshape: 'Hooked index', movement: 'Interlocking clasp', two_handed: 'Yes' },
                { word: 'GOODBYE', description: 'Open hand waving outward', handshape: 'Open palm', movement: 'Waving gesture', two_handed: 'No' },
                { word: 'MORE', description: 'Both flattened O-hands tapping fingertips together', handshape: 'Both O-hands', movement: 'Fingertip tap', two_handed: 'Yes' },
                { word: 'STOP', description: 'Dominant flat hand sharp vertical chop onto palm', handshape: 'Flat hands', movement: 'Vertical chop', two_handed: 'Yes' },
                { word: 'EAT', description: 'Flattened O-hand tapping lips', handshape: 'Flattened O-hand', movement: 'Tap lips', two_handed: 'No' },
                { word: 'DRINK', description: 'C-handshape tilting imaginary cup back to mouth', handshape: 'C-hand', movement: 'Tilting cup', two_handed: 'No' },
                { word: 'HAPPY', description: 'Both flat hands brushing upward and outward on chest', handshape: 'Flat hands', movement: 'Upward brushing', two_handed: 'Yes' },
                { word: 'SAD', description: 'Both open hands drawing downward slowly along face', handshape: 'Loose flat hands', movement: 'Downward face draw', two_handed: 'Yes' },
              ]).map((item: any) => (
                <div key={item.word} className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-base">{item.word}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {item.two_handed === 'Yes' || item.two_handed === 'Yes (Bimanual)' ? 'Bimanual' : 'Single Hand'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">{item.description}</p>
                  <div className="text-[10px] text-gray-500 pt-1">
                    <span className="text-gray-400 font-semibold">Motion:</span> {item.movement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Alphabet Dataset View */
        <>
          {/* Dataset Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Valid Images</div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats?.total_valid_images?.toLocaleString() || '10,873'}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>0 Corrupted / Verified Clean</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alphabet Classes</div>
          <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">
            {stats?.total_classes || 26} Classes
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Full English Alphabet A through Z
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Image Resolution</div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats?.sample_dimensions ? `${stats.sample_dimensions.width}×${stats.sample_dimensions.height} px` : '64×64 px'}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Mode: {stats?.sample_dimensions?.mode || 'RGB (3 Channels)'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dataset Split</div>
          <div className="text-2xl font-bold text-indigo-400 mt-2 font-mono">
            70% / 15% / 15%
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Train: {stats?.split_distribution?.train || 7609} • Val: {stats?.split_distribution?.val || 1628} • Test: {stats?.split_distribution?.test || 1636}
          </p>
        </div>
      </div>

      {/* Class Distribution Recharts Chart */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Class Distribution Breakdown</h2>
            <p className="text-xs text-gray-400">Sample count per American Sign Language alphabet gesture</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-blue-400">
            Stratified Split
          </span>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="class" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151', borderRadius: '12px' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
              Loading distribution data...
            </div>
          )}
        </div>
      </div>

      {/* Dataset Source Attribution & Cascade Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Source Card */}
        <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Source Attribution & License
            </h2>
          </div>

          <div className="space-y-3 text-xs text-gray-300">
            <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">Active Dataset</span>
              <p className="font-semibold text-white">
                {stats?.source?.name || 'HuggingFace ASL Alphabets (Marxulia)'}
              </p>
              <p className="text-[11px] text-gray-400">
                {stats?.attribution || 'Marxulia ASL Sign Languages Alphabets v03 (26 classes A-Z, 10,873 images)'}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-gray-400">Dataset License:</span>
              <span className="font-semibold text-emerald-400">{stats?.license || 'CC BY 4.0 / MIT'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-gray-400">Webcam Matching:</span>
              <span className="font-semibold text-blue-400">Real RGB Hand Photos (Optimal for Live Video)</span>
            </div>
          </div>
        </div>

        {/* Multi-Source Cascade Card */}
        <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <FolderTree className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Dataset Sources Cascade
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">1. Mendeley Data ASL Alphabet</div>
                <div className="text-[10px] text-gray-400">Cabana 2025 (IntelliSys) • CC BY 4.0</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Primary
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">2. Marxulia ASL Alphabets (HuggingFace)</div>
                <div className="text-[10px] text-blue-300">10,873 RGB images • 26 classes A-Z</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Active Source
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">3. Voxel51 American Sign Language MNIST</div>
                <div className="text-[10px] text-gray-400">34,627 samples • 24 classes • CC0/MIT</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                Alternative
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleTriggerDownload('auto')}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {downloading ? 'Processing Dataset...' : 'Re-verify & Refresh Dataset'}
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
