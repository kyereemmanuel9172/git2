'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, Upload, User } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

export default function MemberPhotoPicker({ value, onChange, label = 'Profile photograph' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_BYTES) {
      setCameraError('Photo must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = s;
      setStream(s);
    } catch {
      setCameraError('Camera is not available. You can upload a photo instead.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const max = 640;
    const scale = Math.min(max / video.videoWidth, max / video.videoHeight, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {value ? (
            <img src={value} alt="Profile preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <User className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Upload photo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={startCamera}>
              <Camera className="h-3.5 w-3.5" />
              Take live photo
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} title="Remove photo">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">JPEG, PNG or WebP, up to 10 MB.</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) readFile(f);
          e.target.value = '';
        }}
      />

      <Modal open={cameraOpen} onClose={stopCamera} title="Take a live photo">
        <div className="flex flex-col items-center gap-4">
          {cameraError ? (
            <p className="text-sm text-red-600">{cameraError}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-sm rounded-lg bg-slate-900"
              style={{ aspectRatio: '4/3' }}
            />
          )}
          {!cameraError && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
              <Button type="button" onClick={capture}>
                Capture photo
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
