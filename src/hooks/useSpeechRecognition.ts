import { useState, useRef, useCallback } from 'react';

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  hasFinishedSpeaking: boolean;
  error: string | null;
  confidence: number;
  isSpeaking: boolean; // New: indicates if user is currently speaking
  voiceActivity: number; // New: voice activity level (0-100)
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [hasFinishedSpeaking, setHasFinishedSpeaking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const manualStopRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const prevActivityRef = useRef<number>(0);
  const startingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<number | null>(null);

  const isSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setHasFinishedSpeaking(false);
    // mark that this is an active/intentional listening session
    manualStopRef.current = false;
    // prevent concurrent starts
    if (startingRef.current) return;
    if (recognitionRef.current && isListening) return;
    startingRef.current = true;
    console.log('🎤 Starting enhanced speech recognition with VAD...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      startingRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current as number);
        restartTimeoutRef.current = null;
      }
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalProduced = false;

      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript;
          // Accumulate final transcripts across recognition restarts/pauses
          finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
          setConfidence(result[0].confidence);
          finalProduced = true;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Combine accumulated final transcript with current interim
      const combined = (finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '')).trim();
      setTranscript(combined);

      // If any final result was produced, start silence timer to detect end of speech
      if (finalProduced) {
        silenceTimerRef.current = setTimeout(() => {
          setHasFinishedSpeaking(true);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 3000); // 3 seconds of silence after final transcript
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.warn('⚠️ Speech recognition error:', event.error);

      let errorMessage = '';
      let shouldRestart = false;
      let shouldShowError = true;

      switch (event.error) {
        case 'no-speech':
          console.log('No speech detected, attempting auto-restart...');
          shouldRestart = true;
          shouldShowError = false;
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check connection.';
          shouldRestart = true;
          break;
        case 'aborted':
          console.log('Speech recognition aborted (normal)');
          shouldShowError = false;
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      if (shouldShowError && errorMessage) {
        setError(errorMessage);
      }


      // Auto-restart for certain errors if we haven't captured much
      if (shouldRestart && finalTranscriptRef.current.trim().length < 15) {
        console.log('🔄 Scheduling auto-restart with VAD...');
        if (!restartTimeoutRef.current) {
          restartTimeoutRef.current = window.setTimeout(() => {
            restartTimeoutRef.current = null;
            if (!manualStopRef.current) {
              startListening();
            }
          }, 300) as unknown as number;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If stopListening() was called manually, perform full cleanup.
      if (manualStopRef.current) {
        // reset reported activity
        setVoiceActivity(0);
        setIsSpeaking(false);
        // Clean up audio monitoring resources when recognition ends
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (analyserRef.current) {
          analyserRef.current.disconnect();
          analyserRef.current = null;
        }
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch (e) {
            // ignore
          }
          audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      } else {
        // recognition ended due to silence or internal restart — restart automatically
        // ensure only one restart is scheduled at a time
        if (!restartTimeoutRef.current) {
          restartTimeoutRef.current = window.setTimeout(() => {
            restartTimeoutRef.current = null;
            if (!manualStopRef.current) {
              try {
                console.log('🔁 Auto-restarting speech recognition to continue across pauses');
                startListening();
              } catch (e) {
                // swallow
              }
            }
          }, 250) as unknown as number;
        }
      }
    };

    // Start browser speech recognition
    recognitionRef.current.start();

    // Start audio activity monitoring (independent of SpeechRecognition)
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const tick = () => {
          try {
            if (!analyserRef.current || !dataArrayRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
            // compute RMS (0..1)
            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              const v = (dataArrayRef.current[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArrayRef.current.length);
            // scale and smooth the raw RMS to a human-friendly percentage
            const rawPercent = Math.min(100, rms * 300); // tuned multiplier
            const smoothed = prevActivityRef.current * 0.82 + rawPercent * 0.18;
            prevActivityRef.current = smoothed;
            const activityPercent = Math.round(smoothed);
            setVoiceActivity(activityPercent);
            // speaking if activity above small threshold
            setIsSpeaking(activityPercent > 6);
          } catch (e) {
            // ignore per-frame errors
          }
          rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        // unable to access microphone for monitoring — record error and continue
        console.warn('Voice activity monitor not started', err);
        try {
          setError && setError(
            err && err.message ? `Voice activity monitor not started: ${err.message}` : 'Voice activity monitor not started'
          );
        } catch (e) {
          // ignore setting error failures
        }
      }
    })();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    // mark that user intentionally stopped listening
    manualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Stop audio monitoring
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) { }
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) { }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) { }
      mediaStreamRef.current = null;
    }
    // reset activity indicators
    prevActivityRef.current = 0;
    setVoiceActivity(0);
    setIsSpeaking(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setHasFinishedSpeaking(false);
    finalTranscriptRef.current = '';
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  }, []);

  return {
    isListening,
    transcript,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    hasFinishedSpeaking,
    error,
    isSpeaking,
    voiceActivity,
  };
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}