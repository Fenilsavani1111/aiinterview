import React from 'react';
import { Mic, MicOff, Volume2, Brain, Square, Clock } from 'lucide-react';

interface InterviewControlsProps {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingAudio: boolean;
  waitingForAnswer: boolean;
  onEndInterview: () => void;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  isListening,
  isProcessing,
  isPlayingAudio,
  waitingForAnswer,
  onEndInterview
}) => {
  const getStatus = () => {
    if (isProcessing) {
      return {
        icon: <Brain className="w-5 h-5" />,
        text: 'Processing your answer...',
        className: 'bg-blue-50 border-blue-200 text-blue-700',
        subtext: 'AI is evaluating your response'
      };
    }
    
    if (isPlayingAudio) {
      return {
        icon: <Volume2 className="w-5 h-5" />,
        text: 'AI is speaking...',
        className: 'bg-purple-50 border-purple-200 text-purple-700',
        subtext: 'Listen to the question or feedback'
      };
    }
    
    if (isListening) {
      return {
        icon: <Mic className="w-5 h-5 animate-pulse" />,
        text: 'Listening for your answer...',
        className: 'bg-green-50 border-green-200 text-green-700',
        subtext: 'Speak clearly into your microphone'
      };
    }

    if (waitingForAnswer) {
      return {
        icon: <Clock className="w-5 h-5 animate-spin" />,
        text: 'Preparing to listen...',
        className: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        subtext: 'Get ready to answer'
      };
    }

    return {
      icon: <MicOff className="w-5 h-5" />,
      text: 'Waiting...',
      className: 'bg-gray-50 border-gray-200 text-gray-600',
      subtext: 'Standby for next question'
    };
  };

  const status = getStatus();

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Interview Status</h3>
      
      <div className={`flex flex-col gap-3 p-4 border rounded-xl mb-6 ${status.className}`}>
        <div className="flex items-center gap-3">
          {status.icon}
          <span className="font-medium">{status.text}</span>
        </div>
        <p className="text-sm opacity-80 ml-8">{status.subtext}</p>
      </div>

      {/* Visual indicator for listening state */}
      {isListening && (
        <div className="mb-6 p-3 bg-green-100 border border-green-300 rounded-xl">
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-6 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-2 h-6 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-green-700 font-medium text-sm">Recording your voice...</span>
          </div>
        </div>
      )}

      <button
        onClick={onEndInterview}
        className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
      >
        <div className="flex items-center justify-center gap-2">
          <Square className="w-5 h-5" />
          End Interview
        </div>
      </button>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {isListening ? 'Speak now - your voice is being recorded' : 'Wait for the green microphone indicator'}
        </p>
      </div>
    </div>
  );
};