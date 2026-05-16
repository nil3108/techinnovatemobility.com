export interface CameraCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  errorMessage?: string;
}

export async function checkCameraCapabilities(): Promise<CameraCapabilities> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { hasCamera: false, hasMicrophone: false, errorMessage: 'Camera not supported in this browser' };
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { hasCamera: true, hasMicrophone: true };
  } catch (error: any) {
    return { hasCamera: false, hasMicrophone: false, errorMessage: error.message || 'Camera access denied' };
  }
}

const CAMERA_CONFIGS = [
  { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
  { video: { facingMode: 'environment' }, audio: false },
  { video: true, audio: false },
];

const VIDEO_CONFIGS = [
  { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
  { video: { facingMode: 'environment' }, audio: true },
  { video: true, audio: true },
];

export async function startCamera(forVideo: boolean = false): Promise<{ stream: MediaStream; error?: string }> {
  const configs = forVideo ? VIDEO_CONFIGS : CAMERA_CONFIGS;
  for (const constraints of configs) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream };
    } catch {}
  }
  return { stream: null as any, error: 'Camera access denied. Please grant camera permission in your browser settings and try again.' };
}

export function captureFrame(video: HTMLVideoElement): string | null {
  try {
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}

export async function capturePhoto(): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const result = await startCamera(false);
  if (!result.stream) return { success: false, error: result.error };
  const stream = result.stream;
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play();
    await new Promise(resolve => setTimeout(resolve, 200));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return { success: true, dataUrl };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to capture photo' };
  } finally {
    stream.getTracks().forEach(t => t.stop());
  }
}

const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4'];

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private onTimeUpdate?: (seconds: number) => void;

  async start(onTimeUpdate?: (seconds: number) => void): Promise<{ success: boolean; error?: string }> {
    try {
      this.onTimeUpdate = onTimeUpdate;
      const result = await startCamera(true);
      if (!result.stream) return { success: false, error: result.error };
      this.stream = result.stream;
      this.chunks = [];

      let mimeType = MIME_TYPES.find(mt => MediaRecorder.isTypeSupported(mt)) || '';
      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };

      this.mediaRecorder.start(1000);
      this.startTime = Date.now();

      const interval = setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.onTimeUpdate?.(Math.floor((Date.now() - this.startTime) / 1000));
        } else {
          clearInterval(interval);
        }
      }, 1000);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to start recording' };
    }
  }

  stop(): Promise<{ success: boolean; blob?: Blob; duration?: number; error?: string }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve({ success: false, error: 'Not recording' });
        return;
      }
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'video/webm' });
        resolve({ success: true, blob, duration });
      };
      this.mediaRecorder.stop();
    });
  }

  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  getStream(): MediaStream | null { return this.stream; }
  isRecording(): boolean { return this.mediaRecorder?.state === 'recording'; }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number; address?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 22.3072, lng: 73.1812, error: 'Geolocation not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => resolve({ lat: 22.3072, lng: 73.1812, error: error.message }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
