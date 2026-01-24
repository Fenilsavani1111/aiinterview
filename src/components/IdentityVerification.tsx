import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Camera,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  FileImage,
} from 'lucide-react';

interface IdentityVerificationProps {
  candidateId: string;
  stream: MediaStream | null;
  onVerified: (photoUrl: string) => void; // call this to unlock next flow
}

const ID_TYPES = [
  { label: 'Aadhaar Card', value: 'aadhaar' },
  { label: 'PAN Card', value: 'pan' },
  { label: 'Passport', value: 'passport' },
  { label: 'Driving License', value: 'driving_license' },
];

const IdentityVerification: React.FC<IdentityVerificationProps> = ({
  candidateId,
  stream,
  onVerified,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ID document state
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImageBase64, setIdImageBase64] = useState<string | null>(null);
  const [idImageFileName, setIdImageFileName] = useState<string | null>(null);
  const [idDragActive, setIdDragActive] = useState(false);

  // Live photo
  const [livePhotoBase64, setLivePhotoBase64] = useState<string | null>(null);

  // Verification
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  /* ----------------------- Helpers ----------------------- */

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /* ----------------------- Step 1 ----------------------- */

  const handleIdUpload = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIdImageFileName(file.name);
    const base64 = await fileToBase64(file);
    setIdImageBase64(base64);
  }, []);

  const onIdDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIdDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleIdUpload(f);
    },
    [handleIdUpload]
  );

  const onIdDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIdDragActive(true);
  }, []);

  const onIdDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIdDragActive(false);
  }, []);

  /* ----------------------- Step 2 ----------------------- */

  useEffect(() => {
    if (videoRef.current && stream && step === 2) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, step]);

  const captureLivePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.95);

    setLivePhotoBase64(base64);
    setStep(3);
  };

  /* ----------------------- Step 3 ----------------------- */

  const verifyIdentity = async () => {
    if (!idImageBase64 || !livePhotoBase64) return;

    try {
      setLoading(true);
      setError(null);

      const res = await axios.post(
        `${import.meta.env.VITE_PROCTORING_API_URL}/api/verify-document`,
        {
          document: idImageBase64,
          live_face: livePhotoBase64,
          document_type: idType,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      setVerificationResult(res.data);

      if (res.data.verified) {
        // Add live photo to s3
        // upload live photo
        const blob = await (await fetch(livePhotoBase64)).blob();
        const formData = new FormData();
        formData.append('file', blob, `live_${candidateId}.jpg`);

        const uploadRes = await axios.post(
          `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-resume`,
          formData
        );
        let damiphotourl = uploadRes.data.file_url;

        // Save to DB
        await axios.post(
          `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/update-candidate-byid`,
          {
            candidateId,
            data: {
              governmentProof: [
                {
                  value: idNumber,
                  verified: res.data.verified,
                  type: idType,
                  idProofType: 'Govt ID 1',
                },
              ],
              photoUrl: damiphotourl,
            },
          }
        );
        onVerified(damiphotourl ?? '');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- UI ----------------------- */

  const stepLabels = ['Upload ID', 'Capture Face', 'Verify'] as const;

  return (
    <div className='max-w-xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8'>
      {/* Stepper: 1 — 2 — 3 with connecting line */}
      <div className='flex items-center justify-center gap-0 mb-8'>
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div key={label} className='flex items-center'>
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all ${done ? 'bg-emerald-500 text-white' : ''} ${active ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/25' : ''} ${!active && !done ? 'bg-slate-200 text-slate-500' : ''}`}
              >
                {done ? <CheckCircle className='w-5 h-5' /> : stepNum}
              </div>
              {index < stepLabels.length - 1 && (
                <div
                  className={`w-10 sm:w-14 h-0.5 mx-0.5 ${step > stepNum ? 'bg-emerald-400' : 'bg-slate-200'}`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className='flex justify-between mt-1.5 text-xs text-slate-500 max-w-[280px] mx-auto'>
        <span>ID document</span>
        <span>Face photo</span>
        <span>Verify</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className='space-y-5'>
          <h3 className='text-lg font-semibold text-slate-800 flex items-center gap-2'>
            <Upload className='w-5 h-5 text-indigo-500' /> Upload ID Document
          </h3>

          <div>
            <label className='block text-sm font-medium text-slate-600 mb-1.5'>ID type</label>
            <select
              className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all bg-white'
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
            >
              <option value=''>Select ID type</option>
              {ID_TYPES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-600 mb-1.5'>ID number</label>
            <input
              type='text'
              placeholder='Enter your ID number'
              className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400'
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-600 mb-1.5'>
              ID document image
            </label>
            <div
              onDrop={onIdDrop}
              onDragOver={onIdDragOver}
              onDragLeave={onIdDragLeave}
              className={`rounded-2xl border-2 border-dashed transition-all ${idDragActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50'}`}
            >
              <input
                type='file'
                accept='image/*'
                className='hidden'
                id='id-doc-upload'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleIdUpload(f);
                  e.target.value = '';
                }}
              />
              {idImageBase64 ? (
                <div className='p-4 flex items-center gap-4'>
                  <div className='w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0'>
                    <img src={idImageBase64} alt='ID' className='w-full h-full object-cover' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-slate-700 truncate'>
                      {idImageFileName || 'Image'}
                    </p>
                    <p className='text-sm text-slate-500'>Click or drag to replace</p>
                  </div>
                  <label
                    htmlFor='id-doc-upload'
                    className='text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer'
                  >
                    Replace
                  </label>
                  <button
                    type='button'
                    onClick={() => {
                      setIdImageBase64(null);
                      setIdImageFileName(null);
                    }}
                    className='text-sm font-medium text-red-600 hover:text-red-700'
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  htmlFor='id-doc-upload'
                  className='flex flex-col items-center justify-center p-8 cursor-pointer'
                >
                  <FileImage className='w-10 h-10 text-slate-400 mb-2' />
                  <span className='text-sm font-medium text-slate-600'>
                    Drop image here or click to upload
                  </span>
                  <span className='text-xs text-slate-500 mt-0.5'>JPEG, PNG or WebP</span>
                </label>
              )}
            </div>
          </div>

          <button
            disabled={!idType || !idNumber || !idImageBase64}
            onClick={() => setStep(2)}
            className='w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className='space-y-5'>
          <h3 className='text-lg font-semibold text-slate-800 flex items-center gap-2'>
            <Camera className='w-5 h-5 text-indigo-500' /> Capture live face
          </h3>
          <p className='text-sm text-slate-600'>
            Look at the camera and capture a clear photo. Ensure good lighting and your face is
            clearly visible.
          </p>

          <div className='mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-inner'>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className='w-full h-full object-cover'
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>

          <button
            onClick={captureLivePhoto}
            className='w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all'
          >
            <Camera className='w-5 h-5' /> Capture photo
          </button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className='space-y-5 text-center'>
          <h3 className='text-lg font-semibold text-slate-800 flex items-center justify-center gap-2'>
            <ShieldCheck className='w-5 h-5 text-indigo-500' /> Verify identity
          </h3>

          {loading && (
            <div className='py-8 flex flex-col justify-center items-center gap-3 text-indigo-600'>
              <Loader2 className='w-10 h-10 animate-spin' />
              <span className='font-medium'>Verifying your identity…</span>
            </div>
          )}

          {!loading && verificationResult && (
            <div
              className={`p-6 rounded-2xl border-2 text-left ${
                verificationResult.verified
                  ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-800'
                  : 'bg-red-50/90 border-red-200/80 text-red-800'
              }`}
            >
              <div className='flex items-start gap-4'>
                {verificationResult.verified ? (
                  <CheckCircle className='w-10 h-10 text-emerald-600 flex-shrink-0' />
                ) : (
                  <XCircle className='w-10 h-10 text-red-600 flex-shrink-0' />
                )}
                <div>
                  <p className='font-semibold'>{verificationResult.message}</p>
                  <div className='mt-2 text-sm opacity-90'>
                    Similarity: {verificationResult.similarity}% · Threshold:{' '}
                    {verificationResult.threshold}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !verificationResult && (
            <>
              <button
                onClick={verifyIdentity}
                className='w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all'
              >
                <ShieldCheck className='w-5 h-5' /> Verify identity
              </button>
              {error && (
                <p className='text-sm text-red-600 flex items-center justify-center gap-1.5'>
                  <XCircle className='w-4 h-4 flex-shrink-0' /> {error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default IdentityVerification;
