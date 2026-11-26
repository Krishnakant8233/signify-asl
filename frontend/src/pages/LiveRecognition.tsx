import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Volume2,
  Play,
  Square,
  Sparkles,
  Copy,
  BookmarkCheck,
  SwitchCamera,
  Info,
  CheckCircle2,
  HelpCircle,
  Zap,
  Activity,
  ArrowRight,
  Clock,
  RotateCcw,
  Smartphone,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { handDetector } from '../services/handDetector';
import { aslClassifier, ClassificationResult } from '../services/aslClassifier';
import { aslWordClassifier, WordClassificationResult } from '../services/aslWordClassifier';
import { speechService } from '../services/speech';
import { api } from '../services/api';

// Reference guide data for ASL letters
const ASL_GUIDE: Record<string, string> = {
  A: 'Closed fist with thumb upright alongside index finger',
  B: 'Four fingers upright together, thumb folded across palm',
  C: 'Curved hand forming a C-shape',
  D: 'Index finger straight up, thumb touches middle/ring forming circle',
  E: 'All fingers curled down with fingertips resting on thumb',
  F: 'Thumb and index touch forming circle, other three fingers upright',
  G: 'Index pointing sideways, thumb parallel, other fingers curled',
  H: 'Index and middle fingers pointing sideways together',
  I: 'Only pinky finger extended straight up, thumb across fist',
  K: 'Index and middle upright, thumb upright between them',
  L: 'Index upright and thumb extended at 90° forming an L',
  O: 'All fingertips touching thumb tip forming an O-ring',
  R: 'Index and middle fingers extended and crossed over',
  S: 'Closed fist with thumb wrapped across front of fingers',
  U: 'Index and middle fingers extended straight up together',
  V: 'Index and middle fingers extended in a V shape',
  W: 'Index, middle, and ring fingers extended in a W shape',
  X: 'Index finger bent into a hook, other fingers curled',
  Y: 'Thumb and pinky extended out wide (Hang Loose/Shaka)',
  ' ': 'Open flat palm facing forward (Space / End Word)'
};

type CyclePhase = 'IDLE' | 'HOLDING' | 'COOLDOWN';

