import React from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

const MIN_CHARS = 10;
const MIN_WORDS = 3;

interface QuestionDisplayProps {
  isCommunicationQuestion: boolean;
  currentQuestion: any;
  isAnalyzing: boolean;
  isProcessingResponse: boolean;
  isGeneratingAudio: boolean;
  isPlaying: boolean;
  isListening: boolean;
  waitingForAnswer: boolean;
  transcript: string;
  textAnswer: string;
  setTextAnswer: (text: string) => void;
  handleNextQuestion: (text: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  isCommunicationQuestion,
  currentQuestion,
  isAnalyzing,
  isProcessingResponse,
  isGeneratingAudio,
  isPlaying,
  isListening,
  waitingForAnswer,
  transcript,
  textAnswer,
  setTextAnswer,
  handleNextQuestion,
}) => {

  return (
    <>
      {isCommunicationQuestion ? (
        /* Communication: Interview Question card */
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
            🗣{" "}
            <span className="text-indigo-600">
              Interview Question
            </span>
          </h2>
          <p className="text-slate-700 leading-relaxed mb-8 text-base">
            {currentQuestion?.question ?? "..."}
          </p>

          {/* Listening status (client_example) */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-600 font-medium text-sm">
                {isAnalyzing || isProcessingResponse
                  ? "⏳ Processing your answer..."
                  : isGeneratingAudio || isPlaying
                    ? "🔊 AI is speaking..."
                    : isListening
                      ? "🎧 System is Listening"
                      : waitingForAnswer
                        ? "⏳ Preparing to listen..."
                        : "🎧 Waiting..."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isListening || waitingForAnswer
                  ? "Speak naturally — pauses are allowed"
                  : "Listen or wait for the cue"}
              </p>
            </div>
            <div className="flex items-end gap-1">
              {[4, 7, 10, 6].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-indigo-500 rounded-full animate-pulse"
                  style={{
                    height: `${h * 2}px`,
                    animationDelay: `${i * 75}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Restriction: min chars & words */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/80">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Minimum <strong>10 characters</strong> and <strong>3 words</strong> to submit.
            </p>
          </div>

          {/* Tips (client_example) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
              🎤 Speak clearly at a steady pace
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
              🧠 Take time to structure your response
            </div>
          </div>

          {/* Spoken word and character count */}
          <div className="my-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">
              What you spoke
            </p>
            {transcript ? (
              <>
                {(() => {
                  const t = transcript.trim();
                  const words = t.split(/\s+/).filter(Boolean).length;
                  const chars = t.length;
                  const needWords = Math.max(0, MIN_WORDS - words);
                  const needChars = Math.max(0, MIN_CHARS - chars);
                  const meets = needWords === 0 && needChars === 0;
                  const parts: string[] = [];
                  if (needWords > 0) parts.push(`${needWords} more word(s)`);
                  if (needChars > 0) parts.push(`${needChars} more character(s)`);
                  return (
                    <>
                      <p className="text-sm text-gray-800">
                        {words} words · {chars} characters
                      </p>
                      <p className={`text-xs mt-1 flex items-center gap-1 ${meets ? "text-emerald-600" : "text-amber-600"}`}>
                        {meets ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {meets ? "Meets minimum (3+ words, 10+ characters)" : `Need ${parts.join(", ")}`}
                      </p>
                    </>
                  );
                })()}
              </>
            ) : (
              <p className="text-sm text-slate-400">0 words · 0 characters</p>
            )}
          </div>

          {/* Type answer (optional) */}
          {!isCommunicationQuestion && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">
                Or type your answer (optional)
              </p>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type here..."
                className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm"
              />
              <button
                type="button"
                onClick={() => handleNextQuestion(textAnswer)}
                disabled={isAnalyzing || isProcessingResponse}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Non-communication: Written Assessment or MCQ */
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-amber-700">
                {currentQuestion?.options &&
                  currentQuestion.options.length > 0
                  ? "Multiple Choice"
                  : "Written Assessment"}
              </h2>
            </div>
            <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-4">
              {currentQuestion?.question ?? "..."}
            </p>
            {currentQuestion?.options &&
              currentQuestion.options.length > 0 ? (
              /* MCQ: options only, no textarea */
              <>
                <p className="text-sm text-amber-600/90 mb-3">
                  Select one option:
                </p>
                <div
                  className="space-y-2 mb-4"
                  role="radiogroup"
                  aria-label="Select an option"
                >
                  {currentQuestion.options.map((opt: string, idx: number) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${textAnswer === opt
                        ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                        : "border-amber-200 hover:border-amber-300 bg-white"
                        }`}
                    >
                      <input
                        type="radio"
                        name="question-option"
                        value={opt}
                        checked={textAnswer === opt}
                        onChange={() => setTextAnswer(opt)}
                        disabled={
                          isAnalyzing || isProcessingResponse
                        }
                        className="mt-1 w-4 h-4 text-amber-600 border-amber-300 focus:ring-amber-500"
                      />
                      <span className="text-gray-800 flex-1">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleNextQuestion(textAnswer)}
                  disabled={
                    isAnalyzing ||
                    isProcessingResponse ||
                    !textAnswer.trim()
                  }
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                >
                  Submit
                </button>
              </>
            ) : (
              /* Text: textarea */
              <>
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/80 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Take your time and type your answer below. Minimum <strong>10 characters</strong> and <strong>3 words</strong> to submit.
                  </p>
                </div>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full min-h-[160px] px-4 py-3 rounded-xl border-2 border-amber-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 text-gray-800"
                />
                {(() => {
                  const trimmed = textAnswer.trim();
                  const words = trimmed.split(/\s+/).filter(Boolean).length;
                  const chars = trimmed.length;
                  const meets = chars >= MIN_CHARS && words >= MIN_WORDS;
                  return (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-600">{words} words · {chars} characters</p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${meets ? "text-emerald-600" : "text-amber-600"}`}>
                          {meets ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {meets ? "Meets minimum (3+ words, 10+ characters)" : `Need min ${MIN_WORDS} words, ${MIN_CHARS} characters`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNextQuestion(textAnswer)}
                        disabled={isAnalyzing || isProcessingResponse || !meets}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                      >
                        {isAnalyzing || isProcessingResponse ? "Processing..." : "Submit"}
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
