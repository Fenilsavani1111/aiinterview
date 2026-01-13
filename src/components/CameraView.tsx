import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Circle } from 'lucide-react';

interface CameraViewProps {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
}

export const CameraView: React.FC<CameraViewProps> = ({ stream, isRecording, error }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Setting video stream to video element');
      videoRef.current.srcObject = stream;
      
      // Ensure video plays
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        if (videoRef.current) {
          videoRef.current.play().catch(e => {
            console.error('Error playing video:', e);
          });
        }
      };
    }
  }, [stream]);

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <CameraOff className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Camera Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            Please refresh the page and allow camera permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-800">Camera</span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 text-red-600">
              <Circle className="w-3 h-3 fill-current animate-pulse" />
              <span className="text-sm font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 object-cover bg-gray-900"
          />
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-100">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-500">Initializing camera...</p>
              <p className="text-xs text-gray-400 mt-1">Please allow camera access</p>
            </div>
          </div>
        )}
        
        {isRecording && stream && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              <Circle className="w-2 h-2 fill-current animate-pulse" />
              REC
            </div>
          </div>
        )}
        
        {stream && !isRecording && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              <Circle className="w-2 h-2 fill-current" />
              LIVE
            </div>
          </div>
        )}
      </div>
    </div>
  );
};