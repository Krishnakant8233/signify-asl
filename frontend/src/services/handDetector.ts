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
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

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

    // 1. Fully release previous stream and stop running loops
    this.stop();

    try {
      // 2. Select camera constraints with mobile device enumeration support
      let videoConstraint: any = {
        width: { ideal: width },
        height: { ideal: height },
      };

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (videoDevices.length > 1) {
          if (facingMode === 'environment') {
            const backCam = videoDevices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            if (backCam && backCam.deviceId) {
              videoConstraint.deviceId = { exact: backCam.deviceId };
            } else {
              videoConstraint.facingMode = { ideal: 'environment' };
            }
          } else {
            const frontCam = videoDevices.find(
              (d) =>
                d.label.toLowerCase().includes('front') ||
                d.label.toLowerCase().includes('user')
            );
            if (frontCam && frontCam.deviceId) {
              videoConstraint.deviceId = { exact: frontCam.deviceId };
            } else {
              videoConstraint.facingMode = { ideal: 'user' };
            }
          }
        } else {
          videoConstraint.facingMode = { ideal: facingMode };
        }
      } catch (e) {
        videoConstraint.facingMode = { ideal: facingMode };
      }

      // 3. Request camera stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });
      } catch (err) {
        // Fallback to basic facingMode constraint if exact deviceId failed
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
      }

      this.currentStream = stream;
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      await videoElement.play();

      this.isRunning = true;

      // 4. Smooth, non-blocking MediaPipe inference frame loop
      let isProcessing = false;
      const processLoop = async () => {
        if (!this.isRunning) return;

        if (this.hands && videoElement.readyState >= 2 && !isProcessing) {
          isProcessing = true;
          try {
            await this.hands.send({ image: videoElement });
          } catch (err) {
            // Ignore transient frame skips
          } finally {
            isProcessing = false;
          }
        }

        if (this.isRunning) {
          this.animFrameId = requestAnimationFrame(processLoop);
        }
      };

      this.animFrameId = requestAnimationFrame(processLoop);
      console.log(`[HandDetector] Camera active (${facingMode}), loop running.`);
    } catch (err) {
      console.error('[HandDetector] Camera acquisition failed:', err);
      throw err;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
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
