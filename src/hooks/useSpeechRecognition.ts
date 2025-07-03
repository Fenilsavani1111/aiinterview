import { useState, useRef, useCallback, useEffect } from 'react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const isStoppingRef = useRef<boolean>(false);
  
  // Voice Activity Detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const speechDetectedRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Voice Activity Detection setup
  const setupVoiceActivityDetection = useCallback(async () => {
    try {
      console.log('🎤 Setting up Voice Activity Detection...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Keep some noise for VAD
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      // Connect microphone to analyser
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);
      
      console.log('✅ Voice Activity Detection setup complete');
      
      // Start monitoring voice activity
      startVoiceActivityMonitoring();
      
    } catch (error) {
      console.error('❌ VAD setup failed:', error);
      setError('Voice activity detection setup failed');
    }
  }, []);

  // Voice Activity Monitoring
  const startVoiceActivityMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    console.log('🔊 Starting voice activity monitoring...');
    
    vadIntervalRef.current = setInterval(() => {
      if (!analyser || isStoppingRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Calculate voice activity (0-100)
      const activity = Math.min(100, (average / 128) * 100);
      setVoiceActivity(Math.round(activity));
      
      // Voice activity threshold (adjustable)
      const SPEECH_THRESHOLD = 15; // Minimum activity level to consider as speech
      const SILENCE_DURATION = 2500; // 2.5 seconds of silence before considering speech ended
      
      const now = Date.now();
      
      if (activity > SPEECH_THRESHOLD) {
        // Speech detected
        if (!speechDetectedRef.current) {
          console.log('🗣️ Speech started - VAD detected voice activity');
          speechDetectedRef.current = true;
          setIsSpeaking(true);
        }
        lastSpeechTimeRef.current = now;
      } else {
        // Check for silence duration
        if (speechDetectedRef.current && (now - lastSpeechTimeRef.current) > SILENCE_DURATION) {
          console.log('🤐 Speech ended - VAD detected sustained silence');
          speechDetectedRef.current = false;
          setIsSpeaking(false);
        }
      }
      
    }, 100); // Check every 100ms
  }, []);

  // Stop Voice Activity Detection
  const stopVoiceActivityDetection = useCallback(() => {
    console.log('🛑 Stopping Voice Activity Detection...');
    
    // Clear monitoring interval
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    
    // Disconnect audio nodes
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset states
    setIsSpeaking(false);
    setVoiceActivity(0);
    speechDetectedRef.current = false;
    analyserRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition cleanup: already stopped');
        }
      }
      
      // Clear all timeouts
      [timeoutRef, silenceTimeoutRef, restartTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
      
      // Stop VAD
      stopVoiceActivityDetection();
    };
  }, [stopVoiceActivityDetection]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Previous recognition already stopped');
      }
    }

    // Clear any existing timeouts
    [timeoutRef, silenceTimeoutRef, restartTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    // Reset state
    isStoppingRef.current = false;
    finalTranscriptRef.current = '';
    speechDetectedRef.current = false;
    lastSpeechTimeRef.current = 0;

    try {
      console.log('🎤 Starting enhanced speech recognition with VAD...');
      
      // Setup Voice Activity Detection first
      setupVoiceActivityDetection();
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition settings
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started with VAD integration');
        setIsListening(true);
        setError(null);
        setTranscript('');
        setConfidence(0);
        
        // Set maximum listening time (45 seconds)
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ Maximum listening time reached');
          if (recognitionRef.current && !isStoppingRef.current) {
            try {
              isStoppingRef.current = true;
              recognitionRef.current.stop();
            } catch (e) {
              console.log('Recognition already stopped during timeout');
            }
          }
        }, 45000);
      };

      recognition.onresult = (event: any) => {
        if (isStoppingRef.current) {
          console.log('Recognition is stopping, ignoring result');
          return;
        }

        console.log('🗣️ Speech recognition result with VAD context');
        
        let interimTranscript = '';
        let newFinalTranscript = '';
        let maxConfidence = 0;

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.8;
          
          if (result.isFinal) {
            newFinalTranscript += transcript;
            maxConfidence = Math.max(maxConfidence, confidence);
            console.log('✅ Final result with VAD:', transcript);
          } else {
            interimTranscript += transcript;
          }
        }

        // Update final transcript accumulator
        if (newFinalTranscript) {
          finalTranscriptRef.current += newFinalTranscript;
        }

        // Update current transcript
        const currentTranscript = (finalTranscriptRef.current + ' ' + interimTranscript).trim();
        if (currentTranscript) {
          setTranscript(currentTranscript);
          setConfidence(maxConfidence || 0.8);
          console.log('📝 VAD-enhanced transcript:', currentTranscript);
        }

        // Clear previous silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Enhanced silence detection using VAD
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('🤐 Checking speech completion with VAD...');
          
          // Check both transcript length and VAD speech detection
          const hasSubstantialContent = currentTranscript.length > 15;
          const vadIndicatesNoSpeech = !speechDetectedRef.current;
          
          console.log('📊 Speech completion analysis:', {
            transcriptLength: currentTranscript.length,
            hasSubstantialContent,
            vadSpeechDetected: speechDetectedRef.current,
            vadIndicatesNoSpeech,
            voiceActivity: voiceActivity
          });
          
          // Only stop if we have content AND VAD indicates no speech
          if (hasSubstantialContent && vadIndicatesNoSpeech && !isStoppingRef.current) {
            console.log('✅ VAD confirms speech completion - stopping recognition');
            isStoppingRef.current = true;
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.log('Recognition already stopped');
              }
            }
          } else if (!hasSubstantialContent) {
            console.log('⚠️ Insufficient content, continuing to listen...');
          } else if (!vadIndicatesNoSpeech) {
            console.log('🗣️ VAD still detects speech activity, continuing...');
          }
        }, 3000); // 3 seconds of silence + VAD confirmation
      };

      recognition.onerror = (event: any) => {
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
        
        setIsListening(false);
        isStoppingRef.current = false;
        
        // Clear timeouts
        [timeoutRef, silenceTimeoutRef].forEach(ref => {
          if (ref.current) {
            clearTimeout(ref.current);
            ref.current = null;
          }
        });

        // Auto-restart for certain errors if we haven't captured much
        if (shouldRestart && finalTranscriptRef.current.trim().length < 15) {
          console.log('🔄 Auto-restarting with VAD...');
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 2000);
        }
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        isStoppingRef.current = false;
        
        // Stop VAD
        stopVoiceActivityDetection();
        
        // Clear timeouts
        [timeoutRef, silenceTimeoutRef].forEach(ref => {
          if (ref.current) {
            clearTimeout(ref.current);
            ref.current = null;
          }
        });

        // Set final transcript
        if (finalTranscriptRef.current.trim()) {
          console.log('📝 Setting final VAD-enhanced transcript:', finalTranscriptRef.current.trim());
          setTranscript(finalTranscriptRef.current.trim());
        }
      };

      recognition.onspeechstart = () => {
        console.log('🗣️ Speech detected by recognition API');
        setError(null);
        
        // Clear silence timeout when speech starts
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };

      recognition.onspeechend = () => {
        console.log('🤐 Speech ended by recognition API');
        // Don't stop immediately, let VAD and silence timeout handle it
      };

      recognitionRef.current = recognition;
      
      // Start recognition
      recognition.start();
      console.log('🚀 VAD-enhanced speech recognition started');
      
    } catch (err: any) {
      console.error('💥 Error starting speech recognition:', err);
      setError('Failed to start speech recognition: ' + err.message);
      setIsListening(false);
      isStoppingRef.current = false;
      stopVoiceActivityDetection();
    }
  }, [isSupported, setupVoiceActivityDetection, stopVoiceActivityDetection, voiceActivity]);

  const stopListening = useCallback(() => {
    console.log('🛑 Manually stopping VAD-enhanced speech recognition...');
    
    isStoppingRef.current = true;
    
    // Clear all timeouts
    [timeoutRef, silenceTimeoutRef, restartTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
    
    // Stop VAD
    stopVoiceActivityDetection();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('✅ Speech recognition stop() called');
      } catch (e) {
        console.log('Recognition already stopped or error stopping:', e);
      }
    }
    setIsListening(false);
  }, [stopVoiceActivityDetection]);

  const resetTranscript = useCallback(() => {
    console.log('🔄 Resetting transcript and VAD state');
    setTranscript('');
    setError(null);
    setConfidence(0);
    setIsSpeaking(false);
    setVoiceActivity(0);
    finalTranscriptRef.current = '';
    isStoppingRef.current = false;
    speechDetectedRef.current = false;
    lastSpeechTimeRef.current = 0;
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    confidence,
    isSpeaking,
    voiceActivity
  };
};