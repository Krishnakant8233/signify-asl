// High-Precision Hand Landmark ASL Classifier & Skeleton Visualizer
// Tolerant to natural human hand anatomical variations, hand drop/rest suppression,
// and real-time word boundary gesture detection.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface ClassificationResult {
  letter: string;
  confidence: number;
  top3: Array<{ letter: string; confidence: number }>;
  gestureDescription: string;
  isStable: boolean;
  isResting: boolean;
  isTransition: boolean;
  motionVelocity: number;
  isStill: boolean;
}

// 21 Joint Connections for rendering the hand skeleton (finger joints & bones)
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17]
];

// Helper: 3D Euclidean distance
function dist(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class ASLLandmarkClassifier {
  private history: string[] = [];
  private historySize = 5;
  private prevKeyPoints: Landmark[] | null = null;
  private prevTimestamp: number = 0;
  private smoothedMotion: number = 0.05;

  /**
   * Classifies 21 hand landmarks into ASL letters A-Z and SPACE.
   * Tracks joint stillness: waits until user stops adjusting and holds hand still.
   */
  public classify(landmarks: Landmark[]): ClassificationResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        letter: '',
        confidence: 0,
        top3: [],
        gestureDescription: 'No hand detected',
        isStable: false,
        isResting: true,
        isTransition: false,
        motionVelocity: 0,
        isStill: false,
      };
    }

    const now = Date.now();
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const middleMCP = landmarks[9];

    // Track displacement of 6 key anatomical points (wrist + 5 fingertips)
    const currentKeyPoints = [wrist, thumbTip, indexTip, middleTip, ringTip, pinkyTip];
    let instantMotion = 0;

    if (this.prevKeyPoints && this.prevKeyPoints.length === currentKeyPoints.length) {
      const dt = Math.max(1, now - this.prevTimestamp);
      const frameScale = dt / 16.6; // normalized to 60fps frame
      let sumDist = 0;
      for (let i = 0; i < currentKeyPoints.length; i++) {
        sumDist += dist(currentKeyPoints[i], this.prevKeyPoints[i]);
      }
      instantMotion = (sumDist / currentKeyPoints.length) / Math.max(0.5, frameScale);
    }
    this.prevKeyPoints = currentKeyPoints.map((p) => ({ ...p }));
    this.prevTimestamp = now;

    // Exponential smoothing for stable velocity
    this.smoothedMotion = this.smoothedMotion * 0.7 + instantMotion * 0.3;

    // Stillness threshold: < 0.016 indicates fixed/still hand ready to be recognized
    const isStill = this.smoothedMotion < 0.018;

    // -------------------------------------------------------------
    // 1. HAND DROP & REST POSE DETECTION (CRITICAL)
    // -------------------------------------------------------------
    const isPointingDown = (middleMCP.y - wrist.y) > 0.04 || (middleTip.y - wrist.y) > 0.12;
    const isAtBottomEdge = wrist.y > 0.88 || middleMCP.y > 0.88;
    const isTransition = this.smoothedMotion > 0.045;

    if (isPointingDown || isAtBottomEdge) {
      this.history = [];
      return {
        letter: '',
        confidence: 0,
        top3: [],
        gestureDescription: 'Hand resting / lowered (Ready to resume)',
        isStable: false,
        isResting: true,
        isTransition: false,
        motionVelocity: this.smoothedMotion,
        isStill: false,
      };
    }

    if (isTransition) {
      return {
        letter: '',
        confidence: 0,
        top3: [],
        gestureDescription: 'Adjusting hand shape... hold still when ready',
        isStable: false,
        isResting: false,
        isTransition: true,
        motionVelocity: this.smoothedMotion,
        isStill: false,
      };
    }

    // Complete Joint Anatomical Definitions
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const thumbCMC = landmarks[1];

    const indexDIP = landmarks[7];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];

    const middleDIP = landmarks[11];
    const middlePIP = landmarks[10];

    const ringDIP = landmarks[15];
    const ringPIP = landmarks[14];
    const ringMCP = landmarks[13];

    const pinkyDIP = landmarks[19];
    const pinkyPIP = landmarks[18];
    const pinkyMCP = landmarks[17];

    // Palm scale metric: distance from wrist to middle MCP
    const palmSize = Math.max(0.01, dist(wrist, middleMCP));

    // -------------------------------------------------------------
    // 2. FORGIVING ANATOMICAL METRICS
    // -------------------------------------------------------------
    // Use continuous extension ratios rather than strict hard cutoffs.
    // Natural human hands bend adjacent fingers involuntarily.
    const extRatio = (tip: Landmark, pip: Landmark) => dist(tip, wrist) / Math.max(0.001, dist(pip, wrist));

    const indexRatio = extRatio(indexTip, indexPIP);
    const middleRatio = extRatio(middleTip, middlePIP);
    const ringRatio = extRatio(ringTip, ringPIP);
    const pinkyRatio = extRatio(pinkyTip, pinkyPIP);

    // Continuous classification flags with human tolerance
    const indexExtended = indexRatio > 1.08;
    const middleExtended = middleRatio > 1.08;
    const ringExtended = ringRatio > 1.08;
    const pinkyExtended = pinkyRatio > 1.08;

    const indexCurled = indexRatio < 1.02;
    const middleCurled = middleRatio < 1.02;
    const ringCurled = ringRatio < 1.02;
    const pinkyCurled = pinkyRatio < 1.02;

    // Normalized distances between fingertips relative to palm size
    const dThumbIndex = dist(thumbTip, indexTip) / palmSize;
    const dThumbMiddle = dist(thumbTip, middleTip) / palmSize;
    const dThumbRing = dist(thumbTip, ringTip) / palmSize;
    const dThumbPinky = dist(thumbTip, pinkyTip) / palmSize;
    const dIndexMiddle = dist(indexTip, middleTip) / palmSize;
    const dMiddleRing = dist(middleTip, ringTip) / palmSize;
    const dRingPinky = dist(ringTip, pinkyTip) / palmSize;

    // Thumb extension relative to pinky MCP
    const thumbDistToPinky = dist(thumbTip, pinkyMCP) / palmSize;
    const thumbExtended = thumbDistToPinky > 0.85 && dist(thumbTip, indexMCP) > 0.4 * palmSize;
    const thumbUp = thumbTip.y < indexPIP.y;

    // Aggregated finger states
    const allFourExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;
    const allFourCurled = indexCurled && middleCurled && ringCurled && pinkyCurled;
    const threeUp = (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0);

    // Scores accumulator for candidate letters
    const scores: Record<string, { score: number; desc: string }> = {};

    const addScore = (char: string, weight: number, desc: string) => {
      scores[char] = {
        score: Math.min(0.99, (scores[char]?.score || 0) + weight),
        desc,
      };
    };

    // -------------------------------------------------------------
    // 3. HUMAN-FRIENDLY GESTURE MATCHING (A-Z + SPACE)
    // -------------------------------------------------------------

    // 'SPACE' -> All 5 fingers extended spread apart wide
    if (allFourExtended && thumbExtended && dIndexMiddle > 0.28 && dThumbIndex > 0.75) {
      addScore(' ', 0.98, 'Open Palm (Space gesture)');
    }

    // 'L' -> Index upright, Thumb extended out sideways ~90 degrees, others curled
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended && dThumbIndex > 0.65) {
      addScore('L', 0.98, 'Index & Thumb extended in L-shape');
    }

    // 'V' -> Index & Middle extended upright spread in V (peace sign), ring/pinky curled
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && dIndexMiddle > 0.28) {
      addScore('V', 0.97, 'Index and Middle in V-shape (Peace)');
    }

    // 'U' -> Index & Middle extended upright together (touching or close), ring/pinky curled
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && dIndexMiddle <= 0.32) {
      addScore('U', 0.96, 'Index and Middle extended together (U)');
    }

    // 'W' -> Index, Middle, Ring extended upright in W, pinky curled
    if (indexExtended && middleExtended && ringExtended && pinkyCurled) {
      addScore('W', 0.98, 'Three fingers extended in W-shape');
    }

    // 'B' -> Four fingers extended upright together, thumb folded across palm
    if (allFourExtended && dIndexMiddle < 0.4 && dMiddleRing < 0.4 && (!thumbExtended || dist(thumbTip, palmSize ? middleMCP : wrist) < 0.7 * palmSize)) {
      addScore('B', 0.97, 'Four fingers upright, thumb tucked (B)');
    }

    // 'D' -> Index extended straight up, thumb touching middle & ring fingers
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && (dThumbMiddle < 0.55 || dThumbIndex < 0.7)) {
      addScore('D', 0.96, 'Index pointing upright, thumb touching middle (D)');
    }

    // 'I' -> Pinky extended upright, other 3 fingers curled into fist, thumb across
    if (pinkyExtended && indexCurled && middleCurled && ringCurled && !thumbExtended) {
      addScore('I', 0.97, 'Pinky finger extended upright (I)');
    }

    // 'Y' -> Thumb and Pinky extended out wide (Hang Loose/Shaka), middle 3 curled
    if (pinkyExtended && thumbExtended && indexCurled && middleCurled && ringCurled && dThumbPinky > 0.95) {
      addScore('Y', 0.98, 'Thumb & Pinky extended wide (Hang Loose - Y)');
    }

    // 'F' -> Index tip touches Thumb tip forming circle, other 3 fingers (Middle, Ring, Pinky) extended upright
    if (middleExtended && ringExtended && pinkyExtended && dThumbIndex < 0.45) {
      addScore('F', 0.98, 'Index & Thumb forming circle, 3 fingers up (F)');
    }

    // 'C' -> Curved C-shape with all fingers and thumb (gap between thumb and fingers)
    if (!allFourCurled && !allFourExtended && dThumbIndex > 0.35 && dThumbIndex < 0.95 && Math.abs(indexTip.x - thumbTip.x) < 0.75 * palmSize) {
      addScore('C', 0.93, 'Curved hand forming C-shape');
    }

    // 'O' -> All fingertips touching or curved towards thumb tip in closed O-circle
    if (!allFourExtended && dThumbIndex < 0.38 && dThumbMiddle < 0.5 && dThumbRing < 0.65) {
      addScore('O', 0.96, 'Fingers touching thumb in O-ring');
    }

    // 'A' -> Closed fist with thumb resting alongside index finger (pointing up)
    if (allFourCurled && thumbUp && dist(thumbTip, indexMCP) < 0.65 * palmSize) {
      addScore('A', 0.96, 'Fist with thumb resting alongside index (A)');
    }

    // 'S' -> Closed fist with thumb wrapped across front of fingers
    if (allFourCurled && dist(thumbTip, middlePIP) < 0.45 * palmSize && !thumbUp) {
      addScore('S', 0.95, 'Fist with thumb wrapped across front (S)');
    }

    // 'E' -> Fingers curled down tightly with tips resting on folded thumb
    if (allFourCurled && indexTip.y > indexPIP.y && thumbTip.y >= indexTip.y - 0.1 * palmSize) {
      addScore('E', 0.94, 'Fingertips resting on folded thumb (E)');
    }

    // 'R' -> Index and Middle extended and crossed over
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && (dIndexMiddle < 0.22 || (indexTip.x - middleTip.x) * (indexMCP.x - middleMCP.x) < 0)) {
      addScore('R', 0.95, 'Index and Middle extended and crossed (R)');
    }

    // 'K' -> Index upright, Middle angled forward/up, Thumb between them
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && thumbTip.y < indexMCP.y && dThumbIndex < 0.55) {
      addScore('K', 0.94, 'Index & Middle upright with thumb between (K)');
    }

    // 'G' -> Index extended horizontally sideways, thumb parallel, other 3 curled
    if (indexExtended && middleCurled && ringCurled && pinkyCurled && Math.abs(indexTip.x - indexMCP.x) > Math.abs(indexTip.y - indexMCP.y) * 0.9) {
      addScore('G', 0.94, 'Index pointing sideways with thumb parallel (G)');
    }

    // 'H' -> Index and Middle extended horizontally sideways together
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && Math.abs(indexTip.x - indexMCP.x) > Math.abs(indexTip.y - indexMCP.y) * 0.9) {
      addScore('H', 0.95, 'Index & Middle pointing sideways together (H)');
    }

    // 'X' -> Index crooked / hooked at PIP, other 3 curled into fist
    if (middleCurled && ringCurled && pinkyCurled && indexPIP.y < indexMCP.y && indexTip.y >= indexPIP.y - 0.05 * palmSize) {
      addScore('X', 0.94, 'Index finger crooked into hook (X)');
    }

    // 'M' -> Three fingers (index, middle, ring) draped over thumb in fist
    if (allFourCurled && dist(thumbTip, ringMCP) < 0.45 * palmSize) {
      addScore('M', 0.93, 'Three fingers draped over thumb (M)');
    }

    // 'N' -> Two fingers (index, middle) draped over thumb in fist
    if (allFourCurled && dist(thumbTip, middleMCP) < 0.45 * palmSize && dist(thumbTip, ringMCP) >= 0.45 * palmSize) {
      addScore('N', 0.93, 'Two fingers draped over thumb (N)');
    }

    // 'T' -> Thumb tucked between index and middle in fist
    if (allFourCurled && dist(thumbTip, indexPIP) < 0.4 * palmSize && thumbTip.y < indexMCP.y) {
      addScore('T', 0.93, 'Thumb tucked between index & middle (T)');
    }

    // 'P' -> Similar to K but pointing downward/forward
    if (indexExtended && middleExtended && ringCurled && pinkyCurled && indexTip.y > indexMCP.y) {
      addScore('P', 0.92, 'Index and Middle pointing downward (P)');
    }

    // 'Q' -> Similar to G but pointing downward
    if (indexExtended && middleCurled && ringCurled && pinkyCurled && indexTip.y > indexMCP.y && thumbTip.y > indexMCP.y) {
      addScore('Q', 0.92, 'Index and thumb pointing downward (Q)');
    }

    // 'Z' -> Index pointing forward/up alone
    if (indexExtended && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
      addScore('Z', 0.91, 'Index finger pointing (Z)');
    }

    // Fallback: If no strict signature fired, find closest natural match
    if (Object.keys(scores).length === 0) {
      if (allFourCurled) {
        addScore('A', 0.88, 'Fist pose (A)');
      } else if (allFourExtended) {
        addScore('B', 0.89, 'Extended flat hand (B)');
      } else if (indexExtended && middleExtended) {
        addScore('V', 0.88, 'Two fingers upright (V)');
      } else if (indexExtended) {
        addScore('D', 0.86, 'Single finger pointing (D)');
      } else if (pinkyExtended) {
        addScore('I', 0.87, 'Pinky finger upright (I)');
      } else {
        addScore('C', 0.84, 'Curled hand shape (C)');
      }
    }

    // Sort by confidence
    const sorted = Object.entries(scores)
      .map(([letter, data]) => ({ letter, confidence: Math.round(data.score * 1000) / 10, desc: data.desc }))
      .sort((a, b) => b.confidence - a.confidence);

    const best = sorted[0];
    const top3 = sorted.slice(0, 3).map((item) => ({ letter: item.letter, confidence: item.confidence }));

    // Stabilization buffer
    this.history.push(best.letter);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    const matchesCount = this.history.filter((l) => l === best.letter).length;
    // Forgiving stabilization: 2 matches out of last 5 is enough for responsive typing
    const isStable = matchesCount >= 2;

    return {
      letter: best.letter,
      confidence: best.confidence,
      top3,
      gestureDescription: best.desc,
      isStable,
      isResting: false,
      isTransition: false,
      motionVelocity: this.smoothedMotion,
      isStill,
    };
  }

  /**
   * Visualizes the complete hand structure on HTML5 Canvas:
   * - Connects the finger bones with glowing gradient lines
   * - Highlights every individual joint with colored, bordered circles
   * - Draws fingertips with bright neon accents
   */
  public drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: Landmark[], width: number, height: number): void {
    if (!landmarks || landmarks.length < 21) return;

    ctx.save();

    // 1. Draw connecting bones (Hand skeleton)
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      const x1 = p1.x * width;
      const y1 = p1.y * height;
      const x2 = p2.x * width;
      const y2 = p2.y * height;

      // Glowing bone lines
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      // Color based on finger
      if (startIdx <= 4 && endIdx <= 4) {
        ctx.strokeStyle = '#F59E0B'; // Amber for Thumb
      } else if (startIdx <= 8 && endIdx <= 8) {
        ctx.strokeStyle = '#3B82F6'; // Blue for Index
      } else if (startIdx <= 12 && endIdx <= 12) {
        ctx.strokeStyle = '#10B981'; // Emerald for Middle
      } else if (startIdx <= 16 && endIdx <= 16) {
        ctx.strokeStyle = '#8B5CF6'; // Purple for Ring
      } else if (startIdx <= 20 && endIdx <= 20) {
        ctx.strokeStyle = '#EC4899'; // Pink for Pinky
      } else {
        ctx.strokeStyle = '#06B6D4'; // Cyan for Palm
      }

      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.stroke();
    });

    // 2. Draw 21 Finger Joints with glowing circular dots
    landmarks.forEach((p, idx) => {
      const x = p.x * width;
      const y = p.y * height;

      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const isWrist = idx === 0;

      ctx.beginPath();
      const radius = isTip ? 7 : isWrist ? 8 : 5;
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (isTip) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#F43F5E'; // Rose border for tips
        ctx.lineWidth = 3;
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 12;
      } else if (isWrist) {
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#00F0FF';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 6;
      }

      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}

export const aslClassifier = new ASLLandmarkClassifier();
