import React from 'react';
import { Mic, Volume2, Brain, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingAudio: boolean;
  error: string | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isListening,
  isProcessing,
  isPlayingAudio,
  error
}) => {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  const getStatus = () => {
    if (isProcessing) {
      return {
        icon: <Brain className="w-5 h-5" />,
        text: 'Processing your request...',
        className: 'bg-blue-50 border-blue-200 text-blue-700'
      };
    }
    
    if (isPlayingAudio) {
      return {
        icon: <Volume2 className="w-5 h-5" />,
        text: 'Playing response (you can interrupt)...',
        className: 'bg-purple-50 border-purple-200 text-purple-700'
      };
    }
    
    if (isListening) {
      return {
        icon: <Mic className="w-5 h-5 animate-pulse" />,
        text: 'Listening for your voice...',
        className: 'bg-green-50 border-green-200 text-green-700'
      };
    }

    return {
      icon: <Mic className="w-5 h-5 opacity-50" />,
      text: 'Ready to listen...',
      className: 'bg-gray-50 border-gray-200 text-gray-600'
    };
  };

  const status = getStatus();

  return (
    <div className={`flex items-center justify-center gap-3 p-4 border rounded-xl transition-all duration-300 ${status.className}`}>
      {status.icon}
      <span className="font-medium">{status.text}</span>
    </div>
  );
};