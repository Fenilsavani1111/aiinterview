import { useState, useRef, useCallback } from 'react';

interface AudioPlayerHook {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (audioUrl: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

export const useAudioPlayer = (): AudioPlayerHook => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Stop and properly cleanup current audio if playing
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Handle browser TTS special case
        if (audioUrl.startsWith('browser-tts://')) {
          const text = decodeURIComponent(audioUrl.replace('browser-tts://', ''));
          console.log('🔊 Playing browser TTS:', text);
          
          // Cancel any ongoing speech
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;
            
            // Try to use a good English voice
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(voice => 
              voice.lang.startsWith('en') && 
              (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Alex'))
            ) || voices.find(voice => voice.lang.startsWith('en'));
            
            if (englishVoice) {
              utterance.voice = englishVoice;
            }

            utterance.onstart = () => {
              setIsPlaying(true);
              console.log('🔊 Browser TTS playback started');
            };

            utterance.onend = () => {
              setIsPlaying(false);
              setCurrentTime(0);
              console.log('✅ Browser TTS playback ended');
              resolve();
            };

            utterance.onerror = (event) => {
              const errorMessage = `Browser TTS playback error: ${event.error}`;
              console.error('❌', errorMessage);
              setIsPlaying(false);
              reject(new Error(errorMessage));
            };

            window.speechSynthesis.speak(utterance);
            return;
          } else {
            reject(new Error('Speech synthesis not supported in this browser'));
            return;
          }
        }

        // Handle regular audio URLs
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        currentAudioRef.current = audio;

        let hasResolved = false;

        const cleanup = () => {
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
        };

        audio.addEventListener('loadedmetadata', () => {
          if (currentAudioRef.current === audio) {
            setDuration(audio.duration);
          }
        });

        audio.addEventListener('timeupdate', () => {
          if (currentAudioRef.current === audio) {
            setCurrentTime(audio.currentTime);
          }
        });

        audio.addEventListener('ended', () => {
          if (currentAudioRef.current === audio) {
            setIsPlaying(false);
            setCurrentTime(0);
            cleanup();
            if (!hasResolved) {
              hasResolved = true;
              resolve();
            }
          }
        });

        audio.addEventListener('error', (e) => {
          let errorMessage = 'Unknown audio playback error';
          
          if (audio.error) {
            const mediaError = audio.error;
            switch (mediaError.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio playback was aborted';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error occurred while loading audio';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio decoding error';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported';
                break;
              default:
                errorMessage = `Audio error (code: ${mediaError.code})`;
            }
            if (mediaError.message) {
              errorMessage += `: ${mediaError.message}`;
            }
          }

          console.error('❌ Audio playback error:', errorMessage);
          
          if (currentAudioRef.current === audio) {
            setIsPlaying(false);
            cleanup();
          }
          
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(errorMessage));
          }
        });

        // Set up success handler for when audio starts playing
        audio.addEventListener('canplaythrough', () => {
          if (currentAudioRef.current === audio && !hasResolved) {
            hasResolved = true;
            resolve();
          }
        }, { once: true });

        setIsPlaying(true);
        
        // Start playing the audio
        audio.play().catch((playError) => {
          const errorMessage = `Failed to start audio playback: ${playError.message}`;
          console.error('❌', errorMessage);
          setIsPlaying(false);
          cleanup();
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(errorMessage));
          }
        });

        console.log('🔊 Audio playback initiated');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during audio setup';
        console.error('❌ Error setting up audio:', errorMessage);
        setIsPlaying(false);
        if (audioRef.current && currentAudioRef.current === audioRef.current) {
          currentAudioRef.current = null;
        }
        reject(new Error(errorMessage));
      }
    });
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // Also pause browser TTS
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      audioRef.current = null;
      currentAudioRef.current = null;
    }
    // Also stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    setVolume
  };
};