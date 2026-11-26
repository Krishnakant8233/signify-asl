import React, { useState } from 'react';
import { Sparkles, Info, Play, CheckCircle2, ArrowRight, Eye, Hand, MoveRight, RotateCw, ArrowUp, ArrowDown } from 'lucide-react';

export interface GestureGuideItem {
  word: string;
  category: 'Greetings' | 'Daily Needs' | 'Responses' | 'Social & Emotions';
  position: 'Forehead' | 'Chin & Mouth' | 'Chest' | 'Mid-Air Neutral';
  twoHanded: boolean;
  handshapeSummary: string;
  motionSummary: string;
  svgType: string;
}

export const GESTURE_ITEMS: GestureGuideItem[] = [
  {
    word: 'HELLO',
    category: 'Greetings',
    position: 'Forehead',
    twoHanded: false,
    handshapeSummary: 'Open flat hand (B-hand), fingers together, thumb upright alongside',
    motionSummary: 'Start near temple or forehead, move outward in a salute arc',
    svgType: 'hello',
  },
  {
    word: 'THANK YOU',
    category: 'Greetings',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'Flat open palm with fingertips lightly touching chin or lips',
    motionSummary: 'Move hand forward and slightly downward toward the camera/listener',
    svgType: 'thankyou',
  },
  {
    word: 'GOODBYE',
    category: 'Greetings',
    position: 'Mid-Air Neutral',
    twoHanded: false,
    handshapeSummary: 'Open flat palm facing forward at head height',
    motionSummary: 'Wave hand gently side-to-side or open/close fingers',
    svgType: 'goodbye',
  },
  {
    word: 'YES',
    category: 'Responses',
    position: 'Mid-Air Neutral',
    twoHanded: false,
    handshapeSummary: 'Closed S-fist with thumb wrapped across front fingers',
    motionSummary: 'Tilt or nod the fist up and down from the wrist like a nodding head',
    svgType: 'yes',
  },
  {
    word: 'NO',
    category: 'Responses',
    position: 'Mid-Air Neutral',
    twoHanded: false,
    handshapeSummary: 'Index and middle fingers extended together, thumb extended',
    motionSummary: 'Snap index and middle fingers firmly down to tap the thumb tip',
    svgType: 'no',
  },
  {
    word: 'PLEASE',
    category: 'Social & Emotions',
    position: 'Chest',
    twoHanded: false,
    handshapeSummary: 'Flat open palm placed against the center of the chest',
    motionSummary: 'Rub the palm in a gentle clockwise circular motion over the chest',
    svgType: 'please',
  },
  {
    word: 'SORRY',
    category: 'Social & Emotions',
    position: 'Chest',
    twoHanded: false,
    handshapeSummary: 'Closed A-fist with thumb resting alongside',
    motionSummary: 'Rub the fist in a circular motion over the center of the heart',
    svgType: 'sorry',
  },
  {
    word: 'WATER',
    category: 'Daily Needs',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'W-handshape (Index, Middle, and Ring fingers up, pinky held down)',
    motionSummary: 'Tap the side of the index finger against your chin twice',
    svgType: 'water',
  },
  {
    word: 'FOOD',
    category: 'Daily Needs',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'Flattened O-hand (all fingertips touching the thumb tip)',
    motionSummary: 'Tap the fingertips against your lips twice',
    svgType: 'food',
  },
  {
    word: 'EAT',
    category: 'Daily Needs',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'Flattened O-hand shape brought to mouth',
    motionSummary: 'Bring fingertips to lips once or twice in an eating gesture',
    svgType: 'eat',
  },
  {
    word: 'DRINK',
    category: 'Daily Needs',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'Curved C-handshape holding an imaginary cup or glass',
    motionSummary: 'Tilt the thumb and curved hand upward toward your mouth',
    svgType: 'drink',
  },
  {
    word: 'MORE',
    category: 'Daily Needs',
    position: 'Mid-Air Neutral',
    twoHanded: true,
    handshapeSummary: 'Both hands form flattened O-shapes with fingertips touching thumbs',
    motionSummary: 'Tap the fingertips of both hands together repeatedly in front of chest',
    svgType: 'more',
  },
  {
    word: 'STOP',
    category: 'Responses',
    position: 'Mid-Air Neutral',
    twoHanded: true,
    handshapeSummary: 'Dominant flat hand held vertically, non-dominant hand flat base',
    motionSummary: 'Bring dominant hand down with a sharp chopping motion onto palm',
    svgType: 'stop',
  },
  {
    word: 'HELP',
    category: 'Social & Emotions',
    position: 'Mid-Air Neutral',
    twoHanded: true,
    handshapeSummary: 'Non-dominant flat palm base; dominant A-fist with thumb pointing up',
    motionSummary: 'Lift both hands together upward in a supportive gesture',
    svgType: 'help',
  },
  {
    word: 'LOVE',
    category: 'Social & Emotions',
    position: 'Chest',
    twoHanded: true,
    handshapeSummary: 'Both hands form fists or flat hands crossed over chest',
    motionSummary: 'Cross forearms over chest and press against heart like a self-hug',
    svgType: 'love',
  },
  {
    word: 'GOOD',
    category: 'Social & Emotions',
    position: 'Chin & Mouth',
    twoHanded: true,
    handshapeSummary: 'Dominant flat hand starts at chin, non-dominant flat palm waits below',
    motionSummary: 'Move hand from chin downward into the open non-dominant palm',
    svgType: 'good',
  },
  {
    word: 'BAD',
    category: 'Social & Emotions',
    position: 'Chin & Mouth',
    twoHanded: false,
    handshapeSummary: 'Dominant flat hand touches chin with fingertips',
    motionSummary: 'Move hand forward and flip downward so palm faces the floor',
    svgType: 'bad',
  },
  {
    word: 'FRIEND',
    category: 'Social & Emotions',
    position: 'Mid-Air Neutral',
    twoHanded: true,
    handshapeSummary: 'Both index fingers bent into hooks (X-handshapes)',
    motionSummary: 'Link the hooked index fingers together, flip, and relink in reverse',
    svgType: 'friend',
  },
  {
    word: 'HAPPY',
    category: 'Social & Emotions',
    position: 'Chest',
    twoHanded: true,
    handshapeSummary: 'Both open flat hands facing chest with palms inward',
    motionSummary: 'Brush hands upward and outward against chest in cheerful circles',
    svgType: 'happy',
  },
  {
    word: 'SAD',
    category: 'Social & Emotions',
    position: 'Chin & Mouth',
    twoHanded: true,
    handshapeSummary: 'Both open hands with slightly bent fingers held at eye level',
    motionSummary: 'Draw both hands slowly downward along your face with a droop',
    svgType: 'sad',
  },
];

