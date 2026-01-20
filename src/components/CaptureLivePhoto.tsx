import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera } from 'lucide-react';
import { JobPost } from '../types';

const CaptureLivePhoto = ({
  stream,
  jobData,
  candidateId,
  isPhotoCaptured,
  setPhotoUrl,
  setIsPhotoCaptured,
}: {
  stream: MediaStream | null;
  jobData: JobPost | null;
  candidateId: string | null;
  isPhotoCaptured: boolean;
  setPhotoUrl: (photoUrl: string) => void;
  setIsPhotoCaptured: (isPhotoCaptured: boolean) => void;
}) => {
  const photoPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreviewStream, setPhotoPreviewStream] =
    useState<MediaStream | null>(null);

  // Capture live photo from camera stream
  const capturePhoto = async (): Promise<string | null> => {
    try {
      // Use preview stream if available, otherwise use main stream
      let photoStream: MediaStream | null = photoPreviewStream || stream;
      let shouldCleanupStream = false;

      // If no stream exists, request camera access
      if (!photoStream) {
        // Request camera just for photo capture
        photoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
          },
        });
        shouldCleanupStream = true;
      }

      // Use the preview video element if available and ready, otherwise create new one
      const useExistingVideo =
        photoPreviewVideoRef.current &&
        photoPreviewVideoRef.current.readyState >= 2 &&
        photoPreviewVideoRef.current.videoWidth > 0;

      let video: HTMLVideoElement;

      if (useExistingVideo && photoPreviewVideoRef.current) {
        // Use existing preview video element - it's already ready
        video = photoPreviewVideoRef.current;

        // Capture immediately since video is already ready
        return new Promise((resolve, reject) => {
          try {
            // Wait one frame to ensure we get the current frame
            requestAnimationFrame(() => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  // Draw the current video frame
                  // Note: Preview is mirrored (scaleX(-1)) but saved photo should be normal orientation
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

                  setCapturedPhoto(dataUrl);
                  resolve(dataUrl);
                } else {
                  reject(new Error('Failed to get canvas context'));
                }
              } catch (error) {
                reject(error);
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      } else {
        // Create new video element to capture frame
        video = document.createElement('video');
        video.srcObject = photoStream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
      }

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          if (shouldCleanupStream && photoStream) {
            photoStream.getTracks().forEach((track) => track.stop());
          }
        };

        // Wait for video metadata to load
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => {
              // Wait for video to be ready and have actual video data
              const checkReady = () => {
                // Check if video has valid dimensions and is ready
                if (
                  video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                  video.videoWidth > 0 &&
                  video.videoHeight > 0
                ) {
                  try {
                    // Wait one more frame to ensure we get the current frame
                    requestAnimationFrame(() => {
                      try {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          // Draw the current video frame
                          ctx.drawImage(
                            video,
                            0,
                            0,
                            canvas.width,
                            canvas.height
                          );
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

                          cleanup();
                          setCapturedPhoto(dataUrl);
                          resolve(dataUrl);
                        } else {
                          cleanup();
                          reject(new Error('Failed to get canvas context'));
                        }
                      } catch (error) {
                        cleanup();
                        reject(error);
                      }
                    });
                  } catch (error) {
                    cleanup();
                    reject(error);
                  }
                } else {
                  // If not ready yet, wait a bit and check again
                  setTimeout(checkReady, 100);
                }
              };

              // Start checking after a short delay to ensure video is playing
              setTimeout(checkReady, 200);
            })
            .catch((error) => {
              cleanup();
              reject(error);
            });
        };

        video.onerror = () => {
          cleanup();
          reject(new Error('Video element error'));
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (video.readyState < 2) {
            cleanup();
            reject(new Error('Video capture timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Failed to capture photo. Please ensure camera access is granted.');
      return null;
    }
  };

  // Upload photo to server
  const uploadPhoto = async (photoDataUrl: string): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);

      // Convert data URL to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      const timestamp = Date.now();
      formData.append(
        'file',
        blob,
        `photo_${jobData?.id}_${candidateId}_${timestamp}.jpg`
      );
      formData.append(
        'fileName',
        `photo_${jobData?.id}_${candidateId}_${timestamp}.jpg`
      );

      // Upload using the resume upload endpoint (or create a dedicated photo endpoint)
      const uploadRes = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-resume`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (uploadRes.data?.file_url) {
        const photoUrl = uploadRes.data.file_url;
        setPhotoUrl(photoUrl);
        setIsPhotoCaptured(true);
        setIsUploadingPhoto(false);
        console.log('✅ Photo uploaded successfully:', photoUrl);
        return photoUrl;
      } else {
        throw new Error('Upload response missing file_url');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setIsUploadingPhoto(false);
      alert('Failed to upload photo. Please try again.');
      return null;
    }
  };

  // Handle photo capture and upload
  const handleCaptureAndUploadPhoto = async () => {
    try {
      // Use preview stream if available, otherwise use main stream
      const streamToUse = photoPreviewStream || stream;

      if (!streamToUse) {
        alert('Camera is not ready. Please wait for camera to initialize.');
        return;
      }

      const photoDataUrl = await capturePhoto();
      if (photoDataUrl) {
        const uploadedUrl = await uploadPhoto(photoDataUrl);
        if (uploadedUrl) {
          // Save photo URL to candidate immediately
          await savePhotoToCandidate(uploadedUrl);
          // Stop preview stream if it was created just for preview
          if (photoPreviewStream && !stream) {
            photoPreviewStream.getTracks().forEach((track) => track.stop());
            setPhotoPreviewStream(null);
          }
        }
      }
    } catch (error) {
      console.error('Error in photo capture process:', error);
      alert('Failed to capture and upload photo. Please try again.');
    }
  };

  // Save photo URL to candidate record
  const savePhotoToCandidate = async (photoUrl: string) => {
    try {
      if (!candidateId) {
        console.warn('No candidate ID available to save photo');
        return;
      }

      await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY
        }/jobposts/update-candidate-byid`,
        {
          candidateId: candidateId,
          data: {
            photoUrl: photoUrl,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Photo URL saved to candidate record');
    } catch (error) {
      console.error('Error saving photo URL to candidate:', error);
      // Don't show alert here as photo is already uploaded, just log the error
    }
  };

  // Setup photo preview stream
  useEffect(() => {
    const setupPhotoPreview = async () => {
      // If we already have a stream, use it for preview
      if (stream) {
        setPhotoPreviewStream(stream);
        return;
      }

      // Otherwise, request camera access for preview
      if (!isPhotoCaptured && !photoPreviewStream) {
        try {
          const previewStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: 'user',
            },
          });
          setPhotoPreviewStream(previewStream);
        } catch (error) {
          console.error('Error setting up photo preview:', error);
        }
      }
    };

    setupPhotoPreview();

    // Cleanup on unmount or when photo is captured
    return () => {
      if (photoPreviewStream && !stream) {
        photoPreviewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream, isPhotoCaptured]);

  // Update photo preview video element when stream changes
  useEffect(() => {
    if (photoPreviewVideoRef.current && photoPreviewStream) {
      photoPreviewVideoRef.current.srcObject = photoPreviewStream;
      photoPreviewVideoRef.current.play().catch((e) => {
        console.error('Error playing preview video:', e);
      });
    }
  }, [photoPreviewStream]);

  return (
    <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl'>
      <h3 className='text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 text-center'>
        📸 Capture Live Photo
      </h3>
      <p className='text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 text-center'>
        Capture your photo before starting. It will be saved with your
        assessment record.
      </p>

      {/* Photo Preview or Live Camera Preview */}
      {capturedPhoto ? (
        <div className='mb-3 sm:mb-4 flex justify-center'>
          <div className='relative'>
            <img
              src={capturedPhoto}
              alt='Captured photo'
              className='w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-cover rounded-lg border-2 border-blue-300'
            />
            {isPhotoCaptured && (
              <div className='absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-500 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium'>
                ✓ Saved
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='mb-3 sm:mb-4 flex justify-center'>
          <div className='relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg border-2 border-blue-300 overflow-hidden bg-gray-200'>
            {photoPreviewStream || stream ? (
              <video
                ref={photoPreviewVideoRef}
                autoPlay
                playsInline
                muted
                className='w-full h-full object-cover'
                style={{ transform: 'scaleX(-1)' }} // Mirror the preview
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center'>
                <p className='text-gray-500 text-xs sm:text-sm text-center px-2 sm:px-4'>
                  Initializing camera...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className='hidden' />

      {/* Capture Photo Button */}
      <button
        onClick={handleCaptureAndUploadPhoto}
        disabled={isUploadingPhoto || isPhotoCaptured}
        className='w-full px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg sm:rounded-xl border border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base'
      >
        {isUploadingPhoto ? (
          <>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
            <span>Uploading...</span>
          </>
        ) : isPhotoCaptured ? (
          <>
            <span>✓</span>
            <span>Photo Saved</span>
          </>
        ) : (
          <>
            <Camera className='h-4 w-4 sm:h-5 sm:w-5' />
            <span>Capture Photo</span>
          </>
        )}
      </button>

      {!isPhotoCaptured && (
        <p className='text-xs text-gray-500 mt-1.5 sm:mt-2 text-center'>
          {jobData?.enableVideoRecording
            ? 'Camera will capture your photo'
            : 'Camera access will be requested'}
        </p>
      )}
    </div>
  );
};

export default CaptureLivePhoto;
