import React from 'react';
import { MessageCircle, Loader2, Mic, MicOff, Volume2, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface QuestionDisplayProps {
  question: string;
  isProcessing: boolean;
  isListening: boolean;
  waitingForAnswer: boolean;
  transcript: string;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  isProcessing,
  isListening,
  waitingForAnswer,
  transcript
}) => {
  const getTranscriptWordCount = () => {
    return transcript.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const isTranscriptSubstantial = () => {
    const wordCount = getTranscriptWordCount();
    return transcript.trim().length >= 15 && wordCount >= 4;
  };

  const getTranscriptStatus = () => {
    const length = transcript.trim().length;
    const wordCount = getTranscriptWordCount();
    
    if (length >= 40 && wordCount >= 10) {
      return { status: 'excellent', message: '🎤 Excellent detail!', color: 'text-green-600' };
    } else if (length >= 25 && wordCount >= 6) {
      return { status: 'good', message: '✅ Good length', color: 'text-blue-600' };
    } else if (length >= 15 && wordCount >= 4) {
      return { status: 'adequate', message: '👍 Adequate - VAD will detect when done', color: 'text-yellow-600' };
    } else {
      return { status: 'short', message: 'Keep talking...', color: 'text-orange-600' };
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white">
          <MessageCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">🎤 VAD Question</h2>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>Voice Activity Detection</span>
        </div>
      </div>

      {question ? (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <p className="text-lg text-gray-800 leading-relaxed">{question}</p>
          </div>

          {/* Waiting for Answer State */}
          {waitingForAnswer && !isListening && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
                <span className="font-medium text-yellow-800">🎤 Setting up VAD - preparing to listen...</span>
              </div>
              <p className="text-sm text-yellow-700">Voice Activity Detection will monitor when you're speaking</p>
            </div>
          )}

          {/* Listening State - VAD ENHANCED */}
          {isListening && (
            <div className="p-6 bg-green-50 border-2 border-green-300 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Mic className="w-7 h-7 text-green-600" />
                  <div className="absolute -inset-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="font-bold text-green-800 text-xl">🎤 VAD LISTENING - Speak Naturally!</span>
                <div className="flex gap-1 ml-auto">
                  <div className="w-3 h-8 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-10 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-3 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-3 h-7 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              
              <div className="bg-green-100 p-4 rounded-lg mb-4">
                <p className="text-green-800 font-bold text-center text-lg">
                  🗣️ SPEAK YOUR COMPLETE ANSWER - VAD will detect when you finish!
                </p>
                <p className="text-green-700 text-center mt-2">
                  🎤 Take your time - the system knows when you're still speaking vs. when you're done
                </p>
              </div>

              {transcript && (
                <div className="mt-4 p-5 bg-white rounded-lg border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 font-semibold">🎤 Live VAD Transcript:</span>
                    <div className="flex items-center gap-1">
                      {isTranscriptSubstantial() ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className={`text-xs font-medium ${getTranscriptStatus().color}`}>
                            {getTranscriptStatus().message}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-orange-600 font-medium">Continue speaking...</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg mb-3">
                    <p className="text-gray-800 font-medium text-lg leading-relaxed">"{transcript}"</p>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-green-600">
                      🎤 {transcript.length} chars, {getTranscriptWordCount()} words
                    </span>
                    <span className={`font-medium ${getTranscriptStatus().color}`}>
                      {isTranscriptSubstantial() ? '✓ VAD will process when you finish speaking' : 'Keep going for better evaluation...'}
                    </span>
                  </div>
                  <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700">
                    🎤 <strong>VAD Active:</strong> System detects voice activity - no need to rush, speak naturally!
                  </div>
                </div>
              )}
              
              {!transcript && (
                <div className="mt-4 p-4 bg-white/50 rounded-lg border border-green-200">
                  <p className="text-green-700 text-center font-medium">
                    🎤 VAD waiting for your voice... Speak naturally and completely
                  </p>
                  <p className="text-green-600 text-xs text-center mt-2">
                    🎤 Voice Activity Detection active - system will know when you're finished speaking
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-blue-800">🎤 VAD detected completion - processing your answer...</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">Voice Activity Detection confirmed you finished speaking</p>
            </div>
          )}

          {/* Idle State */}
          {!isListening && !isProcessing && !waitingForAnswer && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <MicOff className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">🎤 VAD standby - preparing next question...</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Voice Activity Detection ready for next interaction</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">🎤 Loading VAD question...</p>
            <p className="text-sm text-gray-400 mt-1">Voice Activity Detection initializing</p>
          </div>
        </div>
      )}
    </div>
  );
};