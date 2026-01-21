import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

const CaptureLivePhoto = ({ onCapture }: { onCapture: (base64: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
  }, []);

  const capture = () => {
    const video = videoRef.current!;
    const canvas = document.createElement('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.95);

    onCapture(base64);
  };

  return (
    <div className='space-y-4'>
      <p className='text-sm text-gray-600 text-center'>Ensure your face is clearly visible</p>

      <div className='w-48 h-48 mx-auto rounded-xl overflow-hidden border'>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className='w-full h-full object-cover scale-x-[-1]'
        />
      </div>

      <button
        onClick={capture}
        className='w-full bg-blue-600 text-white py-2 rounded-xl flex items-center justify-center gap-2'
      >
        <Camera size={18} /> Capture Face
      </button>
    </div>
  );
};

export default CaptureLivePhoto;
