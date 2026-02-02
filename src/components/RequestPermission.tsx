import React, { useState } from 'react';
import { JobPost } from '../types';

interface RequestPermissionProps {
  jobData: JobPost | null;
  setMicrophoneReady: (ready: boolean) => void;
  setPermissionsRequested: (ready: boolean) => void;
  startCamera: () => Promise<void>;
}

const RequestPermission: React.FC<RequestPermissionProps> = ({
  jobData,
  setMicrophoneReady,
  setPermissionsRequested,
  startCamera,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request microphone and camera permissions
  const requestPermissions = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      console.warn('getUserMedia is not supported in this environment.');
      alert(
        'Your browser does not support camera/microphone access. Please use Chrome, Edge, Firefox, or Safari.'
      );
      return;
    }

    // Only request if jobData is available
    if (!jobData) {
      return;
    }

    setIsRequestingPermissions(true);

    try {
      console.log('🔔 Requesting device permissions (this will show browser pop-up)...');

      // Request permissions based on video recording setting
      // This will show the native browser permission pop-up
      if (jobData.enableVideoRecording) {
        // Request both audio and video together - shows one pop-up for both
        // This triggers the native browser permission dialog
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });

        console.log('✅ Permissions granted by user');

        // Stop this temporary stream - startCamera will create its own
        mediaStream.getTracks().forEach((track) => track.stop());

        // Now start camera properly (will reuse granted permissions)
        // This keeps the camera stream active for the interview
        try {
          await startCamera();
          setMicrophoneReady(true);
          setPermissionsRequested(true);
          console.log('✅ Camera and microphone ready');
        } catch (cameraErr: any) {
          console.error('❌ Camera setup failed:', cameraErr);
          // Still set microphone ready if audio track was available
          setMicrophoneReady(true);
          setPermissionsRequested(true);
        }
      } else {
        // Audio-only mode - request microphone permission
        // This triggers the native browser permission dialog
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });

        console.log('✅ Microphone permission granted by user');
        setMicrophoneReady(true);
        setPermissionsRequested(true);

        // Stop the stream - we'll request it again when starting the interview
        audioStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error: any) {
      console.error('❌ Permission request failed:', error);

      // Handle different error types
      if (error.name === 'NotAllowedError') {
        console.log('User denied permissions');
        setMicrophoneReady(false);
        alert(
          '❌ Permission denied.\n\nPlease allow ' +
          (jobData.enableVideoRecording ? 'microphone and camera' : 'microphone') +
          " access in your browser settings and try again.\n\nSteps:\n1. Click the lock/camera icon in your browser's address bar\n2. Allow " +
          (jobData.enableVideoRecording ? 'microphone and camera' : 'microphone') +
          ' permissions\n3. Click "Request Permissions" again'
        );
      } else if (error.name === 'NotFoundError') {
        console.log('No devices found');
        setMicrophoneReady(false);
        alert(
          '❌ No ' +
          (error.message.includes('video') ? 'camera' : 'microphone') +
          ' found.\n\nPlease connect a ' +
          (error.message.includes('video') ? 'camera' : 'microphone') +
          ' and try again.'
        );
      } else if (error.name === 'NotReadableError') {
        setMicrophoneReady(false);
        alert(
          '❌ Device is already in use.\n\nPlease close other applications using your ' +
          (error.message.includes('video') ? 'camera' : 'microphone') +
          ' and try again.'
        );
      } else {
        console.log('Other error:', error.message);
        setMicrophoneReady(false);
        alert(`❌ Error requesting permissions: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='w-full max-w-2xl bg-white rounded-2xl shadow-md p-6 sm:p-8'>
        <h2 className='text-xl sm:text-2xl font-semibold text-gray-800 mb-4'>AI Interview Setup</h2>

        <p className='text-sm text-gray-600 mb-5'>
          Please review the instructions carefully before starting your interview.
        </p>

        {/* Guidelines Section */}
        <div className='mb-6 p-4 sm:p-5 bg-yellow-50 border border-yellow-200 rounded-xl'>
          <h3 className='font-semibold text-yellow-800 mb-3 text-sm sm:text-base'>
            ⚠️ Important Interview Guidelines
          </h3>

          <ul className='text-left text-xs sm:text-sm text-yellow-700 space-y-2 list-disc list-inside'>
            <li>
              <strong>Do not refresh or reload</strong> the page. Reloading will
              <strong> automatically submit and end your interview</strong>.
            </li>

            <li>
              <strong>Do not switch tabs, open new tabs, or minimize the browser. </strong>
              Any such activity may <strong>end the interview immediately</strong>.
            </li>

            <li>
              <strong>Do not resize the browser window</strong> or change screen orientation during
              the interview.
            </li>

            <li>
              Use <strong>only one device and one screen</strong>. External monitors, mobile phones,
              or smartwatches are not allowed.
            </li>

            <li>
              Our AI system may detect{' '}
              <strong>mobile usage, extra devices, or suspicious activities</strong>.
            </li>

            <li>
              Keep a <strong>valid government ID</strong> (Aadhaar / PAN / Passport) ready. Your
              live image will be matched with your ID proof.
            </li>

            <li>
              Your <strong>camera and microphone must remain ON</strong> throughout the interview.
            </li>

            <li>
              Your <strong>face and activity will be monitored and recorded </strong>
              for evaluation and security purposes only.
            </li>

            <li>
              Ensure a <strong>quiet environment, good lighting, and stable internet</strong>.
            </li>
          </ul>

          <p className='mt-3 text-xs text-yellow-700'>
            By continuing, you agree to AI-based monitoring and fair interview practices.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <div className='flex items-start gap-2 mb-5'>
          <input
            type='checkbox'
            id='agree'
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className='mt-1'
          />
          <label htmlFor='agree' className='text-sm text-gray-700'>
            I have read and agree to the interview guidelines and consent to AI-based monitoring.
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={requestPermissions}
          disabled={!agreed || isRequestingPermissions}
          className={`w-full py-2.5 rounded-lg text-white font-medium transition
            ${!agreed || isRequestingPermissions
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
        >
          {isRequestingPermissions ? 'Checking Permissions...' : 'Allow Camera & Start Interview'}
        </button>
      </div>
    </div>
  );
};

export default RequestPermission;
