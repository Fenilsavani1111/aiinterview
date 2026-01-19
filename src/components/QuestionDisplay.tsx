import React from 'react';
import {
  MessageCircle,
  Loader2,
  Mic,
  MicOff,
  Clock,
  Activity,
} from 'lucide-react';

interface QuestionDisplayProps {
  question: string | any;
  isProcessing: boolean;
  isListening: boolean;
  waitingForAnswer: boolean;
  transcript: string;
  textAnswer?: string;
  onTextAnswerChange?: (value: string) => void;
  onSubmitTextAnswer?: () => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  isProcessing,
  isListening,
  waitingForAnswer,
  transcript,
  textAnswer = '',
  onTextAnswerChange,
  onSubmitTextAnswer,
}) => {
  // Safely extract question text, type, and options
  const questionText =
    typeof question === 'string' ? question : question?.question || '';
  const questionType =
    typeof question === 'string' ? null : question?.type?.toLowerCase() || null;
  const isCommunicationQuestion = questionType === 'communication';
  const options: string[] =
    Array.isArray((question as any)?.options) && (question as any).options.length > 0
      ? (question as any).options
      : [];
  const hasOptions = !isCommunicationQuestion && options.length > 0;

  const getTranscriptWordCount = () => {
    return transcript
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const isTranscriptSubstantial = () => {
    const wordCount = getTranscriptWordCount();
    return transcript.trim().length >= 15 && wordCount >= 4;
  };

  const getTranscriptStatus = () => {
    const length = transcript.trim().length;
    const wordCount = getTranscriptWordCount();

    if (length >= 40 && wordCount >= 10) {
      return {
        status: 'excellent',
        message: '🎤 Excellent detail!',
        color: 'text-green-600',
      };
    } else if (length >= 25 && wordCount >= 6) {
      return {
        status: 'good',
        message: '✅ Good length',
        color: 'text-blue-600',
      };
    } else if (length >= 15 && wordCount >= 4) {
      return {
        status: 'adequate',
        message: '👍 Adequate - VAD will detect when done',
        color: 'text-yellow-600',
      };
    } else {
      return {
        status: 'short',
        message: 'Keep talking...',
        color: 'text-orange-600',
      };
    }
  };

  return (
    <div className='bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white'>
          <MessageCircle className='w-6 h-6' />
        </div>
        <h2 className='text-xl font-semibold text-gray-800'>
          {isCommunicationQuestion
            ? '🎤 Voice Question'
            : '📝 Written Assessment'}
        </h2>
        {isCommunicationQuestion && (
          <div className='ml-auto flex items-center gap-2 text-sm text-gray-500'>
            <Activity className='w-4 h-4' />
            <span>Voice Activity Detection</span>
          </div>
        )}
      </div>

      {questionText ? (
        <div className='space-y-6'>
          <div className='p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100'>
            <p className='text-lg text-gray-800 leading-relaxed'>
              {questionText}
            </p>
          </div>

          {/* Options or Text Input for Non-Communication Questions */}
          {!isCommunicationQuestion && (
            <div className='space-y-4'>
              {hasOptions ? (
                <>
                  <div className='p-4 bg-blue-50 border border-blue-200 rounded-xl'>
                    <p className='text-sm text-blue-700 mb-3'>
                      💡 <strong>Select one option:</strong> Choose the best
                      answer below.
                    </p>
                  </div>
                  <div className='space-y-3'>
                    <label className='block text-sm font-medium text-gray-700'>
                      Your Answer:
                    </label>
                    <div
                      className='space-y-2'
                      role='radiogroup'
                      aria-label='Select an option'
                    >
                      {options.map((opt, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${textAnswer === opt
                              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                            }`}
                        >
                          <input
                            type='radio'
                            name='question-option'
                            value={opt}
                            checked={textAnswer === opt}
                            onChange={() => onTextAnswerChange?.(opt)}
                            disabled={isProcessing}
                            className='mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                          />
                          <span className='text-gray-800 flex-1'>{opt}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={onSubmitTextAnswer}
                      disabled={isProcessing || !textAnswer.trim()}
                      className='w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg'
                    >
                      {isProcessing ? 'Processing...' : 'Submit Answer'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className='p-4 bg-blue-50 border border-blue-200 rounded-xl'>
                    <p className='text-sm text-blue-700 mb-3'>
                      💡 <strong>Written Assessment:</strong> Please type your
                      answer in the text area below.
                    </p>
                  </div>
                  <div className='space-y-3'>
                    <label className='block text-sm font-medium text-gray-700'>
                      Your Answer:
                    </label>
                    <textarea
                      value={textAnswer}
                      onChange={(e) => onTextAnswerChange?.(e.target.value)}
                      placeholder='Type your answer here...'
                      className='w-full min-h-[200px] p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-y text-gray-800 placeholder-gray-400'
                      disabled={isProcessing}
                    />
                    <div className='flex justify-between items-center text-xs text-gray-500'>
                      <span>
                        {textAnswer.length} characters,{' '}
                        {
                          textAnswer
                            .trim()
                            .split(/\s+/)
                            .filter((w) => w.length > 0).length
                        }{' '}
                        words
                      </span>
                      <span
                        className={
                          textAnswer.trim().length >= 50
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }
                      >
                        {textAnswer.trim().length >= 50
                          ? '✓ Ready to submit'
                          : 'Minimum 50 characters recommended'}
                      </span>
                    </div>
                    <button
                      onClick={onSubmitTextAnswer}
                      disabled={isProcessing || textAnswer.trim().length < 10}
                      className='w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg'
                    >
                      {isProcessing ? 'Processing...' : 'Submit Answer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Voice Input for Communication Questions */}
          {isCommunicationQuestion && (
            <>
              {/* Waiting for Answer State */}
              {waitingForAnswer && !isListening && (
                <div className='p-4 bg-yellow-50 border border-yellow-200 rounded-xl'>
                  <div className='flex items-center gap-3 mb-2'>
                    <Clock className='w-5 h-5 text-yellow-600 animate-spin' />
                    <span className='font-medium text-yellow-800'>
                      🎤 Setting up VAD - preparing to listen...
                    </span>
                  </div>
                  <p className='text-sm text-yellow-700'>
                    Voice Activity Detection will monitor when you're speaking
                  </p>
                </div>
              )}

              {/* Listening State - VAD ENHANCED */}
              {isListening && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">

                  {/* HEADER */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex items-center justify-center">
                      <Mic className="w-5 h-5 text-emerald-600" />
                      <span className="absolute w-8 h-8 rounded-full bg-emerald-400/20 animate-ping"></span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Voice Detection Active
                      </p>
                      <p className="text-xs text-slate-500">
                        Speak naturally — pauses are allowed
                      </p>
                    </div>

                    {/* VOICE BARS */}
                    <div className="ml-auto flex items-end gap-1">
                      <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="w-1 h-6 bg-emerald-400 rounded-full animate-pulse delay-100"></span>
                      <span className="w-1 h-8 bg-emerald-500 rounded-full animate-pulse delay-200"></span>
                    </div>
                  </div>

                  {/* TRANSCRIPT STATUS */}
                  {transcript ? (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          {getTranscriptWordCount()} words
                        </span>

                        <span
                          className={`font-medium ${isTranscriptSubstantial()
                            ? 'text-emerald-600'
                            : 'text-amber-500'
                            }`}
                        >
                          {isTranscriptSubstantial()
                            ? 'Ready for evaluation'
                            : 'Keep speaking'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center">
                      Waiting for voice input…
                    </p>
                  )}

                </div>

              )}

              {/* Processing State */}
              {isProcessing && (
                <div className='p-4 bg-blue-50 border border-blue-200 rounded-xl'>
                  <div className='flex items-center gap-3'>
                    <Loader2 className='w-5 h-5 text-blue-600 animate-spin' />
                    <span className='font-medium text-blue-800'>
                      🎤 VAD detected completion - processing your answer...
                    </span>
                  </div>
                  <p className='text-sm text-blue-700 mt-1'>
                    Voice Activity Detection confirmed you finished speaking
                  </p>
                </div>
              )}

              {/* Idle State */}
              {!isListening && !isProcessing && !waitingForAnswer && (
                <div className='p-4 bg-gray-50 border border-gray-200 rounded-xl'>
                  <div className='flex items-center gap-3'>
                    <MicOff className='w-5 h-5 text-gray-500' />
                    <span className='font-medium text-gray-700'>
                      🎤 VAD standby - preparing next question...
                    </span>
                  </div>
                  <p className='text-sm text-gray-600 mt-1'>
                    Voice Activity Detection ready for next interaction
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className='flex items-center justify-center h-32'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 text-gray-400 animate-spin mx-auto mb-2' />
            <p className='text-gray-500'>🎤 Loading VAD question...</p>
            <p className='text-sm text-gray-400 mt-1'>
              Voice Activity Detection initializing
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
