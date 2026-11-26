// MediaPipe Hands Tracker with Web & Mobile camera support
// Uses global window.Hands and window.Camera loaded via CDN or dynamic script injection
import { Landmark } from './aslClassifier';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export class HandDetectorService {
  private hands: any = null;
  private camera: any = null;
  private onResultsCallback: ((landmarks: Landmark[] | null) => void) | null = null;
  private isInitializing = false;

  public async init(): Promise<boolean> {
    if (this.hands) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;

    // Ensure scripts are loaded
    await this.ensureScriptsLoaded();

    if (window.Hands) {
      try {
        this.hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        this.hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.hands.onResults((results: any) => {
          if (this.onResultsCallback) {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              const raw = results.multiHandLandmarks[0];
              const landmarks: Landmark[] = raw.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z }));
              this.onResultsCallback(landmarks);
            } else {
              this.onResultsCallback(null);
            }
          }
        });

        console.log('[HandDetector] MediaPipe Hands initialized successfully.');
        this.isInitializing = false;
        return true;
      } catch (err) {
        console.error('[HandDetector] Error setting up Hands:', err);
      }
    }
    this.isInitializing = false;
    return false;
  }

  private async ensureScriptsLoaded(): Promise<void> {
    if (window.Hands && window.Camera) return;

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });

    try {
      if (!window.Camera) {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      }
      if (!window.Hands) {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      }
    } catch (e) {
      console.warn('[HandDetector] Script load warning:', e);
    }
  }

  private currentStream: MediaStream | null = null;

  public setListener(callback: (landmarks: Landmark[] | null) => void) {
    this.onResultsCallback = callback;
  }

  public async start(
    videoElement: HTMLVideoElement,
    width: number = 640,
    height: number = 480,
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<void> {
    await this.init();

    this.stop();

    try {
      // 1. Direct getUserMedia with explicit facingMode for reliable mobile front/rear camera selection
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      videoElement.srcObject = stream;
      await videoElement.play();

      if (window.Camera) {
        this.camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (this.hands && videoElement.readyState >= 2) {
              try {
                await this.hands.send({ image: videoElement });
              } catch (err) {
                // Ignore transient frame errors
              }
            }
          },
          width,
          height,
        });
        await this.camera.start();
        console.log(`[HandDetector] Camera started (${facingMode}) with MediaPipe.`);
      } else {
        const loop = async () => {
          if (this.hands && videoElement.readyState >= 2) {
            try {
              await this.hands.send({ image: videoElement });
            } catch (e) {}
          }
          if (videoElement.srcObject) {
            requestAnimationFrame(loop);
          }
        };
        requestAnimationFrame(loop);
      }
    } catch (err) {
      console.error('[HandDetector] Camera acquisition failed:', err);
      throw err;
    }
  }

  public stop(): void {
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (e) {}
      this.camera = null;
    }
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }
}

export const handDetector = new HandDetectorService();
