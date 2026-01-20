import { Camera, Award, Clock, Mic } from 'lucide-react';
import { JobPost } from '../types';
import CaptureLivePhoto from './CaptureLivePhoto';

interface PreAssessmentSetupProps {
    jobData: JobPost | null;
    microphoneReady: boolean;
    cameraError: string | null;
    speechError: string | null;
    speechSupported: boolean;
    candidateId: string;
    isPhotoCaptured: boolean;
    photoUrl: string | null;
    fetchQueData: {
        jobTitle?: string;
    } | null;
    setMicrophoneReady: (ready: boolean) => void;
    setShowTestResult: (ready: boolean) => void;
    startCamera: () => Promise<void>;
    stream: MediaStream | null;
    setPhotoUrl: (url: string | null) => void;
    setIsPhotoCaptured: (captured: boolean) => void;
    startInterview: () => void;
}

const PreAssessmentSetup: React.FC<PreAssessmentSetupProps> = ({ jobData, microphoneReady, cameraError, speechError, speechSupported, candidateId, isPhotoCaptured, photoUrl, fetchQueData, setMicrophoneReady, setShowTestResult, startCamera, stream, setPhotoUrl, setIsPhotoCaptured, startInterview }) => {

    return (
        <div className='max-w-2xl mx-auto'>
            <div className='bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8'>
                <div className='text-center mb-4 sm:mb-6'>
                    <div className='p-4 sm:p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto flex items-center justify-center'>
                        <Award className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600' />
                    </div>
                    <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3'>
                        Ready for Your Smart {fetchQueData?.jobTitle ?? 'Physics'}{' '}
                        Assessment?
                    </h2>
                    <p className='text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 px-2'>
                        🎤 <strong>Intelligent Voice Detection!</strong> The system
                        understands when you're speaking. Answer questions naturally.
                        <span className='block mt-1'>
                            <strong>Speak at your own pace - no rushing needed!</strong>
                        </span>
                    </p>

                    <div className='grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6'>
                        <div className='p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg sm:rounded-xl'>
                            <Clock className='w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600 mx-auto mb-1 sm:mb-2' />
                            <h3 className='font-semibold text-blue-800 text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1'>
                                🎤 Smart
                            </h3>
                            <p className='text-xs sm:text-sm text-blue-600 hidden sm:block'>
                                Detection
                            </p>
                        </div>
                        <div
                            className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${microphoneReady ? 'bg-green-50' : 'bg-red-50'
                                }`}
                        >
                            <Mic
                                className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2 ${microphoneReady ? 'text-green-600' : 'text-red-600'
                                    }`}
                            />
                            <h3
                                className={`font-semibold text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1 ${microphoneReady ? 'text-green-800' : 'text-red-800'
                                    }`}
                            >
                                {microphoneReady ? '🎤 Ready' : 'Mic Needed'}
                            </h3>
                            <p
                                className={`text-xs sm:text-sm hidden sm:block ${microphoneReady ? 'text-green-600' : 'text-red-600'
                                    }`}
                            >
                                {microphoneReady ? 'Ready' : 'Allow access'}
                            </p>
                        </div>
                        <div
                            className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${jobData?.enableVideoRecording
                                ? cameraError
                                    ? 'bg-yellow-50'
                                    : 'bg-purple-50'
                                : 'bg-gray-50'
                                }`}
                        >
                            <Camera
                                className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2 ${jobData?.enableVideoRecording
                                    ? cameraError
                                        ? 'text-yellow-600'
                                        : 'text-purple-600'
                                    : 'text-gray-400'
                                    }`}
                            />
                            <h3
                                className={`font-semibold text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1 ${jobData?.enableVideoRecording
                                    ? cameraError
                                        ? 'text-yellow-800'
                                        : 'text-purple-800'
                                    : 'text-gray-600'
                                    }`}
                            >
                                {jobData?.enableVideoRecording
                                    ? cameraError
                                        ? '⚠️ Issue'
                                        : '📹 Video'
                                    : '🎧 Audio'}
                            </h3>
                            <p
                                className={`text-xs sm:text-sm hidden sm:block ${jobData?.enableVideoRecording
                                    ? cameraError
                                        ? 'text-yellow-600'
                                        : 'text-purple-600'
                                    : 'text-gray-500'
                                    }`}
                            >
                                {jobData?.enableVideoRecording
                                    ? cameraError
                                        ? 'Check access'
                                        : 'Enabled'
                                    : 'Only'}
                            </p>
                        </div>
                    </div>

                    {/* Error Messages */}
                    {(speechError ||
                        (jobData?.enableVideoRecording && cameraError) ||
                        !microphoneReady) && (
                            <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700'>
                                <p className='font-medium mb-1 sm:mb-2 text-sm sm:text-base'>
                                    ⚠️ Setup Required:
                                </p>
                                <ul className='text-xs sm:text-sm list-disc list-inside space-y-0.5 sm:space-y-1'>
                                    {!speechSupported && (
                                        <li>
                                            Speech recognition is not supported in this browser.
                                            Please use Chrome, Edge, or Safari.
                                        </li>
                                    )}
                                    {speechError && (
                                        <li>Speech Recognition: {speechError}</li>
                                    )}
                                    {!microphoneReady && (
                                        <li>
                                            Microphone: Please allow microphone access and refresh
                                            the page.
                                        </li>
                                    )}
                                    {jobData?.enableVideoRecording && cameraError && (
                                        <li>
                                            Camera: {cameraError} - Please allow camera access and
                                            refresh the page.
                                        </li>
                                    )}
                                    {jobData?.enableVideoRecording &&
                                        !cameraError &&
                                        !navigator.mediaDevices?.getUserMedia && (
                                            <li>
                                                Camera: Your browser doesn't support camera access.
                                                Please use a modern browser (Chrome, Firefox, Edge,
                                                Safari).
                                            </li>
                                        )}
                                </ul>
                            </div>
                        )}

                    {/* Test Recording Setup Button */}
                    <div className='mb-4 sm:mb-6'>
                        <button
                            onClick={async () => {
                                try {
                                    // Test microphone
                                    console.log('🧪 Testing microphone...');
                                    const micStream =
                                        await navigator.mediaDevices.getUserMedia({
                                            audio: {
                                                echoCancellation: true,
                                                noiseSuppression: true,
                                                autoGainControl: true,
                                            },
                                        });
                                    micStream.getTracks().forEach((track) => track.stop());
                                    setMicrophoneReady(true);
                                    console.log('✅ Microphone ready');

                                    // Test camera if video recording is enabled
                                    if (jobData?.enableVideoRecording) {
                                        console.log('🧪 Testing camera...');
                                        setShowTestResult(true);
                                        await startCamera();
                                        // Wait a bit for state to update, then check result
                                        setTimeout(() => {
                                            if (stream && !cameraError) {
                                                alert(
                                                    '✅ All devices are working correctly!\n\nMicrophone: Ready ✓\nCamera: Ready ✓\n\nYou can now start the interview!'
                                                );
                                            } else if (cameraError) {
                                                alert(
                                                    '⚠️ Device test partially successful:\n\n✅ Microphone: Ready ✓\n❌ Camera: ' +
                                                    cameraError +
                                                    '\n\nPlease check the error message below and try again.'
                                                );
                                            } else {
                                                alert(
                                                    '✅ Device test completed!\n\nMicrophone: Ready ✓\nCamera: Please check status below\n\nIf camera shows as ready, you can start the interview!'
                                                );
                                            }
                                            setShowTestResult(false);
                                        }, 800);
                                    } else {
                                        alert(
                                            '✅ Microphone is working correctly!\n\nMicrophone: Ready ✓\n(No camera test - audio-only mode)\n\nYou can now start the interview!'
                                        );
                                    }
                                } catch (err: any) {
                                    console.error('Device test failed:', err);
                                    let errorMsg = 'Device test failed:\n\n';
                                    if (err.name === 'NotAllowedError') {
                                        errorMsg += '❌ Permission denied.\n\n';
                                        errorMsg +=
                                            'Please allow ' +
                                            (jobData?.enableVideoRecording
                                                ? 'microphone and camera'
                                                : 'microphone') +
                                            ' access in your browser settings.\n\n';
                                        errorMsg += 'Steps:\n';
                                        errorMsg +=
                                            "1. Click the lock/camera icon in your browser's address bar\n";
                                        errorMsg +=
                                            '2. Allow microphone' +
                                            (jobData?.enableVideoRecording
                                                ? ' and camera'
                                                : '') +
                                            ' permissions\n';
                                        errorMsg += '3. Refresh this page';
                                    } else if (err.name === 'NotFoundError') {
                                        errorMsg +=
                                            '❌ No ' +
                                            (err.message.includes('video')
                                                ? 'camera'
                                                : 'microphone') +
                                            ' found.\n\n';
                                        errorMsg +=
                                            'Please connect a ' +
                                            (err.message.includes('video')
                                                ? 'camera'
                                                : 'microphone') +
                                            ' and try again.';
                                    } else if (err.name === 'NotReadableError') {
                                        errorMsg += '❌ Device is already in use.\n\n';
                                        errorMsg +=
                                            'Please close other applications using your ' +
                                            (err.message.includes('video')
                                                ? 'camera'
                                                : 'microphone') +
                                            ' and try again.';
                                    } else {
                                        errorMsg += `❌ ${err.message || 'Unknown error'}`;
                                    }
                                    alert(errorMsg);
                                }
                            }}
                            className='w-full px-4 sm:px-6 py-2 sm:py-3 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg sm:rounded-xl border border-green-300 transition-all duration-200 mb-3 sm:mb-4 flex items-center justify-center gap-2 text-sm sm:text-base'
                        >
                            <span>🧪</span>
                            <span>Test Recording Setup</span>
                        </button>
                    </div>

                    {/* Live Photo Capture Section */}
                    <CaptureLivePhoto
                        stream={stream}
                        jobData={jobData}
                        candidateId={candidateId ?? ''}
                        isPhotoCaptured={isPhotoCaptured}
                        setPhotoUrl={setPhotoUrl}
                        setIsPhotoCaptured={setIsPhotoCaptured}
                    />

                    <button
                        onClick={startInterview}
                        disabled={
                            !speechSupported ||
                            !!speechError ||
                            !microphoneReady ||
                            (jobData?.enableVideoRecording && !!cameraError) ||
                            !isPhotoCaptured ||
                            !photoUrl
                        }
                        className='w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                    >
                        🎤 Start Assessment
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PreAssessmentSetup