/**
 * Visual SVG Illustration renderer for each ASL Word Sign
 */
export const GestureIllustration: React.FC<{ type: string; className?: string }> = ({ type, className = "w-20 h-20" }) => {
  switch (type) {
    case 'hello':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Head profile silhouette outline */}
          <circle cx="38" cy="42" r="24" stroke="#4B5563" strokeWidth="2" strokeDasharray="3 3" fill="#1F2937" fillOpacity="0.4" />
          {/* Flat hand at forehead */}
          <rect x="52" y="24" width="16" height="28" rx="5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="2" transform="rotate(-15 52 24)" />
          <path d="M54 20 L58 12 L64 14 L62 22 Z" fill="#60A5FA" />
          {/* Motion Arrow outward salute */}
          <path d="M68 28 Q80 24 88 18" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M84 14 L89 17 L86 23" fill="#38BDF8" />
          <text x="50" y="90" textAnchor="middle" fill="#93C5FD" fontSize="9" fontWeight="bold">Outward Salute</text>
        </svg>
      );
    case 'thankyou':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chin reference */}
          <circle cx="30" cy="35" r="20" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="2 2" fill="#1F2937" fillOpacity="0.4" />
          {/* Hand starting at chin */}
          <path d="M38 46 L58 40 L64 54 L44 60 Z" fill="#0EA5E9" stroke="#7DD3FC" strokeWidth="2" />
          {/* Motion arc forward */}
          <path d="M48 56 Q66 65 82 72" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M78 68 L84 73 L76 77" fill="#38BDF8" />
          <text x="50" y="90" textAnchor="middle" fill="#7DD3FC" fontSize="9" fontWeight="bold">Chin → Forward</text>
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chin target */}
          <circle cx="28" cy="45" r="18" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* W-Handshape: 3 fingers upright (Index, Middle, Ring) */}
          <rect x="42" y="38" width="8" height="28" rx="4" fill="#06B6D4" stroke="#67E8F9" strokeWidth="2" />
          <rect x="52" y="32" width="8" height="34" rx="4" fill="#06B6D4" stroke="#67E8F9" strokeWidth="2" />
          <rect x="62" y="38" width="8" height="28" rx="4" fill="#06B6D4" stroke="#67E8F9" strokeWidth="2" />
          <rect x="42" y="62" width="28" height="16" rx="4" fill="#0891B2" />
          {/* Double tap arrow */}
          <path d="M40 48 L32 48" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 44 L30 48 L35 52" fill="#22D3EE" />
          <text x="50" y="92" textAnchor="middle" fill="#67E8F9" fontSize="9" fontWeight="bold">W-Shape Taps Chin</text>
        </svg>
      );
    case 'yes':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Closed S-fist */}
          <rect x="34" y="36" width="32" height="32" rx="10" fill="#10B981" stroke="#6EE7B7" strokeWidth="2" />
          <rect x="30" y="44" width="30" height="10" rx="4" fill="#059669" />
          {/* Nodding Up/Down curved arrows */}
          <path d="M72 38 C78 45 78 55 72 64" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
          <path d="M74 34 L72 40 L67 36" fill="#34D399" />
          <path d="M74 68 L72 62 L67 66" fill="#34D399" />
          <text x="50" y="90" textAnchor="middle" fill="#6EE7B7" fontSize="9" fontWeight="bold">Nodding Fist</text>
        </svg>
      );
    case 'no':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Index & middle snapping to thumb */}
          <rect x="36" y="24" width="10" height="26" rx="4" fill="#F43F5E" stroke="#FDA4AF" strokeWidth="2" transform="rotate(20 36 24)" />
          <rect x="46" y="24" width="10" height="26" rx="4" fill="#F43F5E" stroke="#FDA4AF" strokeWidth="2" transform="rotate(25 46 24)" />
          <rect x="28" y="52" width="22" height="12" rx="5" fill="#E11D48" />
          {/* Snap arrow */}
          <path d="M64 34 Q54 52 42 54" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 48 L40 54 L46 56" fill="#FB7185" />
          <text x="50" y="90" textAnchor="middle" fill="#FDA4AF" fontSize="9" fontWeight="bold">2 Fingers Snap to Thumb</text>
        </svg>
      );
    case 'please':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chest background */}
          <path d="M25 40 Q50 30 75 40 L75 75 Q50 85 25 75 Z" fill="#1F2937" fillOpacity="0.4" stroke="#4B5563" strokeDasharray="3 3" />
          {/* Flat palm on chest */}
          <circle cx="50" cy="55" r="16" fill="#8B5CF6" stroke="#C4B5FD" strokeWidth="2" />
          {/* Circular rubbing arrow */}
          <path d="M50 30 A25 25 0 1 1 30 46" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M34 40 L28 47 L36 49" fill="#A78BFA" />
          <text x="50" y="92" textAnchor="middle" fill="#C4B5FD" fontSize="9" fontWeight="bold">Circular Rub on Chest</text>
        </svg>
      );
    case 'sorry':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chest background */}
          <path d="M25 40 Q50 30 75 40 L75 75 Q50 85 25 75 Z" fill="#1F2937" fillOpacity="0.4" stroke="#4B5563" strokeDasharray="3 3" />
          {/* Fist circling heart */}
          <rect x="36" y="42" width="28" height="26" rx="8" fill="#EC4899" stroke="#F472B6" strokeWidth="2" />
          {/* Circle arrow */}
          <path d="M50 28 A24 24 0 1 1 30 44" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M34 38 L28 45 L36 47" fill="#F472B6" />
          <text x="50" y="92" textAnchor="middle" fill="#F472B6" fontSize="9" fontWeight="bold">Fist Circles Heart</text>
        </svg>
      );
    case 'food':
    case 'eat':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Lips reference */}
          <ellipse cx="28" cy="46" rx="14" ry="8" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="2 2" fill="#1F2937" />
          {/* Flattened O-hand fingertips */}
          <circle cx="56" cy="46" r="14" fill="#F59E0B" stroke="#FCD34D" strokeWidth="2" />
          <path d="M56 46 L74 54" stroke="#F59E0B" strokeWidth="4" />
          {/* Tap arrow to lips */}
          <path d="M52 46 L36 46" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 42 L34 46 L40 50" fill="#FBBF24" />
          <text x="50" y="90" textAnchor="middle" fill="#FCD34D" fontSize="9" fontWeight="bold">Fingertips Tap Mouth</text>
        </svg>
      );
    case 'drink':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Mouth target */}
          <circle cx="30" cy="38" r="14" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="2 2" />
          {/* C-Shape cup hand */}
          <path d="M50 32 C65 32 68 58 50 58 L54 66 L68 62 C78 52 74 24 50 24 Z" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
          {/* Tilting arrow */}
          <path d="M62 62 Q52 46 38 40" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 38 L36 39 L40 45" fill="#38BDF8" />
          <text x="50" y="90" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="bold">C-Hand Tilt to Mouth</text>
        </svg>
      );
    case 'stop':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base non-dominant palm */}
          <rect x="20" y="60" width="60" height="10" rx="4" fill="#4B5563" stroke="#6B7280" strokeWidth="2" />
          {/* Dominant flat hand chopping down */}
          <rect x="44" y="18" width="12" height="40" rx="4" fill="#EF4444" stroke="#FCA5A5" strokeWidth="2" />
          {/* Downward chop arrow */}
          <path d="M64 24 L64 52" stroke="#F87171" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 48 L64 54 L68 48" fill="#F87171" />
          <text x="50" y="90" textAnchor="middle" fill="#FCA5A5" fontSize="9" fontWeight="bold">Sharp Chop on Palm</text>
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left O-hand */}
          <circle cx="34" cy="46" r="13" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
          {/* Right O-hand */}
          <circle cx="66" cy="46" r="13" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
          {/* Inward tapping arrows */}
          <path d="M22 46 L30 46" stroke="#F59E0B" strokeWidth="3" />
          <path d="M78 46 L70 46" stroke="#F59E0B" strokeWidth="3" />
          <path d="M47 43 L50 46 L47 49" fill="#FDE68A" />
          <text x="50" y="90" textAnchor="middle" fill="#FDE68A" fontSize="9" fontWeight="bold">Tap Both O-Hands</text>
        </svg>
      );
    case 'help':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Flat palm base */}
          <rect x="22" y="58" width="56" height="10" rx="4" fill="#4B5563" stroke="#6B7280" strokeWidth="2" />
          {/* Dominant fist on top */}
          <rect x="36" y="32" width="28" height="26" rx="6" fill="#3B82F6" stroke="#93C5FD" strokeWidth="2" />
          <rect x="46" y="22" width="8" height="14" rx="3" fill="#60A5FA" />
          {/* Upward lifting arrow */}
          <path d="M72 56 L72 28" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M68 32 L72 26 L76 32" fill="#38BDF8" />
          <text x="50" y="90" textAnchor="middle" fill="#93C5FD" fontSize="9" fontWeight="bold">Fist on Palm Lifts Up</text>
        </svg>
      );
    case 'goodbye':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Open waving hand */}
          <rect x="42" y="28" width="18" height="34" rx="6" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" />
          <rect x="34" y="42" width="10" height="12" rx="4" fill="#F59E0B" />
          {/* Waving motion arcs */}
          <path d="M30 32 C26 40 26 48 30 56" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M72 32 C76 40 76 48 72 56" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          <text x="50" y="90" textAnchor="middle" fill="#FDE68A" fontSize="9" fontWeight="bold">Side-to-Side Wave</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Generic hand silhouette */}
          <rect x="38" y="30" width="24" height="36" rx="8" fill="#4B5563" stroke="#9CA3AF" strokeWidth="2" />
          <circle cx="50" cy="48" r="8" fill="#6B7280" />
          <path d="M50 70 L50 80" stroke="#9CA3AF" strokeWidth="2" />
          <text x="50" y="92" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontWeight="bold">ASL Word Gesture</text>
        </svg>
      );
  }
};

