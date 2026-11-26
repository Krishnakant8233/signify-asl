// Browser Text-to-Speech service using Web Speech API (window.speechSynthesis)
// Guaranteed keyless, free, client-side, zero paid APIs required.

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string | null;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isMuted: boolean = false;
  private autoSpeechEnabled: boolean = true;
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private volume: number = 1.0;
  private selectedVoiceURI: string | null = null;
  private isSpeaking: boolean = false;
  private statusListeners: Array<(speaking: boolean, text: string) => void> = [];
  private lastSpokenChar: string | null = null;
  private lastSpokenTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    // Default to an English voice if available
    if (!this.selectedVoiceURI && this.voices.length > 0) {
      const enVoice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
      this.selectedVoiceURI = enVoice.voiceURI;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  public setVoice(voiceURI: string): void {
    this.selectedVoiceURI = voiceURI;
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(1.5, pitch));
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0.0, Math.min(1.0, volume));
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
      this.notifyStatus(false, '');
    }
  }

  public setAutoSpeech(enabled: boolean): void {
    this.autoSpeechEnabled = enabled;
  }

  public getSettings() {
    return {
      isMuted: this.isMuted,
      autoSpeechEnabled: this.autoSpeechEnabled,
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      selectedVoiceURI: this.selectedVoiceURI,
    };
  }

  public onStatusChange(callback: (speaking: boolean, text: string) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private notifyStatus(speaking: boolean, text: string): void {
    this.isSpeaking = speaking;
    this.statusListeners.forEach(cb => cb(speaking, text));
  }

  /**
   * Speak a newly recognized character automatically.
   * Protects against duplicate frame triggers and overlapping utterance queues.
   */
  public speakCharacter(char: string): void {
    if (!this.autoSpeechEnabled || this.isMuted || !char || char === '?' || char === 'NONE') {
      return;
    }

    const now = Date.now();
    // Guard: Prevent re-speaking identical character within 1.2 seconds unless explicitly reset
    if (this.lastSpokenChar === char && now - this.lastSpokenTime < 1200) {
      return;
    }

    this.lastSpokenChar = char;
    this.lastSpokenTime = now;
    this.speakText(char, true);
  }

  /**
   * Speak text (word, sentence, or test phrase)
   * If interrupt is true, cancels ongoing utterances to avoid delayed queue backlogs
   */
  public speakText(text: string, interrupt: boolean = true): void {
    if (!this.synth || this.isMuted || !text.trim()) {
      return;
    }

    if (interrupt) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    if (this.selectedVoiceURI) {
      const voice = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      this.notifyStatus(true, text);
    };

    utterance.onend = () => {
      this.notifyStatus(false, '');
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechService] Utterance error:', e);
      this.notifyStatus(false, '');
    };

    this.synth.speak(utterance);
  }

  public testVoice(): void {
    this.speakText("Real-time sign language speech active. Assistive communication ready.", true);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.notifyStatus(false, '');
    }
  }

  public resetDuplicateGuard(): void {
    this.lastSpokenChar = null;
    this.lastSpokenTime = 0;
  }
}

export const speechService = new SpeechService();
