import { useState, useRef, useCallback } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  play: (audioBlob: Blob) => Promise<void>;
  stop: () => void;
  duration: number;
  currentTime: number;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const play = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Wait for audio to be ready to play
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => {
          setDuration(audio.duration);
          resolve();
        };

        audio.onerror = () => {
          reject(new Error('Failed to load audio'));
        };

        audio.load();
      });

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    play,
    stop,
    duration,
    currentTime,
  };
};
