'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, CameraOff, Upload, RefreshCw } from 'lucide-react';

export function QRScanner({
  onDetected,
  onError,
}: {
  onDetected: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const activeRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  onDetectedRef.current = onDetected;
  onErrorRef.current = onError;

  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try { await s.stop(); } catch {}
    try { s.clear(); } catch {}
    scannerRef.current = null;
  };

  const startCamera = async () => {
    await stopScanner();
    setFailed(null);
    activeRef.current = true;

    try {
      if (!regionRef.current) return;
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!activeRef.current || !regionRef.current) return;

      const scanner = new Html5Qrcode(regionRef.current.id, { verbose: false });
      scannerRef.current = scanner;

      const onSuccess = (decodedText: string) => {
        if (!activeRef.current) return;
        activeRef.current = false;
        stopScanner();
        onDetectedRef.current(decodedText);
      };

      const onFail = () => {};

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      const cameras = (await Html5Qrcode.getCameras()) as Array<{ id: string; label: string }>;

      if (!cameras || cameras.length === 0) {
        throw new Error('No cameras found');
      }

      let started = false;

      if (cameras.length === 1) {
        try {
          await scanner.start(
            { deviceId: { exact: cameras[0].id } },
            config,
            onSuccess,
            onFail,
          );
          started = true;
        } catch {
          if (!activeRef.current) return;
        }
      }

      if (!started && activeRef.current) {
        const rear = cameras.find((c) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment') ||
          c.label.toLowerCase().includes('world'),
        );
        const candidates = rear ? [rear, ...cameras.filter((c) => c.id !== rear.id)] : cameras;

        for (const cam of candidates) {
          if (!activeRef.current) return;
          try {
            await scanner.start(
              { deviceId: { exact: cam.id } },
              config,
              onSuccess,
              onFail,
            );
            started = true;
            break;
          } catch {
            continue;
          }
        }
      }

      if (!started && activeRef.current) {
        throw new Error('Could not start camera');
      }
    } catch (e) {
      if (!activeRef.current) return;
      const raw = e instanceof Error ? e.message : String(e);
      const name = e instanceof Error ? e.name : '';

      let message: string;
      if (name === 'NotAllowedError' || raw.includes('NotAllowedError')) {
        message = 'Camera permission was denied. Allow camera access in your browser settings and try again.';
      } else if (name === 'NotFoundError' || raw.includes('NotFoundError') || raw.includes('No cameras found')) {
        message = 'No camera was found on this device.';
      } else if (name === 'NotReadableError' || raw.includes('NotReadableError')) {
        message = 'The camera is already in use by another tab or app.';
      } else {
        message = `Camera error: ${raw}`;
      }
      setFailed(message);
      onErrorRef.current?.(message);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      activeRef.current = false;
      stopScanner();
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempId = `qr-file-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = tempId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      try {
        const scanner = new Html5Qrcode(tempId, { verbose: false });
        const decoded = await scanner.scanFile(file);
        try { scanner.clear(); } catch {}
        onDetectedRef.current(decoded);
        return;
      } finally {
        try { document.body.removeChild(tempDiv); } catch {}
      }
    } catch {
      onErrorRef.current?.('No QR code found in that image.');
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
        <CameraOff className="h-8 w-8 text-slate-400" />
        <p className="max-w-sm text-sm font-medium text-slate-700">{failed}</p>
        {failed.includes('denied') && (
          <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
            <p className="font-semibold">How to fix:</p>
            <ol className="mt-1 list-decimal pl-4 space-y-1">
              <li>Click the lock/camera icon in your browser address bar</li>
              <li>Set Camera to &quot;Allow&quot;</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
        )}
        <p className="max-w-sm text-xs text-slate-400">
          Camera access needs HTTPS (or localhost). If the issue persists, check your browser settings.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              activeRef.current = false;
              startCamera();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try camera again
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Upload className="h-3.5 w-3.5" />
            Scan an image instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
        <div ref={regionRef} id="qr-scan-region" className="relative flex h-64 w-full items-center justify-center sm:h-72" />
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute left-4 right-4 top-3 bottom-8">
            <div className="absolute left-0 top-0 h-7 w-7 rounded-tl-2xl border-l-2 border-t-2 border-white/70" />
            <div className="absolute right-0 top-0 h-7 w-7 rounded-tr-2xl border-r-2 border-t-2 border-white/70" />
            <div className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-2xl border-b-2 border-l-2 border-white/70" />
            <div className="absolute bottom-0 right-0 h-7 w-7 rounded-br-2xl border-b-2 border-r-2 border-white/70" />
            <div className="qr-scan-sweep absolute left-2 right-2 h-[2px] rounded-full bg-brand-400" />
          </div>
        </div>
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex items-center justify-center gap-1.5 px-3 text-center text-xs text-white/85">
          <ScanLine className="h-3.5 w-3.5" />
          Point the camera at a member QR code
        </p>
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 sm:w-auto sm:px-4"
      >
        <Upload className="h-3.5 w-3.5" />
        {busy ? 'Scanning\u2026' : 'Upload a QR image instead'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
