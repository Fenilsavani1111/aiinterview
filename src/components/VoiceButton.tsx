import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isConversationActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing,
  isConversationActive,
  onToggle,
  disabled = false
}) => {
  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isListening) return 'Listening...';
    if (isConversationActive) return 'End Conversation';
    return 'Start Conversation';
  };

  const getButtonIcon = () => {
    if (isProcessing) return <Loader2 className="w-6 h-6 animate-spin" />;
    if (isConversationActive) return <MicOff className="w-6 h-6" />;
    return <Mic className="w-6 h-6" />;
  };

  return (
    <button
      onClick={onToggle}
      disabled={disabled || isProcessing}
      className={`
        relative w-full px-8 py-4 rounded-2xl font-semibold text-lg
        transition-all duration-300 transform hover:scale-105
        focus:outline-none focus:ring-4 focus:ring-blue-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${isConversationActive 
          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
        }
        ${isListening ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-center justify-center gap-3">
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </div>
      
      {isListening && (
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping"></div>
          <div className="absolute inset-2 rounded-xl bg-white/10 animate-ping animation-delay-200"></div>
          <div className="absolute inset-4 rounded-lg bg-white/5 animate-ping animation-delay-400"></div>
        </div>
      )}
    </button>
  );
};