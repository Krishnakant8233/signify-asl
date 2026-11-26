import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Activity, Radio, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { speechService } from '../services/speech';
import { api } from '../services/api';
import { HealthStatus } from '../types';

interface NavbarProps {
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    // Poll health status periodically
    const checkHealth = async () => {
      try {
        const data = await api.getHealth();
        setHealth(data);
      } catch (err) {
        setHealth(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);

    // Speech status listener
    const unsub = speechService.onStatusChange((speaking, text) => {
      setIsSpeaking(speaking);
      setSpeakingText(text);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    speechService.setMuted(nextMuted);
  };

  return (
    <header className="h-16 bg-[#0E1526]/90 backdrop-blur-md border-b border-gray-800/80 px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              ASL Assistive
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Real-Time CNN
            </span>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">
            Sign Gesture Recognition for Assistive Communication
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Live Speech Indicator */}
        {isSpeaking && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              Speaking: "{speakingText}"
            </span>
          </div>
        )}

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute Voice Output" : "Mute Voice Output"}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isMuted
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
              : 'bg-gray-800/80 text-gray-200 border border-gray-700 hover:bg-gray-700/80'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          <span>{isMuted ? 'Muted' : 'Voice Active'}</span>
        </button>

        {/* Backend Status Pill */}
        <div className="flex items-center space-x-2 pl-3 border-l border-gray-800">
          <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`} />
          <div className="text-xs text-gray-400 hidden md:block">
            {health ? (
              <span className="text-emerald-400 font-medium">Backend Connected</span>
            ) : (
              <span className="text-rose-400 font-medium">Connecting...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
