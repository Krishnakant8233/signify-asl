import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  Volume2,
  Copy,
  Trash2,
  Download,
  BookmarkCheck,
  Sparkles,
  Share2,
  Clock,
  ArrowRight,
  CheckCircle2,
  CornerDownLeft
} from 'lucide-react';
import { api } from '../services/api';
import { speechService } from '../services/speech';
import { SavedSentence } from '../types';

export const SentenceBuilderPage: React.FC = () => {
  const [currentText, setCurrentText] = useState<string>('');
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Common assistive vocabulary for quick communication
  const quickWords = [
    'HELLO', 'THANK YOU', 'PLEASE', 'YES', 'NO', 'HELP',
    'I NEED', 'WATER', 'GOOD', 'HOW ARE YOU', 'MY NAME IS', 'EXCUSE ME'
  ];

  // Common word completion dictionary
  const dictionary = [
    'HELLO', 'HELP', 'HELMET', 'HEAR', 'HEART',
    'WATER', 'WANT', 'WAIT', 'WALK', 'WASH',
    'PLEASE', 'PEOPLE', 'PLAY', 'PAIN',
    'THANK', 'THANKS', 'THAT', 'THERE', 'THIS', 'TIME',
    'GOOD', 'GREAT', 'GO', 'GIVE',
    'YES', 'YOU', 'YOUR',
    'NAME', 'NICE', 'NEED', 'NO'
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await api.getSentenceHistory();
      setSavedSentences(data);
    } catch (e) {
      console.warn('Could not fetch sentences:', e);
    }
  };

  // Word completions based on current active word
  const words = currentText.split(/\s+/);
  const activeWord = words[words.length - 1]?.toUpperCase() || '';
  const completions = activeWord.length >= 2
    ? dictionary.filter(w => w.startsWith(activeWord) && w !== activeWord).slice(0, 4)
    : [];

  const handleApplyCompletion = (word: string) => {
    const updated = [...words];
    updated[updated.length - 1] = word;
    setCurrentText(updated.join(' ') + ' ');
  };

  const handleAddWord = (word: string) => {
    setCurrentText((prev) => (prev ? `${prev.trim()} ${word} ` : `${word} `));
  };

  const handleCopy = () => {
    if (currentText) {
      navigator.clipboard.writeText(currentText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!currentText.trim()) return;
    const blob = new Blob([currentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asl_sentence_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!currentText.trim()) return;
    try {
      await api.saveSentence(currentText);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      fetchHistory();
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteSentence(id);
      setSavedSentences((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const filteredHistory = savedSentences.filter(s =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Assistive Sentence Builder & Text-to-Speech</h1>
            <p className="text-xs text-gray-400">
              Combine recognized static gestures into full sentences, complete words, and trigger instant vocal communication.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => speechService.speakText(currentText, true)}
            disabled={!currentText.trim()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Volume2 className="w-4 h-4" />
            <span>Speak Sentence</span>
          </button>
        </div>
      </div>

      {/* Main Builder Board */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Active Construction Buffer
          </span>
          <div className="flex items-center space-x-3 text-xs text-gray-400">
            <span>{currentText.split(/\s+/).filter(Boolean).length} words</span>
            <span>•</span>
            <span>{currentText.length} characters</span>
          </div>
        </div>

        {/* Text Area Display */}
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value.toUpperCase())}
          placeholder="Characters recognized from webcam will stream here, or click vocabulary buttons below..."
          className="w-full h-32 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-xl font-mono text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
        />

        {/* Predictive Word Completions */}
        {completions.length > 0 && (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-xs text-gray-500 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Word Suggestions:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {completions.map((word) => (
                <button
                  key={word}
                  onClick={() => handleApplyCompletion(word)}
                  className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-mono font-medium border border-blue-500/30 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>{word}</span>
                  <CornerDownLeft className="w-3 h-3 text-blue-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentText((prev) => (prev.endsWith(' ') ? prev : prev + ' '))}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer"
            >
              Space (␣)
            </button>
            <button
              onClick={() => setCurrentText((prev) => prev.slice(0, -1))}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer"
            >
              Backspace (⌫)
            </button>
            <button
              onClick={() => setCurrentText('')}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              disabled={!currentText}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!currentText.trim()}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!currentText.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Saved!' : 'Save Sentence'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Assistive Vocabulary Bank */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Quick Assistive Phrases & Vocabulary
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickWords.map((word) => (
            <button
              key={word}
              onClick={() => handleAddWord(word)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-blue-600/20 hover:border-blue-500/40 text-gray-300 hover:text-blue-300 border border-gray-800 text-xs font-semibold transition-all cursor-pointer"
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Sentence Archive */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Saved Communication History ({savedSentences.length})
            </h2>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved sentences..."
            className="px-3.5 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            No saved sentences found matching your search.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHistory.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-gray-950/70 border border-gray-800/80 hover:border-gray-700 transition-all text-xs"
              >
                <div className="space-y-1 pr-4">
                  <p className="font-semibold text-white text-sm">"{s.text}"</p>
                  <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                    <span>{s.word_count} words • {s.character_count} chars</span>
                    <span>•</span>
                    <span>{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => speechService.speakText(s.text, true)}
                    title="Vocalize this sentence"
                    className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentText(s.text)}
                    title="Load into editor"
                    className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Delete record"
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
