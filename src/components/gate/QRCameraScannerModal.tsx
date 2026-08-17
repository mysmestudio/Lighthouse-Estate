import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, X, AlertCircle, Sparkles } from 'lucide-react';

interface QRCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const QRCameraScannerModal: React.FC<QRCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestAnimationRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasPermission(true);
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings.'
          : 'Unable to start camera. Please verify device camera is available.'
      );
    }
  };

  const stopCamera = () => {
    if (requestAnimationRef.current) {
      cancelAnimationFrame(requestAnimationRef.current);
      requestAnimationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (qrCode && qrCode.data) {
          // Found QR payload!
          stopCamera();
          onScanSuccess(qrCode.data);
          return;
        }
      }
    }

    requestAnimationRef.current = requestAnimationFrame(scanFrame);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 sm:p-6 text-white font-sans select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          <Camera className="w-4 h-4 text-[#E7D19C]" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Gate QR Scanner Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFacingMode}
            className="p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-all backdrop-blur-md"
            title="Switch Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-all backdrop-blur-md"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Viewport */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl border-2 border-[#C89B3C]/50 shadow-2xl bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Framing Sight Reticle */}
        <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-[#E7D19C] rounded-2xl flex items-center justify-center pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C89B3C] -mt-1 -ml-1 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C89B3C] -mt-1 -mr-1 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C89B3C] -mb-1 -ml-1 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C89B3C] -mb-1 -mr-1 rounded-br-lg"></div>

          {/* Animated laser scanline */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#25D366] to-transparent animate-pulse absolute top-1/2 shadow-[0_0_8px_#25D366]"></div>
        </div>

        {/* Error message if permission rejected */}
        {errorMessage && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <h3 className="text-lg font-bold">Camera Access Restricted</h3>
            <p className="text-xs text-white/80 max-w-xs">{errorMessage}</p>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white text-xs font-bold border border-[#E7D19C]"
            >
              Retry Camera Permission
            </button>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-center pb-2 z-10">
        <p className="text-xs sm:text-sm text-[#E7D19C] font-semibold bg-black/50 backdrop-blur-md py-2 px-4 rounded-xl inline-block border border-white/10">
          Point camera at the visitor's digital or printed QR pass. It will auto-verify instantly.
        </p>
      </div>
    </div>
  );
};
