import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle,
  Radio,
  Mic,
  Sparkles
} from 'lucide-react';
import { speechService } from '../services/speech';

export const SpeechSettingsPage: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string>('');

  useEffect(() => {
    // Load initial settings from speechService
    const settings = speechService.getSettings();
    setIsMuted(settings.isMuted);
    setAutoSpeechEnabled(settings.autoSpeechEnabled);
    setRate(settings.rate);
    setPitch(settings.pitch);
    setVolume(settings.volume);
    if (settings.selectedVoiceURI) {
      setSelectedVoiceURI(settings.selectedVoiceURI);
    }

    // Load voices
    const available = speechService.getVoices();
    setVoices(available);

    const unsub = speechService.onStatusChange((speaking, text) => {
      setIsSpeaking(speaking);
      setSpeakingText(text);
    });

    return () => unsub();
  }, []);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    speechService.setVoice(uri);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    speechService.setRate(newRate);
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    speechService.setPitch(newPitch);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    speechService.setVolume(newVol);
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    speechService.setMuted(next);
  };

  const handleAutoSpeechToggle = () => {
    const next = !autoSpeechEnabled;
    setAutoSpeechEnabled(next);
    speechService.setAutoSpeech(next);
  };

  const handleTestVoice = () => {
    speechService.testVoice();
  };

  const handleResetDefaults = () => {
    handleRateChange(1.0);
    handlePitchChange(1.0);
    handleVolumeChange(1.0);
    setIsMuted(false);
    speechService.setMuted(false);
    setAutoSpeechEnabled(true);
    speechService.setAutoSpeech(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Volume2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Assistive Text-to-Speech Engine</h1>
            <p className="text-xs text-gray-400">
              Web Speech API configuration: Automatic letter vocalization, word and sentence speech, voice selection, and rate controls.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestVoice}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Voice Output</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Card */}
      {isSpeaking && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Speech Active: "{speakingText}"</span>
          </div>
          <button
            onClick={() => speechService.stop()}
            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-200 text-xs font-bold"
          >
            Stop
          </button>
        </div>
      )}

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Selection & Global Toggles */}
        <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Mic className="w-4 h-4 text-blue-400" />
            <span>Voice & Vocalization Triggers</span>
          </h2>

          {/* Automatic Letter Speech Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-950 border border-gray-800">
            <div>
              <div className="text-xs font-bold text-white">Automatic Character Speech</div>
              <div className="text-[11px] text-gray-400">
                Immediately speak newly stabilized gestures (e.g. "A", "B", "C")
              </div>
            </div>
            <button
              onClick={handleAutoSpeechToggle}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoSpeechEnabled ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  autoSpeechEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Global Mute Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-950 border border-gray-800">
            <div>
              <div className="text-xs font-bold text-white">Global Audio Mute</div>
              <div className="text-[11px] text-gray-400">
                Mute all speech synthesis outputs application-wide
              </div>
            </div>
            <button
              onClick={handleMuteToggle}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-800'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>
          </div>

          {/* Voice Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Installed System Voice</label>
            <select
              value={selectedVoiceURI}
              onChange={handleVoiceChange}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs outline-none focus:border-blue-500"
            >
              {voices.length === 0 ? (
                <option value="">Default Browser Voice</option>
              ) : (
                voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
            <span className="text-[10px] text-gray-500 block">
              Powered natively by your browser's speech synthesis engine.
            </span>
          </div>
        </div>

        {/* Audio Tuning Sliders (Rate, Pitch, Volume) */}
        <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Acoustic Parameters</span>
            </h2>
            <button
              onClick={handleResetDefaults}
              className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Speech Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Speech Rate / Speed</span>
              <span className="font-mono text-blue-400">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Fast)</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Pitch</span>
              <span className="font-mono text-indigo-400">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0.5 (Low)</span>
              <span>1.0 (Natural)</span>
              <span>1.5 (High)</span>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Volume</span>
              <span className="font-mono text-emerald-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
