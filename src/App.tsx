import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Mic, Brain, Clock, Award } from 'lucide-react';
import { CameraView } from './components/CameraView';
import { InterviewControls } from './components/InterviewControls';
import { QuestionDisplay } from './components/QuestionDisplay';
import { InterviewProgress } from './components/InterviewProgress';
import { InterviewSummary } from './components/InterviewSummary';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useCamera } from './hooks/useCamera';
import { processPhysicsQuestion, textToSpeech } from './services/apiService';
import { physicsQuestions } from './data/physicsQuestions';
import './App.css';
import NameEmailModal from './components/NameEmailModal';
import axios from 'axios';


interface InterviewSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  questions: QuestionResponse[];
  currentQuestionIndex: number;
  score: number;
  status: 'waiting' | 'active' | 'completed';
}

interface QuestionResponse {
  question: string;
  userAnswer: string;
  aiEvaluation: string;
  score: number;
  timestamp: Date;
  responseTime: number;
}

const App: React.FC = () => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
console.log(fetchQueData)
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("token")) {
      setShowModal(true);
    }
  }, []);

  const handleModalSubmit = async (name: string, email: string) => {

    try {
      const response = await axios.post(`${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/join-job-link`, {
        token: new URLSearchParams(window.location.search).get("token"),
        user: email
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
       if (response.data) {
         setShowModal(false);
         setFetchQueData(response.data)
         if (response.data.questions && Array.isArray(response.data.questions)) {
           setInterviewQuestions(response.data.questions);
           setCurrentQuestion(response.data.questions[0]);
         }
       }
      // You can handle the response here (e.g., save data, show a message, etc.)
      console.log('Join job link response:', response.data);
    } catch (error) {
      // Handle error (show error message, etc.)
      console.error('Error joining job link:', error);
    }
  };


  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
    confidence,
    isSpeaking,
    voiceActivity
  } = useSpeechRecognition();

  const {
    isPlaying: isPlayingAudio,
    play: playAudio,
    stop: stopAudio
  } = useAudioPlayer();

  const {
    stream,
    isRecording,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    error: cameraError
  } = useCamera();

  // Test microphone access on component mount
  useEffect(() => {
    const testMicrophone = async () => {
      try {
        console.log('🎤 Testing microphone access...');
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        console.log('✅ Microphone test successful');
        
        testStream.getTracks().forEach(track => track.stop());
        setMicrophoneReady(true);
      } catch (error) {
        console.error('❌ Microphone test failed:', error);
        setMicrophoneReady(false);
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      testMicrophone();
    }
  }, []);

  // Initialize interview session
  const startInterview = useCallback(async () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!microphoneReady) {
      alert('Microphone is not ready. Please allow microphone access and refresh the page.');
      return;
    }

    try {
      console.log('🚀 Starting interview...');
      
      // Test microphone access
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      console.log('✅ Microphone access confirmed');
      testStream.getTracks().forEach(track => track.stop());
      
      // Start camera
      try {
        await startCamera();
        console.log('✅ Camera started');
      } catch (error) {
        console.warn('⚠️ Camera failed to start, continuing without camera');
      }
      
      // Create new session
      const newSession: InterviewSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        status: 'active'
      };

      setSession(newSession);
      setInterviewStarted(true);
      
      // Start recording in background
      setTimeout(async () => {
        try {
          await startRecording();
          console.log('✅ Recording started');
        } catch (error) {
          console.log('⚠️ Recording failed, continuing without recording');
        }
      }, 500);

      // Start first question after a short delay
      setTimeout(() => {
        console.log('⚡ Starting first question...');
        askNextQuestion(newSession);
      }, 2000);

    } catch (error) {
      console.error('💥 Error starting interview:', error);
      alert('Failed to start interview. Please check permissions and try again.');
    }
  }, [isSupported, startCamera, startRecording, microphoneReady]);

  // Simplified question asking
  const askNextQuestion = useCallback(async (currentSession: InterviewSession) => {
    console.log('❓ Asking question', currentSession.currentQuestionIndex + 1);
    
    if (currentSession.currentQuestionIndex >= interviewQuestions.length) {
      console.log('🏁 Interview completed');
      endInterview();
      return;
    }

    const questionObj = interviewQuestions[currentSession.currentQuestionIndex];
    setCurrentQuestion(questionObj);
    setQuestionStartTime(Date.now());
    setWaitingForAnswer(false);
    setAudioPlaying(false);
    
    resetTranscript();

    try {
      console.log('🔊 Playing question...');
      setAudioPlaying(true);
      
      const voiceResponse = await textToSpeech(questionObj.question);
      
      if (voiceResponse) {
        console.log('🎵 Playing question audio...');
        await playAudio(voiceResponse.audioUrl);
        console.log('✅ Question audio completed');
      } else {
        console.log('⚠️ No audio, using delay');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      setAudioPlaying(false);
      
      // Start listening after audio completes
      console.log('🎤 Starting to listen for answer...');
      setWaitingForAnswer(true);
      
      setTimeout(() => {
        console.log('🎤 Beginning speech recognition...');
        startListening();
        
        // Set timeout for question (45 seconds)
        questionTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Question timeout reached');
          handleQuestionTimeout();
        }, 45000);
      }, 1000);

    } catch (error) {
      console.error('💥 Error with question:', error);
      setAudioPlaying(false);
      
      // Continue without audio
      setTimeout(() => {
        console.log('🎤 Starting listening (no audio)...');
        setWaitingForAnswer(true);
        
        setTimeout(() => {
          startListening();
          
          questionTimeoutRef.current = setTimeout(() => {
            handleQuestionTimeout();
          }, 45000);
        }, 1000);
      }, 2000);
    }
  }, [playAudio, startListening, resetTranscript]);

  // Simplified answer processing
  const handleAnswer = useCallback(async (answer: string) => {
    if (!session || !currentQuestion || !waitingForAnswer) {
      console.log('❌ Not ready to handle answer');
      return;
    }

    const trimmedAnswer = answer.trim();
    if (trimmedAnswer.length < 10) {
      console.log('⚠️ Answer too short, waiting for more:', trimmedAnswer);
      return;
    }

    const wordCount = trimmedAnswer.split(/\s+/).length;
    if (wordCount < 3) {
      console.log('⚠️ Answer has too few words, waiting for more. Words:', wordCount);
      return;
    }

    // Check VAD if available, but don't block on it
    if (isSpeaking && voiceActivity > 20) {
      console.log('🗣️ User still speaking (VAD), waiting...');
      return;
    }

    console.log('✅ Processing answer:', trimmedAnswer);
    
    setIsProcessing(true);
    setWaitingForAnswer(false);
    stopListening();
    
    // Clear timeouts
    if (questionTimeoutRef.current) {
      clearTimeout(questionTimeoutRef.current);
      questionTimeoutRef.current = null;
    }

    const responseTime = Date.now() - questionStartTime;

    try {
      console.log('🤖 Evaluating answer...');
      const evaluation = await processPhysicsQuestion(currentQuestion.question, trimmedAnswer);
      console.log('📊 Evaluation completed:', evaluation);
      
      // Create question response
      const questionResponse: QuestionResponse = {
        question: currentQuestion.question,
        userAnswer: trimmedAnswer,
        aiEvaluation: evaluation.feedback,
        score: evaluation.score,
        timestamp: new Date(),
        responseTime: responseTime / 1000
      };

      // Update session
      const updatedSession = {
        ...session,
        questions: [...session.questions, questionResponse],
        currentQuestionIndex: session.currentQuestionIndex + 1,
        score: session.score + evaluation.score
      };

      setSession(updatedSession);
      setIsProcessing(false);

      // Play feedback briefly, then move to next question
      try {
        console.log('🔊 Playing feedback...');
        const feedbackAudio = await textToSpeech(evaluation.feedback);
        if (feedbackAudio) {
          await playAudio(feedbackAudio.audioUrl);
        } else {
          // Short delay if no audio
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('➡️ Moving to next question...');
        setTimeout(() => {
          askNextQuestion(updatedSession);
        }, 1500);
        
      } catch (error) {
        console.error('💥 Error playing feedback:', error);
        setTimeout(() => {
          askNextQuestion(updatedSession);
        }, 2000);
      }

    } catch (error) {
      console.error('💥 Error processing answer:', error);
      
      // Use fallback response
      const fallbackResponse: QuestionResponse = {
        question: currentQuestion.question,
        userAnswer: trimmedAnswer,
        aiEvaluation: 'Answer received, moving forward!',
        score: 5,
        timestamp: new Date(),
        responseTime: responseTime / 1000
      };

      const updatedSession = {
        ...session,
        questions: [...session.questions, fallbackResponse],
        currentQuestionIndex: session.currentQuestionIndex + 1,
        score: session.score + 5
      };

      setSession(updatedSession);
      setIsProcessing(false);
      
      setTimeout(() => {
        askNextQuestion(updatedSession);
      }, 2000);
    } finally {
      resetTranscript();
    }
  }, [session, currentQuestion, waitingForAnswer, questionStartTime, stopListening, playAudio, askNextQuestion, resetTranscript, isSpeaking, voiceActivity]);

  // Handle question timeout
  const handleQuestionTimeout = useCallback(() => {
    if (session && waitingForAnswer) {
      console.log('⏰ Question timeout');
      setWaitingForAnswer(false);
      stopListening();
      
      const timeoutResponse: QuestionResponse = {
        question: currentQuestion.question,
        userAnswer: transcript || 'No response (timeout)',
        aiEvaluation: 'Time up! Moving to next question.',
        score: transcript ? 2 : 0,
        timestamp: new Date(),
        responseTime: 45
      };

      const updatedSession = {
        ...session,
        questions: [...session.questions, timeoutResponse],
        currentQuestionIndex: session.currentQuestionIndex + 1,
        score: session.score + (transcript ? 2 : 0)
      };

      setSession(updatedSession);
      
      setTimeout(() => {
        askNextQuestion(updatedSession);
      }, 1000);
    }
  }, [session, currentQuestion, waitingForAnswer, stopListening, askNextQuestion, transcript]);

  // End interview
  const endInterview = useCallback(() => {
    console.log('🏁 Ending interview');
    setInterviewStarted(false);
    setWaitingForAnswer(false);
    setAudioPlaying(false);
    stopListening();
    stopAudio();
    stopRecording();
    
    if (session) {
      setSession({
        ...session,
        endTime: new Date(),
        status: 'completed'
      });
    }

    // Clear all timeouts
    [questionTimeoutRef, interviewTimeoutRef, processingTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, [session, stopListening, stopAudio, stopRecording]);

  // Simplified transcript processing
  useEffect(() => {
    if (transcript && waitingForAnswer && !isProcessing && !audioPlaying) {
      const trimmedTranscript = transcript.trim();
      const wordCount = trimmedTranscript.split(/\s+/).length;
      
      console.log('📝 Transcript update:', {
        length: trimmedTranscript.length,
        wordCount,
        confidence,
        isSpeaking,
        voiceActivity
      });
      
      // Process if we have sufficient content
      if (trimmedTranscript.length >= 10 && wordCount >= 3) {
        // Use VAD as a hint, but don't block on it
        const shouldWaitForVAD = isSpeaking && voiceActivity > 20;
        
        if (!shouldWaitForVAD) {
          console.log('✅ Processing answer (VAD clear or not critical)');
          
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
          }
          
          processingTimeoutRef.current = setTimeout(() => {
            handleAnswer(trimmedTranscript);
          }, 1500); // Shorter delay
        } else {
          console.log('🗣️ VAD suggests user still speaking, waiting a bit...');
        }
      }
    }
  }, [transcript, waitingForAnswer, isProcessing, audioPlaying, handleAnswer, confidence, isSpeaking, voiceActivity]);

  // Interview timeout
  useEffect(() => {
    if (interviewStarted) {
      interviewTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Interview timeout reached');
        endInterview();
      }, 30 * 60 * 1000); // 30 minutes
    }

    return () => {
      if (interviewTimeoutRef.current) {
        clearTimeout(interviewTimeoutRef.current);
      }
    };
  }, [interviewStarted, endInterview]);

  const resetInterview = useCallback(() => {
    console.log('🔄 Resetting interview');
    setSession(null);
    setCurrentQuestion(null);
    setInterviewStarted(false);
    setIsProcessing(false);
    setWaitingForAnswer(false);
    setAudioPlaying(false);
    stopCamera();
    resetTranscript();
  }, [stopCamera, resetTranscript]);

  // Debug info
  useEffect(() => {
    console.log('🔧 System Status:', {
      speechSupported: isSupported,
      microphoneReady,
      isListening,
      waitingForAnswer,
      isProcessing,
      audioPlaying,
      voiceActivity,
      isSpeaking,
      transcriptLength: transcript.length
    });
  }, [isSupported, microphoneReady, isListening, waitingForAnswer, isProcessing, audioPlaying, voiceActivity, isSpeaking, transcript]);

  useEffect(() => {
    if (interviewQuestions.length === 0) {
      // fallback: convert static array to objects if needed
      setInterviewQuestions(physicsQuestions.map(q => ({ question: q })));
      setCurrentQuestion({ question: physicsQuestions[0] });
    }
  }, [interviewQuestions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {fetchQueData?.jobTitle ?? "Physics"} Interview AI
            </h1>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white">
              <Camera className="w-8 h-8" />
            </div>
          </div>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            🎤 <strong>Smart Voice Detection!</strong> AI physics interview that understands when you're speaking. 
            Answer questions naturally at your own pace.
          </p>
        </div>

        {!interviewStarted && !session?.status ? (
          /* Pre-Interview Setup */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
              <div className="text-center mb-8">
                <div className="p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6 w-24 h-24 mx-auto flex items-center justify-center">
                  <Award className="w-12 h-12 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Ready for Your Smart {fetchQueData?.jobTitle ?? "Physics"} Interview?
                </h2>
                <p className="text-gray-600 mb-6">
                  🎤 <strong>Intelligent Voice Detection!</strong> The system understands when you're speaking. 
                  Answer {interviewQuestions.length} questions naturally.
                  <br /><br />
                  <strong>Speak at your own pace - no rushing needed!</strong>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-blue-800">🎤 Smart Detection</h3>
                    <p className="text-sm text-blue-600">Natural conversation</p>
                  </div>
                  <div className={`p-4 rounded-xl ${microphoneReady ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Mic className={`w-8 h-8 mx-auto mb-2 ${microphoneReady ? 'text-green-600' : 'text-red-600'}`} />
                    <h3 className={`font-semibold ${microphoneReady ? 'text-green-800' : 'text-red-800'}`}>
                      {microphoneReady ? '🎤 Mic Ready' : 'Microphone Needed'}
                    </h3>
                    <p className={`text-sm ${microphoneReady ? 'text-green-600' : 'text-red-600'}`}>
                      {microphoneReady ? 'Voice detection ready' : 'Please allow access'}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-purple-800">📹 Recorded</h3>
                    <p className="text-sm text-purple-600">Audio + Video</p>
                  </div>
                </div>

                {(speechError || cameraError || !microphoneReady) && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <p className="font-medium">Setup Required:</p>
                    <p className="text-sm">
                      {speechError && `Speech: ${speechError}`}
                      {speechError && cameraError && ' | '}
                      {cameraError && `Camera: ${cameraError}`}
                      {!microphoneReady && !speechError && 'Please allow microphone access and refresh the page'}
                    </p>
                  </div>
                )}

                <button
                  onClick={startInterview}
                  disabled={!isSupported || !!speechError || !microphoneReady}
                  className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🎤 Start Smart Physics Interview
                </button>
              </div>
            </div>
          </div>
        ) : session?.status === 'completed' ? (
          /* Interview Summary */
          <InterviewSummary session={session} onRestart={resetInterview} />
        ) : (
          /* Active Interview */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera and Controls */}
            <div className="lg:col-span-1 space-y-6">
              <CameraView 
                stream={stream} 
                isRecording={isRecording}
                error={cameraError}
              />
              
              <InterviewControls
                isListening={isListening}
                isProcessing={isProcessing}
                isPlayingAudio={isPlayingAudio || audioPlaying}
                waitingForAnswer={waitingForAnswer}
                onEndInterview={endInterview}
              />

              {/* Voice Activity Status */}
              {isListening && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🎤 Voice Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Speaking:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isSpeaking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isSpeaking ? '🗣️ Yes' : '🤐 No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Activity:</span>
                      <span className="text-sm font-medium">{voiceActivity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-200 ${
                          voiceActivity > 15 ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min(100, voiceActivity)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Question and Progress */}
            <div className="lg:col-span-2 space-y-6">
              {session && (
                <InterviewProgress 
                  session={session}
                  totalQuestions={interviewQuestions.length}
                />
              )}
              
              <QuestionDisplay
                question={currentQuestion}
                isProcessing={isProcessing}
                isListening={isListening}
                waitingForAnswer={waitingForAnswer}
                transcript={transcript}
              />

              {/* Recent Responses */}
              {session && session.questions.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    🎤 Latest Response
                  </h3>
                  <div className="space-y-3">
                    {session.questions.slice(-1).map((response, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-gray-800">Your Answer:</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            response.score >= 8 ? 'bg-green-100 text-green-800' :
                            response.score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {response.score}/10
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{response.userAnswer}</p>
                        <div className="border-t pt-3">
                          <p className="font-medium text-gray-800 mb-1">🎤 AI Feedback:</p>
                          <p className="text-gray-600 text-sm">{response.aiEvaluation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <NameEmailModal isOpen={showModal} onSubmit={handleModalSubmit} />
    </div>
  );
};

export default App;