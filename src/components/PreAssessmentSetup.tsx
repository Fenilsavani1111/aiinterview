import { useState } from 'react';
import { Camera, Award, Clock, Mic, AlertCircle } from 'lucide-react';
import { JobPost } from '../types';
import IdentityVerification from './IdentityVerification';

interface PreAssessmentSetupProps {
  jobData: JobPost | null;
  microphoneReady: boolean;
  cameraError: string | null;
  speechError: string | null;
  speechSupported: boolean;
  candidateId: string;
  fetchQueData: { jobTitle?: string } | null;
  setMicrophoneReady: (ready: boolean) => void;
  setShowTestResult: (ready: boolean) => void;
  startCamera: () => Promise<void>;
  stream: MediaStream | null;
  startInterview: () => void;
}

const PreAssessmentSetup: React.FC<PreAssessmentSetupProps> = ({
  jobData,
  microphoneReady,
  cameraError,
  speechError,
  speechSupported,
  candidateId,
  fetchQueData,
  setMicrophoneReady,
  setShowTestResult,
  startCamera,
  stream,
  startInterview,
}) => {
  const [identityVerified, setIdentityVerified] = useState(false);

  return (
    <div className='max-w-2xl mx-auto'>
      <div className='bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/60 p-6 md:p-8'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='inline-flex p-4 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-purple-500/15 rounded-2xl shadow-inner mb-5 ring-1 ring-indigo-500/10'>
            <Award className='w-10 h-10 text-indigo-600' strokeWidth={2} />
          </div>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-800'>
            Smart {fetchQueData?.jobTitle ?? 'Assessment'}
          </h2>
          <p className='text-slate-500 mt-2 max-w-sm mx-auto text-sm sm:text-base'>
            Complete identity verification, then check your devices to start.
          </p>
        </div>

        {/* Device Status */}
        <div className='grid grid-cols-3 gap-3 sm:gap-4 mb-6'>
          <StatusCard
            icon={<Clock className='w-5 h-5 sm:w-6 sm:h-6' />}
            title='Smart'
            subtitle='Detection'
            color='blue'
            attention={false}
          />
          <StatusCard
            icon={<Mic className='w-5 h-5 sm:w-6 sm:h-6' />}
            title={microphoneReady ? 'Mic Ready' : 'Mic Needed'}
            subtitle={microphoneReady ? 'Allowed' : 'Allow access'}
            color={microphoneReady ? 'green' : 'red'}
            attention={!microphoneReady}
          />
          <StatusCard
            icon={<Camera className='w-5 h-5 sm:w-6 sm:h-6' />}
            title={
              jobData?.enableVideoRecording
                ? cameraError
                  ? 'Camera Issue'
                  : 'Camera Ready'
                : 'Audio Only'
            }
            subtitle={
              jobData?.enableVideoRecording
                ? cameraError
                  ? 'Check access'
                  : 'Enabled'
                : 'No camera'
            }
            color={jobData?.enableVideoRecording ? (cameraError ? 'yellow' : 'purple') : 'gray'}
            attention={!!(jobData?.enableVideoRecording && cameraError)}
          />
        </div>

        {/* Errors */}
        {(speechError || !microphoneReady || cameraError) && (
          <div className='mb-6 p-4 bg-red-50/90 border border-red-200/80 rounded-2xl text-red-800'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div className='text-sm space-y-1.5'>
                <p className='font-medium text-red-800'>Setup required</p>
                <ul className='list-disc list-inside space-y-0.5 text-red-700'>
                  {!speechSupported && <li>Use Chrome, Edge, or Safari for speech support.</li>}
                  {speechError && <li>Speech: {speechError}</li>}
                  {!microphoneReady && (
                    <li>Allow microphone when the browser prompts, then refresh if needed.</li>
                  )}
                  {jobData?.enableVideoRecording && cameraError && (
                    <li>Camera: {cameraError} — allow access and refresh.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Identity verification */}
        <div className='mt-2'>
          <IdentityVerification
            candidateId={candidateId}
            jobData={jobData}
            stream={stream}
            onVerified={() => setIdentityVerified(true)}
          />
        </div>

        {/* START BUTTON */}
        <div className='mt-6 space-y-3'>
          <button
            onClick={startInterview}
            disabled={
              !speechSupported ||
              !!speechError ||
              !microphoneReady ||
              (jobData?.enableVideoRecording && !!cameraError) ||
              !identityVerified
            }
            className='w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:active:scale-100'
          >
            Start Assessment
          </button>
          {!identityVerified && (
            <p className='text-xs text-slate-500 text-center'>
              Identity verification is required to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreAssessmentSetup;

/* ---------------- Small Helper Component ---------------- */

const StatusCard = ({
  icon,
  title,
  subtitle,
  color,
  attention = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  attention?: boolean;
}) => {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50/80 text-blue-700 border-blue-200/60',
    green: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
    red: 'bg-red-50/80 text-red-700 border-red-200/60',
    yellow: 'bg-amber-50/80 text-amber-700 border-amber-200/60',
    purple: 'bg-violet-50/80 text-violet-700 border-violet-200/60',
    gray: 'bg-slate-50/80 text-slate-600 border-slate-200/60',
  };

  return (
    <div
      className={`relative p-4 rounded-2xl text-center border transition-all duration-200 hover:shadow-md ${styles[color] || styles.gray} ${attention ? 'ring-2 ring-offset-2 ring-amber-400/50' : ''}`}
    >
      <div className='mx-auto mb-2 flex justify-center [&>svg]:flex-shrink-0'>{icon}</div>
      <h4 className='font-semibold text-sm sm:text-base'>{title}</h4>
      <p className='text-xs sm:text-sm opacity-90'>{subtitle}</p>
    </div>
  );
};