export const LiveRecognition: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Classification & Hand Tracking
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);

  // 3s Hold & 2s Cooldown State Machine
  const [phase, setPhase] = useState<CyclePhase>('IDLE');
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(3.0);
  const [cooldownProgress, setCooldownProgress] = useState<number>(0);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number>(2.0);
  const [lastCommittedChar, setLastCommittedChar] = useState<string>('');

  // Auto-Spacing on Hand Drop / Rest (Silent)
  const [autoSpaceCountdown, setAutoSpaceCountdown] = useState<number | null>(null);
  const autoSpaceTimerRef = useRef<any>(null);
  const autoSpaceIntervalRef = useRef<any>(null);

  // Stream translation & Sentence Builder
  const [currentWord, setCurrentWord] = useState<string>('');
  const [sentence, setSentence] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showMobileModal, setShowMobileModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Recognition Mode: 'alphabet' (Mode A) vs 'word' (Mode B: Single-Sign Complete Words)
  const [recognitionMode, setRecognitionMode] = useState<'alphabet' | 'word'>('alphabet');
  const recognitionModeRef = useRef<'alphabet' | 'word'>('alphabet');
  const [wordResult, setWordResult] = useState<WordClassificationResult | null>(null);
  const [lastCommittedWord, setLastCommittedWord] = useState<string>('');
  const [vocabularyList, setVocabularyList] = useState<any[]>([]);
  const [showWordGuide, setShowWordGuide] = useState<boolean>(false);
  const wordVotesRef = useRef<Record<string, number>>({});

  // Timing Constants: 3s hold to predict, 2s cooldown to relax hand / take hand down
  const HOLD_DURATION_MS = 3000;
  const COOLDOWN_DURATION_MS = 2000;

  // Refs for high-speed animation/video frames & duplicate prevention
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const cycleStateRef = useRef<CyclePhase>('IDLE');
  const holdStartRef = useRef<number>(0);
  const cooldownStartRef = useRef<number>(0);
  const sampleVotesRef = useRef<Record<string, number>>({});
  const currentWordRef = useRef<string>('');
  const isCommittingWordRef = useRef<boolean>(false);

  // Detect Host IP for Mobile Pairing
  const hostIP = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const mobileUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${hostIP}:${window.location.port || '5173'}/live`
    : 'https://localhost:5173/live';

  // Subscribe to speech status
  useEffect(() => {
    const unsub = speechService.onStatusChange((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => unsub();
  }, []);

  // Fetch word suggestions when currentWord changes
  useEffect(() => {
    if (currentWord.trim().length >= 2) {
      fetch(`/api/autocorrect?word=${currentWord.trim().toUpperCase()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.suggestions) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(() => {});
    } else {
      setSuggestions([]);
    }
  }, [currentWord]);

  // Load Word Vocabulary Guide
  useEffect(() => {
    api.getWordsVocabulary().then(setVocabularyList).catch(() => {});
  }, []);

  const handleModeChange = (mode: 'alphabet' | 'word') => {
    setRecognitionMode(mode);
    recognitionModeRef.current = mode;
    cycleStateRef.current = 'IDLE';
    setPhase('IDLE');
    setHoldProgress(0);
    setCooldownProgress(0);
    sampleVotesRef.current = {};
    wordVotesRef.current = {};
    aslWordClassifier.clearBuffer();
  };

  // Space & Autocorrect word committer (Strictly prevents duplicate words)
  const handleSpace = useCallback(async (overrideWord?: string) => {
    if (isCommittingWordRef.current) return;

    const targetWord = (overrideWord || currentWordRef.current).trim().toUpperCase();
    if (!targetWord) return;

    isCommittingWordRef.current = true;
    currentWordRef.current = '';
    setCurrentWord('');
    setSuggestions([]);

    if (autoSpaceTimerRef.current) clearTimeout(autoSpaceTimerRef.current);
    if (autoSpaceIntervalRef.current) clearInterval(autoSpaceIntervalRef.current);
    autoSpaceTimerRef.current = null;
    autoSpaceIntervalRef.current = null;
    setAutoSpaceCountdown(null);

    try {
      const res = await fetch(`/api/autocorrect?word=${targetWord}`);
      const data = await res.json();
      const corrected = data.correctedWord || targetWord;

      setSentence((prev) => {
        const words = prev.trim().split(/\s+/).filter(Boolean);
        // STRICT DUPLICATE GUARD: If the last word is already identical, do NOT append it again!
        if (words.length > 0 && words[words.length - 1] === corrected) {
          return prev;
        }
        return prev ? `${prev} ${corrected}` : corrected;
      });
    } catch {
      setSentence((prev) => {
        const words = prev.trim().split(/\s+/).filter(Boolean);
        if (words.length > 0 && words[words.length - 1] === targetWord) {
          return prev;
        }
        return prev ? `${prev} ${targetWord}` : targetWord;
      });
    } finally {
      isCommittingWordRef.current = false;
    }
  }, []);

  // Natural ASL word spacing when hand is dropped/paused for 1.2s (Silent)
  const triggerHandDropAutoSpacing = useCallback(() => {
    if (!currentWordRef.current.trim()) return;
    if (autoSpaceTimerRef.current) return;

    let remaining = 1.2;
    setAutoSpaceCountdown(1.2);

    autoSpaceIntervalRef.current = setInterval(() => {
      remaining -= 0.1;
      if (remaining <= 0) {
        clearInterval(autoSpaceIntervalRef.current);
        autoSpaceIntervalRef.current = null;
      } else {
        setAutoSpaceCountdown(Math.max(0, Math.round(remaining * 10) / 10));
      }
    }, 100);

    autoSpaceTimerRef.current = setTimeout(() => {
      autoSpaceTimerRef.current = null;
      setAutoSpaceCountdown(null);
      handleSpace();
    }, 1200);
  }, [handleSpace]);

  const cancelHandDropAutoSpacing = useCallback(() => {
    if (autoSpaceTimerRef.current) {
      clearTimeout(autoSpaceTimerRef.current);
      autoSpaceTimerRef.current = null;
    }
    if (autoSpaceIntervalRef.current) {
      clearInterval(autoSpaceIntervalRef.current);
      autoSpaceIntervalRef.current = null;
    }
    setAutoSpaceCountdown(null);
  }, []);

  // MANUAL TRANSLATE & SPEAK: Only speaks when user clicks "Translate" or presses Enter
  const handleTranslate = useCallback(async () => {
    // If user has an unspaced word in currentWord, commit it first cleanly
    if (currentWordRef.current.trim()) {
      await handleSpace();
    }

    // Delay slightly to let state settle and vocalize full sentence
    setTimeout(() => {
      setSentence((latest) => {
        if (latest.trim()) {
          speechService.speakText(latest.trim(), true);
        }
        return latest;
      });
    }, 120);
  }, [handleSpace]);

  // Keyboard shortcuts: Enter = Translate & Speak, Spacebar = Space, Backspace = Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        handleTranslate();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleSpace();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTranslate, handleSpace]);

  // Core MediaPipe Hand Processing + 2s Hold / 1s Cooldown State Machine
  useEffect(() => {
    handDetector.setListener((landmarks) => {
      // FPS calculation
      frameCountRef.current += 1;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear previous overlay
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Handle 1-Second Cooldown Phase
      if (cycleStateRef.current === 'COOLDOWN') {
        const elapsedCooldown = now - cooldownStartRef.current;
        if (elapsedCooldown < COOLDOWN_DURATION_MS) {
          const progress = Math.min(100, Math.round((elapsedCooldown / COOLDOWN_DURATION_MS) * 100));
          const remaining = Math.max(0, Math.round((COOLDOWN_DURATION_MS - elapsedCooldown) / 100) / 10);
          setCooldownProgress(progress);
          setCooldownRemainingSeconds(remaining);

          // Render skeleton even during cooldown for visual continuity
          if (landmarks && landmarks.length >= 21) {
            aslClassifier.drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
          }
          return;
        } else {
          // Cooldown finished! Return to IDLE
          cycleStateRef.current = 'IDLE';
          setPhase('IDLE');
          setCooldownProgress(100);
          setCooldownRemainingSeconds(0);
        }
      }

      // MODE B: Complete ASL Word Recognition (Single-Sign Temporal Trajectories)
      if (recognitionModeRef.current === 'word') {
        if (landmarks && landmarks.length >= 21) {
          setHandDetected(true);
          aslWordClassifier.pushFrame(landmarks);
          aslClassifier.drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

          aslWordClassifier.classifyLiveWord().then((wRes) => {
            if (!wRes) return;
            setWordResult(wRes);

            if (cycleStateRef.current === 'COOLDOWN') return;

            if (wRes.word && wRes.confidence >= 60.0) {
              if (cycleStateRef.current === 'IDLE') {
                cycleStateRef.current = 'HOLDING';
                holdStartRef.current = now;
                wordVotesRef.current = { [wRes.word]: 1 };
                setPhase('HOLDING');
                setHoldProgress(0);
                setHoldRemainingSeconds(3.0);
              } else if (cycleStateRef.current === 'HOLDING') {
                wordVotesRef.current[wRes.word] = (wordVotesRef.current[wRes.word] || 0) + 1;
                const elapsed = now - holdStartRef.current;
                const progress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
                const remaining = Math.max(0, Math.round((HOLD_DURATION_MS - elapsed) / 100) / 10);
                setHoldProgress(progress);
                setHoldRemainingSeconds(remaining);

                if (elapsed >= HOLD_DURATION_MS) {
                  const votes = wordVotesRef.current;
                  let winnerWord = wRes.word;
                  let maxV = 0;
                  for (const w in votes) {
                    if (votes[w] > maxV) {
                      maxV = votes[w];
                      winnerWord = w;
                    }
                  }

                  setLastCommittedWord(winnerWord);

                  // Directly commit complete word into sentence
                  setSentence((prev) => {
                    const words = prev.trim().split(/\s+/).filter(Boolean);
                    if (words.length > 0 && words[words.length - 1] === winnerWord) {
                      return prev;
                    }
                    return prev ? `${prev} ${winnerWord}` : winnerWord;
                  });

                  // Voice output for the recognized word
                  speechService.speakText(winnerWord);

                  // Enter 2s cooldown to relax hand & prevent repeat
                  cycleStateRef.current = 'COOLDOWN';
                  cooldownStartRef.current = now;
                  setPhase('COOLDOWN');
                  setCooldownProgress(0);
                  setCooldownRemainingSeconds(2.0);
                  setHoldProgress(100);
                  wordVotesRef.current = {};
                  aslWordClassifier.clearBuffer();
                }
              }
            } else {
              if (cycleStateRef.current === 'HOLDING') {
                cycleStateRef.current = 'IDLE';
                setPhase('IDLE');
                setHoldProgress(0);
                setHoldRemainingSeconds(3.0);
                wordVotesRef.current = {};
              }
            }
          });
        } else {
          setHandDetected(false);
          setWordResult(null);
          aslWordClassifier.pushFrame(null);
          if (cycleStateRef.current === 'HOLDING') {
            cycleStateRef.current = 'IDLE';
            setPhase('IDLE');
            setHoldProgress(0);
            setHoldRemainingSeconds(3.0);
            wordVotesRef.current = {};
          }
        }
        return;
      }

      // MODE A: ASL Alphabet Fingerspelling (A–Z)
      if (landmarks && landmarks.length >= 21) {
        setHandDetected(true);

        // 1. Draw glowing joints and bones (hand skeleton)
        aslClassifier.drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

        // 2. Classify gesture with human-friendly geometry
        const classification = aslClassifier.classify(landmarks);
        setResult(classification);

        // If hand is resting, lowered, or moving fast:
        if (classification.isResting || classification.isTransition || !classification.letter) {
          if (cycleStateRef.current === 'HOLDING') {
            // Hand dropped during hold: safely reset
            cycleStateRef.current = 'IDLE';
            setPhase('IDLE');
            setHoldProgress(0);
            setHoldRemainingSeconds(3.0);
            sampleVotesRef.current = {};
          }

          if (classification.isResting && currentWordRef.current.trim().length > 0) {
            triggerHandDropAutoSpacing();
          }
          return;
        }

        // Active sign detected: cancel hand-drop auto-space timer
        cancelHandDropAutoSpacing();

        // 3. 3-Second Hold Capture State Machine
        if (cycleStateRef.current === 'IDLE') {
          // Begin 3-second hold window
          cycleStateRef.current = 'HOLDING';
          holdStartRef.current = now;
          sampleVotesRef.current = { [classification.letter]: 1 };
          setPhase('HOLDING');
          setHoldProgress(0);
          setHoldRemainingSeconds(3.0);
        } else if (cycleStateRef.current === 'HOLDING') {
          // Accumulate predictions across the 3-second window
          sampleVotesRef.current[classification.letter] = (sampleVotesRef.current[classification.letter] || 0) + 1;

          const elapsed = now - holdStartRef.current;
          const progress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
          const remaining = Math.max(0, Math.round((HOLD_DURATION_MS - elapsed) / 100) / 10);

          setHoldProgress(progress);
          setHoldRemainingSeconds(remaining);

          // Once held for 3.0 full seconds: PREDICT WHAT WAS SAID & LOCK IN
          if (elapsed >= HOLD_DURATION_MS) {
            // Find winning character with highest votes during the 3s window
            const votes = sampleVotesRef.current;
            let winner = classification.letter;
            let maxVotes = 0;
            for (const char in votes) {
              if (votes[char] > maxVotes) {
                maxVotes = votes[char];
                winner = char;
              }
            }

            setLastCommittedChar(winner);

            // Commit character (SILENTLY - NO AUTO SPEAK)
            if (winner === ' ') {
              handleSpace();
            } else {
              currentWordRef.current += winner;
              setCurrentWord(currentWordRef.current);
            }

            // Immediately enter 2-Second Cooldown Phase (NO INPUTS ACCEPTED)
            cycleStateRef.current = 'COOLDOWN';
            cooldownStartRef.current = now;
            setPhase('COOLDOWN');
            setCooldownProgress(0);
            setCooldownRemainingSeconds(2.0);
            setHoldProgress(100);
            sampleVotesRef.current = {};
          }
        }
      } else {
        // No hand in camera view:
        setHandDetected(false);
        setResult(null);

        if (cycleStateRef.current === 'HOLDING') {
          cycleStateRef.current = 'IDLE';
          setPhase('IDLE');
          setHoldProgress(0);
          setHoldRemainingSeconds(3.0);
          sampleVotesRef.current = {};
        }

        if (currentWordRef.current.trim().length > 0) {
          triggerHandDropAutoSpacing();
        }
      }
    });
  }, [handleSpace, triggerHandDropAutoSpacing, cancelHandDropAutoSpacing]);

  const startCamera = async (overrideFacing?: 'user' | 'environment') => {
    setCameraError(null);
    const targetFacing = overrideFacing || facingMode;
    try {
      if (videoRef.current) {
        if (canvasRef.current) {
          canvasRef.current.width = 640;
          canvasRef.current.height = 480;
        }
        await handDetector.start(videoRef.current, 640, 480, targetFacing);
        setIsActive(true);
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError('Camera access denied or unavailable. Grant camera permission or check HTTPS status.');
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    handDetector.stop();
    setIsActive(false);
    setHandDetected(false);
    setResult(null);
    cycleStateRef.current = 'IDLE';
    setPhase('IDLE');
    setHoldProgress(0);
    setCooldownProgress(0);
    cancelHandDropAutoSpacing();
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isActive) {
      startCamera(nextMode);
    }
  };

  const handleBackspace = () => {
    if (currentWordRef.current.length > 0) {
      currentWordRef.current = currentWordRef.current.slice(0, -1);
      setCurrentWord(currentWordRef.current);
    } else if (sentence.length > 0) {
      setSentence((prev) => {
        const words = prev.trim().split(/\s+/).filter(Boolean);
        words.pop();
        return words.join(' ');
      });
    }
  };

  const handleClear = () => {
    currentWordRef.current = '';
    setCurrentWord('');
    setSentence('');
    setSuggestions([]);
    cancelHandDropAutoSpacing();
  };

  const handleCopy = () => {
    const fullText = [sentence, currentWord].filter(Boolean).join(' ');
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSentence = async () => {
    const fullText = [sentence, currentWord].filter(Boolean).join(' ');
    if (!fullText) return;
    try {
      await api.saveSentence(fullText);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const fullDisplaySentence = [sentence, currentWord].filter(Boolean).join(' ');

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4">
      {/* Top Banner & Mode Info */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                SIGNify
              </span>
              <span className="text-gray-300">ASL Translator</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PC & MOBILE VERIFIED
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            3s hold to predict • 2s cooldown to take hand down (no inputs accepted) • Single-word guaranteed
          </p>
        </div>

        {/* Controls Ribbon */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Mode Switcher */}
          <div className="flex items-center p-1 bg-gray-950 border border-gray-800 rounded-2xl shadow-inner">
            <button
              onClick={() => handleModeChange('alphabet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                recognitionMode === 'alphabet'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mode A: Alphabet (A–Z)
            </button>
            <button
              onClick={() => handleModeChange('word')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                recognitionMode === 'word'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mode B: Complete Words (20 Signs)
            </button>
          </div>

          {/* Word Signs Guide Button */}
          <button
            onClick={() => setShowWordGuide(!showWordGuide)}
            className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Word Signs (20)</span>
          </button>

          {/* Mobile Phone Connection Pill */}
          <button
            onClick={() => setShowMobileModal(!showMobileModal)}
            className="px-3.5 py-2 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Open on Mobile</span>
          </button>

          {/* ASL Alphabet Reference Guide Button */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Alphabet Guide</span>
          </button>

          {/* Camera Switcher (Front / Back for Mobile) */}
          <button
            onClick={toggleFacingMode}
            title={`Switch to ${facingMode === 'user' ? 'Rear' : 'Front'} Camera`}
            className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
          >
            <SwitchCamera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{facingMode === 'user' ? 'Front' : 'Rear'}</span>
          </button>

          {/* Start / Stop Button */}
          {!isActive ? (
            <button
              onClick={() => startCamera()}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Connect Helper Banner (Modal) */}
      {showMobileModal && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/80 to-blue-950/80 border border-indigo-500/40 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">How to Run on Mobile Phone</h3>
            </div>
            <button
              onClick={() => setShowMobileModal(false)}
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1 bg-gray-900 rounded-lg cursor-pointer"
            >
              Close ✕
            </button>
          </div>
          <div className="text-xs text-gray-300 space-y-2">
            <p>
              1. Connect your mobile phone to the <strong>same Wi-Fi network</strong> as your PC.
            </p>
            <p>
              2. Open Chrome (Android) or Safari (iOS) on your phone and go to:
            </p>
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 font-mono text-cyan-300 text-xs break-all flex items-center justify-between">
              <span>{mobileUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mobileUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-lg text-white font-sans text-[11px] font-bold cursor-pointer ml-2 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="flex items-start space-x-2 text-[11px] text-amber-300/90 pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>HTTPS Note:</strong> Because this uses secure HTTPS for webcam access, your phone browser will show a standard local certificate warning. Simply tap <strong>"Advanced"</strong> and then <strong>"Proceed / Continue"</strong>. Then allow camera permissions!
              </span>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{cameraError}</span>
          <button onClick={() => startCamera()} className="px-3 py-1 bg-amber-500/20 rounded-lg font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Main Translation Stage (Responsive: Stacks on mobile, splits on PC) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video & Skeleton Overlay Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-[4/3] rounded-3xl bg-gray-950 border border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Native Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${!isActive ? 'hidden' : ''}`}
            />

            {/* Glowing Hand Skeleton Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${!isActive ? 'hidden' : ''}`}
            />

            {!isActive && (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-gray-500">
                  <CameraOff className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-200">Camera Ready</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Click "Start Camera" to begin. Compatible on PC and mobile phones!
                </p>
                <button
                  onClick={() => startCamera()}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Activate Camera</span>
                </button>
              </div>
            )}

            {/* Live Badges */}
            {isActive && (
              <>
                <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      phase === 'COOLDOWN'
                        ? 'bg-amber-400 animate-pulse'
                        : phase === 'HOLDING'
                        ? 'bg-cyan-400 animate-pulse'
                        : handDetected
                        ? 'bg-emerald-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-semibold text-white">
                    {phase === 'COOLDOWN'
                      ? `Cooling down (${cooldownRemainingSeconds.toFixed(1)}s)`
                      : phase === 'HOLDING'
                      ? `Holding Sign (${holdRemainingSeconds.toFixed(1)}s)`
                      : handDetected
                      ? 'Hand Ready'
                      : 'Show Hand in Frame'}
                  </span>
                </div>

                <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-cyan-300">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{fps} FPS</span>
                </div>

                {/* Status Callout Pill on Video */}
                {phase === 'HOLDING' && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-2xl bg-cyan-600/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 border border-white/20 whitespace-nowrap">
                    <Clock className="w-4 h-4 text-white animate-spin" />
                    <span>Predicting in {holdRemainingSeconds.toFixed(1)}s — keep holding sign</span>
                  </div>
                )}

                {phase === 'COOLDOWN' && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-2xl bg-amber-600/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 border border-white/20 whitespace-nowrap">
                    <RotateCcw className="w-4 h-4 text-white animate-spin" />
                    <span>Cool-down ({cooldownRemainingSeconds.toFixed(1)}s) — take hand down / relax (no inputs)</span>
                  </div>
                )}

                {isSpeaking && (
                  <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg animate-bounce">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span>Translating & Speaking...</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="text-[11px] text-gray-400 px-2 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Camera: {facingMode === 'user' ? 'Front' : 'Rear'} • 3s Hold / 2s Cooldown</span>
            </span>
            <span className="text-cyan-400 font-semibold">Press Enter to Translate</span>
          </div>
        </div>

        {/* Right: Detected Sign, 3s Hold & 2s Cooldown Progress Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Large Letter Card */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Live Detected Sign
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {phase === 'HOLDING' ? 'SAMPLING 3s' : phase === 'COOLDOWN' ? 'COOLDOWN 2s' : 'READY'}
              </span>
            </div>

            {/* Giant Letter or Word & High Confidence Display */}
            <div className="flex items-center justify-between my-2">
              <div className="flex items-baseline space-x-4">
                <div className={`${recognitionMode === 'word' ? 'text-4xl sm:text-5xl' : 'text-8xl'} font-black tracking-tight text-white font-mono bg-gradient-to-br from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent break-all`}>
                  {recognitionMode === 'word'
                    ? phase === 'COOLDOWN'
                      ? lastCommittedWord || '—'
                      : wordResult?.word || '—'
                    : phase === 'COOLDOWN'
                    ? lastCommittedChar || '—'
                    : result?.isResting
                    ? '—'
                    : result?.letter === ' '
                    ? '␣'
                    : result?.letter || '—'}
                </div>
                {recognitionMode === 'word' ? (
                  handDetected && wordResult && wordResult.word && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400">Confidence</div>
                      <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                        {wordResult.confidence.toFixed(1)}%
                      </div>
                    </div>
                  )
                ) : (
                  handDetected && result && !result.isResting && result.letter && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400">Confidence</div>
                      <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                        {result.confidence.toFixed(1)}%
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Status Pill */}
              <div className="flex flex-col items-end space-y-1">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    phase === 'COOLDOWN'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : phase === 'HOLDING'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-gray-800 text-gray-300 border border-gray-700'
                  }`}
                >
                  {phase === 'COOLDOWN'
                    ? `COOL-DOWN ${cooldownRemainingSeconds.toFixed(1)}s`
                    : phase === 'HOLDING'
                    ? `HOLDING ${holdProgress}%`
                    : 'READY'}
                </span>

                {(recognitionMode === 'word' ? lastCommittedWord : lastCommittedChar) && (
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Last: "{recognitionMode === 'word' ? lastCommittedWord : lastCommittedChar}" locked
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bars: 3s Hold & 2s Cooldown */}
            {phase === 'HOLDING' && (
              <div className="space-y-1 my-2">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span className="text-cyan-300 font-semibold">
                    {recognitionMode === 'word' ? 'Sign Hold Progress (3.0s Hold)' : 'Hold Progress (3.0s Hold)'}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{holdRemainingSeconds.toFixed(1)}s left</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-950 border border-cyan-500/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-75"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'COOLDOWN' && (
              <div className="space-y-1 my-2">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span className="text-amber-300 font-semibold">Cool-down (2.0s) — Take Hand Down / Relax</span>
                  <span className="font-mono text-amber-400 font-bold">{cooldownRemainingSeconds.toFixed(1)}s left</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-950 border border-amber-500/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-75"
                    style={{ width: `${cooldownProgress}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'IDLE' && (
              <div className="space-y-1 my-2 text-[11px] text-gray-400">
                <span>
                  {recognitionMode === 'word'
                    ? 'Hold single ASL sign steadily to predict complete word'
                    : 'Hold any sign steadily for 3 seconds to predict letter'}
                </span>
                <div className="h-2 rounded-full bg-gray-950 border border-gray-800" />
              </div>
            )}

            {/* Gesture Structure Explanation */}
            <div className="mt-3 p-3 rounded-2xl bg-gray-950/80 border border-gray-800 text-xs text-gray-300">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Gesture Analysis</div>
              <div className="font-semibold text-white mt-0.5">
                {phase === 'COOLDOWN'
                  ? 'Cool-down active: lower or relax hand without taking any inputs'
                  : recognitionMode === 'word'
                  ? wordResult?.description || 'Perform ASL sign in view of camera'
                  : result?.gestureDescription || 'Position hand in front of camera to begin'}
              </div>
            </div>
          </div>

          {/* Top 3 Predictions Bar */}
          <div className="p-5 rounded-3xl bg-[#111827] border border-gray-800 shadow-xl space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Candidate Matches</span>
              <span className="text-[10px] text-gray-500 font-mono">
                {recognitionMode === 'word' ? 'Temporal Bi-LSTM' : '3D Joint Vector'}
              </span>
            </h3>

            <div className="space-y-2">
              {recognitionMode === 'word' ? (
                (wordResult?.top3 && wordResult.top3.length > 0
                  ? wordResult.top3
                  : [
                      { word: 'HELLO', confidence: 0 },
                      { word: 'THANK YOU', confidence: 0 },
                      { word: 'PLEASE', confidence: 0 },
                    ]
                ).map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white font-mono">
                        Word "{p.word}"
                      </span>
                      <span className="text-gray-400 font-mono">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          idx === 0 ? 'bg-cyan-500' : idx === 1 ? 'bg-indigo-500' : 'bg-gray-600'
                        }`}
                        style={{ width: `${p.confidence}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                (result?.top3 && result.top3.length > 0
                  ? result.top3
                  : [
                      { letter: 'L', confidence: 0 },
                      { letter: 'V', confidence: 0 },
                      { letter: 'W', confidence: 0 },
                    ]
                ).map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white font-mono">
                        {p.letter === ' ' ? 'SPACE (␣)' : `Sign "${p.letter}"`}
                      </span>
                      <span className="text-gray-400 font-mono">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : 'bg-gray-600'
                        }`}
                        style={{ width: `${p.confidence}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Spacing Notification Banner */}
      {autoSpaceCountdown !== null && currentWord && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-cyan-900/40 border border-blue-500/40 shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-300">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Hand Rested: Auto-spacing word "{currentWord}" in {autoSpaceCountdown.toFixed(1)}s
              </div>
              <div className="text-[11px] text-gray-400">
                Raise hand to continue spelling, or wait to complete word
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSpace()}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Space Now (␣)
            </button>
            <button
              onClick={cancelHandDropAutoSpacing}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold cursor-pointer"
            >
              Keep Editing
            </button>
          </div>
        </div>
      )}

      {/* Bottom: Translated Words, Suggestions & TRANSLATE & SPEAK Button */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-gray-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Assembled Text & Translation Engine
            </h2>
          </div>

          {/* Prominent Translate & Speak Button */}
          <button
            onClick={handleTranslate}
            disabled={!fullDisplaySentence.trim()}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Translate & Speak</span>
          </button>
        </div>

        {/* Word Suggestions Chips */}
        {suggestions.length > 0 && (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Suggestions:</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSpace(sug)}
                  className="px-3 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>{sug}</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Big Word / Sentence Display Ribbon */}
        <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 min-h-[4.5rem] flex items-center justify-between">
          <div className="text-2xl sm:text-3xl font-mono text-white tracking-wider break-all">
            {fullDisplaySentence ? (
              <span>
                {sentence}{' '}
                <span className="text-blue-400 font-bold underline decoration-blue-500/50">
                  {currentWord}
                </span>
                <span className="animate-pulse text-blue-400">|</span>
              </span>
            ) : (
              <span className="text-gray-600 text-sm font-sans italic">
                Hold sign for 2 seconds to type each letter. Click "Translate & Speak" when finished...
              </span>
            )}
          </div>

          {fullDisplaySentence && (
            <button
              onClick={handleCopy}
              title="Copy translation"
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 ml-4 shrink-0 transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Translation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSpace()}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition-all cursor-pointer shadow-sm"
            >
              Space (␣)
            </button>
            <button
              onClick={handleBackspace}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition-all cursor-pointer shadow-sm"
            >
              Backspace (⌫)
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={handleSaveSentence}
              disabled={!fullDisplaySentence.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Save Text</span>
            </button>
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={!fullDisplaySentence.trim()}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-40 flex items-center space-x-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Translate & Speak</span>
          </button>
        </div>
      </div>

      {/* ASL Alphabet Visual Reference Guide Modal */}
      {showGuide && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-blue-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">ASL Fingerspelling Hand Pose Reference</h3>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-xs text-gray-400 hover:text-white font-bold px-3 py-1 bg-gray-800 rounded-lg cursor-pointer"
            >
              Close Guide ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(ASL_GUIDE).map(([char, description]) => (
              <div
                key={char}
                onClick={() => {
                  if (char === ' ') {
                    handleSpace();
                  } else {
                    currentWordRef.current += char;
                    setCurrentWord(currentWordRef.current);
                  }
                }}
                className="p-3 rounded-2xl bg-gray-950 border border-gray-800 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all cursor-pointer group"
              >
                <div className="text-2xl font-black text-white font-mono group-hover:text-blue-400">
                  {char === ' ' ? 'SPACE (␣)' : char}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 leading-snug line-clamp-3">
                  {description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASL Word Vocabulary Visual Reference Guide Modal */}
      {showWordGuide && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-cyan-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-bold text-white">ASL Complete Word Sign Lexicon (20 Target Classes)</h3>
                <p className="text-xs text-gray-400">Genuine WLASL trained word vocabulary. Tap any word to insert & hear pronunciation.</p>
              </div>
            </div>
            <button
              onClick={() => setShowWordGuide(false)}
              className="text-xs text-gray-400 hover:text-white font-bold px-3 py-1 bg-gray-800 rounded-lg cursor-pointer"
            >
              Close Lexicon ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(vocabularyList.length > 0
              ? vocabularyList
              : [
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
                ]
            ).map((item: any) => (
              <div
                key={item.word}
                onClick={() => {
                  setSentence((prev) => {
                    const words = prev.trim().split(/\s+/).filter(Boolean);
                    if (words.length > 0 && words[words.length - 1] === item.word) return prev;
                    return prev ? `${prev} ${item.word}` : item.word;
                  });
                  speechService.speakText(item.word);
                }}
                className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all cursor-pointer group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-white font-mono group-hover:text-cyan-300">
                    {item.word}
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {item.two_handed === 'Yes' || item.two_handed === 'Yes (Bimanual)' ? 'Bimanual' : 'Single Hand'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-300 leading-snug">
                  {item.description}
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="text-gray-400 font-semibold">Shape:</span> {item.handshape}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