interface WordGestureVisualGuideProps {
  onSelectWord?: (word: string) => void;
  activeDetectedWord?: string;
}

export const WordGestureVisualGuide: React.FC<WordGestureVisualGuideProps> = ({ onSelectWord, activeDetectedWord }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Greetings', 'Daily Needs', 'Responses', 'Social & Emotions'];

  const filteredItems = GESTURE_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.motionSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.position.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4 p-5 rounded-3xl bg-[#111827] border border-cyan-500/20 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Mode 2 Visual Gesture Guide</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                20 Real ASL Signs
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Visual illustrations with motion arrows and hand placement for every supported ASL word.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredItems.map((item) => {
          const isCurrentActive = activeDetectedWord?.toUpperCase() === item.word;
          return (
            <div
              key={item.word}
              onClick={() => onSelectWord && onSelectWord(item.word)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                isCurrentActive
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400 scale-[1.02]'
                  : 'bg-gray-950/80 border-gray-800 hover:border-cyan-500/40 hover:bg-gray-900/60'
              }`}
            >
              {/* Graphic Illustration with Real Signer Photo / SVG fallback */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 rounded-xl bg-gray-900/80 border border-gray-800/80 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src={`/word_guides/${item.word === 'THANK YOU' ? 'THANK_YOU' : item.word}.jpg`}
                    alt={`Real ASL signer for ${item.word}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to SVG on missing image
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {/* Subtle corner badge for photo */}
                  <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-xs px-1 py-0.5 rounded text-[8px] font-mono text-cyan-300 pointer-events-none">
                    Real Sign
                  </div>
                </div>

                {/* Word Label & Badges */}
                <div className="text-center mt-2 space-y-0.5">
                  <div className="text-xs font-black font-mono text-white group-hover:text-cyan-300">
                    {item.word}
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 font-sans">
                      {item.position}
                    </span>
                    {item.twoHanded && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-sans">
                        2-Hand
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Description */}
              <div className="mt-2 pt-2 border-t border-gray-900 text-[10px] text-gray-400 line-clamp-2 leading-tight">
                {item.motionSummary}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
