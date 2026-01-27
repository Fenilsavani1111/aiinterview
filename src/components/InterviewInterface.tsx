import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Camera, Brain } from 'lucide-react';
import { CameraView } from './CameraView';
import { getGrade, InterviewSummary } from './InterviewSummary';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useCamera } from '../hooks/useCamera';
import { getBehaviouralAnalysis, processPhysicsQuestion } from '../services/apiService';
import { elevenLabsService } from '../services/elevenLabsService';
import axios from 'axios';
import ProcessingInterview from './ProcessingInterview';
import TabSwitchMonitor from './TabSwitchMonitor';
import RequestPermission from './RequestPermission';
import PreAssessmentSetup from './PreAssessmentSetup';
import { QuestionDisplay } from './QuestionDisplay';
import MatricsView from './MatricsView';
import {
  InterviewSession,
  JobPost,
  InterviewQuestion,
  Candidate,
  QuestionResponse,
} from '../types';

interface InterviewInterfaceProps {
  physicsQuestions: InterviewQuestion[];
  fetchQueData: {
    jobTitle?: string;
  } | null;
  candidateId?: string | null;
  jobData: JobPost | null;
}

const staticPhotoURL =
  'https://aiinterviewbucket.s3.ap-south-1.amazonaws.com/Resumes/1768638723578-photo_7_109_1768638723560.jpg';

const InterviewInterface: React.FC<InterviewInterfaceProps> = ({
  physicsQuestions,
  fetchQueData,
  candidateId,
  jobData,
}) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [candidateData, setCandidateData] = useState<Candidate | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPhotoCaptured, setIsPhotoCaptured] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [alerts, setAlerts] = useState<
    Array<{ message?: string; type?: string;[k: string]: unknown }>
  >([]);
  const [proctoringSessionData, setProctoringSessionData] = useState<{
    session_id?: string;
    [key: string]: unknown;
  } | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const endInterviewRef = useRef<((updatedSession: InterviewSession) => Promise<void>) | null>(
    null
  );
  const interviewEndedRef = useRef(false);

  // Shuffle questions with communication type questions first
  const shuffledQuestions = useMemo(() => {
    if (!physicsQuestions || physicsQuestions.length === 0) {
      return [];
    }

    // Fisher–Yates shuffle (inner shuffle only)
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Helper to get shuffled questions by type
    const getShuffledByType = (type: string) =>
      shuffleArray(physicsQuestions.filter((q) => q.type?.toLowerCase() === type.toLowerCase()));

    // Fixed order with inner shuffle
    const behaviour = getShuffledByType('behavioral');
    const communication = getShuffledByType('communication');
    const reasoning = getShuffledByType('reasoning');
    const arithmetic = getShuffledByType('arithmetic');
    const subjective = getShuffledByType('subjective');

    return [...behaviour, ...communication, ...reasoning, ...arithmetic, ...subjective];
  }, [physicsQuestions]);

  const currentQuestion = shuffledQuestions[session?.currentQuestionIndex ?? -1];
  const isCommunicationQuestion =
    currentQuestion?.type?.toLowerCase() === 'communication' ||
    currentQuestion?.type?.toLowerCase() === 'behavioral';

  let speechError = '';
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported,
    hasFinishedSpeaking,
    voiceActivity,
  } = useSpeechRecognition();

  const {
    isPlaying,
    play: playAudio,
    stop: stopAudio,
    // isLoading: isLoadingAudio,
  } = useAudioPlayer();

  const {
    stream,
    isRecording,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    error: cameraError,
  } = useCamera();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const waitingForAnswer =
    !isListening &&
    !isPlaying &&
    !isGeneratingAudio &&
    !isAnalyzing &&
    !isProcessingResponse &&
    !!isCommunicationQuestion &&
    !!interviewStarted;

  // Show test result message when camera state changes after testing
  useEffect(() => {
    if (showTestResult && jobData?.enableVideoRecording) {
      const timer = setTimeout(() => {
        if (stream && !cameraError) {
          // Camera is ready - this will be handled by UI state
          setShowTestResult(false);
        } else if (cameraError) {
          // Camera has error - this will be shown in error UI
          setShowTestResult(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showTestResult, stream, cameraError, jobData]);

  // Update video element when stream becomes available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // upload recording to cloud
  const uploadinterviewvideo = async (
    file: Blob | null,
    damisession: InterviewSession,
    interviewoverview: any
  ) => {
    try {
      setCurrentStep(0);
      setIsLoading(true);

      let file_url: string | null = null;

      /* ---------- VIDEO UPLOAD (OPTIONAL) ---------- */
      if (file) {
        try {
          const timestamp = Date.now();
          const formData = new FormData();
          formData.append('video', file);
          formData.append('fileName', `${jobData?.id}_${candidateId}_${timestamp}.mp4`);

          const res = await axios.post(
            `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-interview-video`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );

          if (res.data?.path) {
            file_url = `${import.meta.env.VITE_AIINTERVIEW_API_VIDEO_ENDPOINT}/${res.data.path}`;
          }
        } catch (uploadErr) {
          console.error('❌ Video upload failed:', uploadErr);
        }
      }

      setCurrentStep(2);
      await updateCandidateDetails(
        file_url, // null if no video
        damisession,
        interviewoverview
      );
    } catch (err) {
      console.error('❌ Upload flow error:', err);
      await updateCandidateDetails(null, damisession, interviewoverview ?? {});
    }
  };

  // update candidate interview
  const updateCandidateDetails = async (
    videolink: string | null,
    damisession: InterviewSession,
    interviewoverview: any
  ) => {
    try {
      setIsLoading(true);
      const totalTime = damisession?.endTime
        ? Math.round((damisession.endTime.getTime() - damisession.startTime.getTime()) / 1000 / 60)
        : 0;

      let overallScore = 0;
      let totalScore = 0;
      let averageResponseTime = 0;
      if (damisession?.questions) {
        overallScore =
          damisession?.questions.length > 0
            ? Math.round(
              damisession?.questions.reduce((sum: any, q: { score: any }) => sum + q.score, 0)
            )
            : 0;
        totalScore =
          damisession?.questions.length > 0
            ? Math.round(damisession?.questions.reduce((sum, q) => sum + q.score, 0))
            : 0;

        averageResponseTime =
          damisession?.questions.length > 0
            ? Math.round(
              damisession?.questions.reduce((sum, q) => sum + q.responseTime, 0) /
              damisession?.questions.length
            )
            : 0;
      }
      const gradeInfo = getGrade(overallScore);
      let newQuestions: any[] = [];
      shuffledQuestions.map((ques: any) => {
        let question = { ...ques };
        let findquesResp = damisession?.questions?.find((item) => item.question === ques?.question);
        newQuestions.push({
          questionId: question?.id,
          studentId: candidateId,
          answer: findquesResp?.userAnswer ?? '',
          aiEvaluation: findquesResp?.aiEvaluation ?? '',
          score: findquesResp?.score ?? 0,
          responseTime: findquesResp?.responseTime ?? 0,
          endTime: findquesResp?.endTime,
        });
      });
      let damiscores = {
        communication:
          interviewoverview?.performanceBreakdown?.communicationSkills?.overallAveragePercentage ??
          0,
        technical:
          interviewoverview?.performanceBreakdown?.technicalKnowledge?.overallAveragePercentage ??
          0,
        problemSolving:
          interviewoverview?.performanceBreakdown?.problemSolving?.overallAveragePercentage ?? 0,
        leadership:
          interviewoverview?.performanceBreakdown?.leadershipPotential?.overallAveragePercentage ??
          0,
        bodyLanguage:
          interviewoverview?.performanceBreakdown?.body_language?.overallAveragePercentage ?? 0,
        confidence:
          interviewoverview?.performanceBreakdown?.confidenceLevel?.overallAveragePercentage ?? 0,
      };

      // Calculate category-wise percentage based on question types
      const calculateCategoryPercentage = () => {
        if (!damisession?.questions || damisession.questions.length === 0) {
          return {
            totalScore: 0,
            overallScore: 0,
            overallPercentage: 0,
            categoryWisePercentage: {},
          };
        }

        // Group questions by type/category
        const categoryScores: Record<
          string,
          { totalScore: number; maxScore: number; count: number }
        > = {};

        // Map question types to display names
        const categoryDisplayNames: Record<string, string> = {
          behavioral: 'Behavioral',
          communication: 'Communication',
          reasoning: 'Reasoning Ability',
          arithmetic: 'Arithmetic',
          subjective: 'Subjective',
        };

        // Initialize category tracking
        shuffledQuestions.forEach((question) => {
          const questionType = question.type?.toLowerCase() || 'other';
          const displayName = categoryDisplayNames[questionType] || questionType;

          if (!categoryScores[displayName]) {
            categoryScores[displayName] = { totalScore: 0, maxScore: 0, count: 0 };
          }
        });

        // Calculate scores for each answered question
        damisession.questions.forEach((response) => {
          // Find the original question to get its type
          const originalQuestion = shuffledQuestions.find((q) => q.question === response.question);
          if (originalQuestion) {
            const questionType = originalQuestion.type?.toLowerCase() || 'other';
            const displayName = categoryDisplayNames[questionType] || questionType;

            if (categoryScores[displayName]) {
              categoryScores[displayName].totalScore += response.score || 0;
              categoryScores[displayName].maxScore += 10; // Assuming max score per question is 10
              categoryScores[displayName].count += 1;
            }
          }
        });

        // Calculate percentages for each category
        const categoryWisePercentage: Record<string, number> = {};
        Object.entries(categoryScores).forEach(([category, scores]) => {
          if (scores.maxScore > 0) {
            categoryWisePercentage[category] = Math.round(
              (scores.totalScore / scores.maxScore) * 100
            );
          } else {
            categoryWisePercentage[category] = 0;
          }
        });

        const overallPercentage =
          totalScore > 0
            ? Math.round((overallScore / (damisession.questions.length * 10)) * 100)
            : 0;

        return {
          totalScore: totalScore,
          overallScore: overallScore,
          overallPercentage: overallPercentage,
          categoryWisePercentage: categoryWisePercentage,
        };
      };

      const categoryPercentage = calculateCategoryPercentage();
      // setIsModalLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/update-candidate-byid`,
        {
          candidateId: candidateId,
          data: {
            interviewVideoLink: videolink ?? '',
            status: 'under_review',
            interviewDate: new Date(),
            hasRecording: Boolean(videolink),
            photoUrl: photoUrl ?? '',
            questions: newQuestions,
            attemptedQuestions: damisession?.questions?.length ?? 0,
            overallScore: overallScore,
            totalScore: totalScore,
            grade: gradeInfo?.grade,
            duration: totalTime,
            scores: damiscores,
            averageResponseTime: averageResponseTime,
            categoryPercentage: {
              ...categoryPercentage,
              categoryWisePercentage: {
                ...categoryPercentage.categoryWisePercentage,
                ...damiscores,
              },
            },
            proctoring: alerts?.length > 0 ? 'Yes' : 'No',
            proctoringAlerts: alerts,
            ...interviewoverview,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data) {
        setIsCompleted(true);
        setCandidateData(response.data?.candidate ?? null);
        // You can handle the response here (e.g., save data, show a message, etc.)
        setIsLoading(false);
        setCurrentStep(3);
        console.log('update candidate details response:', response.data);
      } else {
        setErrorText('Failed to save analysis data. Try a different email.');
        setCurrentStep(0);
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      // Handle error (show error message, etc.)
      console.error('Error joining job link:', error);
      setErrorText('Failed to save analysis data. Try a different email.');
    }
  };

  // Track which questions have had audio generated
  const [generatedAudioQuestions, setGeneratedAudioQuestions] = useState<Set<string>>(new Set());

  // Stop listening when AI audio starts playing (to prevent capturing AI's voice)
  useEffect(() => {
    if ((isPlaying || isGeneratingAudio) && isListening) {
      console.log('🔇 Stopping listening - AI is speaking');
      stopListening();
    }
  }, [isPlaying, isGeneratingAudio, isListening, stopListening]);

  // Auto-start listening when question audio finishes playing (only for communication questions)
  useEffect(() => {
    if (
      !isPlaying &&
      !isGeneratingAudio &&
      !isLoading &&
      currentAudio &&
      speechSupported &&
      isCommunicationQuestion &&
      interviewStarted
    ) {
      // Small delay to ensure audio has fully stopped
      const timer = setTimeout(() => {
        if (!isListening && !hasFinishedSpeaking) {
          console.log('🎤 Starting listening - AI finished speaking');
          startListening();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    isPlaying,
    isGeneratingAudio,
    isLoading,
    currentAudio,
    speechSupported,
    isListening,
    hasFinishedSpeaking,
    startListening,
    isCommunicationQuestion,
    interviewStarted,
  ]);

  const handleNextQuestion = useCallback(
    async (answerText?: string, isTimeout: boolean = false) => {
      if (!session || !currentQuestion || session.status === 'completed') {
        console.log('❌ Not ready to handle answer');
        return;
      }

      const trimmedAnswer = (answerText ?? transcript).trim();

      const hasOptions =
        Array.isArray(currentQuestion?.options) && currentQuestion.options.length > 0;

      const isCommQuestion = currentQuestion?.type?.toLowerCase() === 'communication';

      // ------------------ VALIDATION ------------------
      // Skip validation if timeout occurred - allow submission with any answer (or no answer)
      if (!isTimeout) {
        if (hasOptions) {
          if (!trimmedAnswer) {
            console.log('⚠️ Please select an option.');
            return;
          }
        } else {
          if (trimmedAnswer.length < 10) {
            console.log('⚠️ Answer too short, waiting for more:', trimmedAnswer);
            return;
          }

          const wordCount = trimmedAnswer.split(/\s+/).filter(Boolean).length;
          if (wordCount < 3) {
            console.log('⚠️ Answer has too few words, waiting for more. Words:', wordCount);
            return;
          }
        }
      }

      // Prevent multiple calls
      if (isProcessingResponse) return;
      setIsProcessingResponse(true);

      // Stop listening if active
      if (isListening) {
        stopListening();
      }

      setIsAnalyzing(true);

      try {
        let evaluation: { score: number; feedback: string };

        // ------------------ EVALUATION ------------------
        // If timeout occurred, set score to 0
        if (isTimeout) {
          evaluation = {
            score: 0,
            feedback: 'Time exceeded. No answer was provided within the expected duration.',
          };
          console.log('⏰ Timeout: Score set to 0');
        } else if (!isCommQuestion && hasOptions) {
          // ✅ Non-communication + MCQ → match rightAnswer
          const right = (currentQuestion as any).rightAnswer;
          const rightTrim = right != null ? String(right).trim() : '';

          if (rightTrim) {
            const correct = trimmedAnswer === rightTrim;
            evaluation = {
              score: correct ? 10 : 0,
              feedback: correct ? 'Correct!' : `Incorrect. The correct answer was: ${rightTrim}.`,
            };
          } else {
            evaluation = {
              score: 5,
              feedback: 'Answer recorded.',
            };
          }

          console.log('📊 MCQ evaluation:', evaluation);
        } else {
          // ✅ Communication (any) OR Non-communication without options
          evaluation = await processPhysicsQuestion(currentQuestion.question, trimmedAnswer);

          console.log('📊 AI evaluation:', evaluation);
        }

        // ------------------ SPEAK FEEDBACK ------------------
        if (isCommQuestion) {
          setIsGeneratingAudio(true);
          try {
            console.log('🔊 Speaking feedback...');
            const feedbackAudio = await elevenLabsService.textToSpeech(evaluation.feedback);

            if (feedbackAudio) {
              setCurrentAudio(feedbackAudio);
              await playAudio(feedbackAudio);
              console.log('✅ Feedback audio completed');
            } else {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error('💥 Error playing feedback:', error);
          }
        } else {
          // ❌ Non-communication → NO SPEECH
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (interviewEndedRef.current) {
          setIsProcessingResponse(false);
          setIsAnalyzing(false);
          setIsGeneratingAudio(false);
          return;
        }

        // ------------------ TIMING ------------------
        const responseTime = (Date.now() - questionStartTime) / 1000;
        const totalResponseTime = session.questions.reduce((sum, q) => sum + q.responseTime, 0);
        const endTime = totalResponseTime + responseTime;

        // ------------------ SAVE RESPONSE ------------------
        const questionResponse: QuestionResponse = {
          question: currentQuestion.question,
          userAnswer: trimmedAnswer,
          aiEvaluation: evaluation.feedback,
          score: evaluation.score ?? 0,
          endTime,
          responseTime,
        };

        const updatedSession = {
          ...session,
          questions: [...session.questions, questionResponse],
          currentQuestionIndex: session.currentQuestionIndex + 1,
          score: session.score + evaluation.score,
        };

        setSession(updatedSession);

        // ------------------ NEXT / END ------------------
        const isLast = session.currentQuestionIndex === shuffledQuestions.length - 1;

        if (isLast && endInterviewRef.current) {
          setTimeout(() => {
            endInterviewRef.current?.(updatedSession);
          }, 1000);
        } else {
          setTimeout(() => {
            setIsProcessingResponse(false);
            setIsGeneratingAudio(false);
          }, 500);
        }
      } catch (error) {
        console.error('❌ Failed to process response:', error);
        setIsProcessingResponse(false);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [
      session,
      currentQuestion,
      transcript,
      isListening,
      isProcessingResponse,
      questionStartTime,
      shuffledQuestions.length,
      stopListening,
      playAudio,
    ]
  );

  // Auto-advance to next question when user finishes speaking (only for communication questions)
  useEffect(() => {
    if (
      isCommunicationQuestion &&
      hasFinishedSpeaking &&
      transcript.trim() &&
      !isAnalyzing &&
      !isProcessingResponse &&
      !interviewEndedRef.current
    ) {
      handleNextQuestion();
    }
  }, [
    hasFinishedSpeaking,
    transcript,
    isAnalyzing,
    isProcessingResponse,
    isCommunicationQuestion,
    handleNextQuestion,
  ]);

  const generateQuestionAudio = useCallback(
    async (question: any) => {
      if (interviewEndedRef.current) return;
      // Prevent duplicate audio generation for the same question
      if (generatedAudioQuestions.has(question.id) || isGeneratingAudio || isPlaying) {
        return;
      }

      setIsGeneratingAudio(true);
      setGeneratedAudioQuestions((prev) => new Set(prev).add(question.id));

      try {
        // questionStartTime is already set when question changes in useEffect
        const voiceResponse = await elevenLabsService.textToSpeech(question?.question);

        if (interviewEndedRef.current) return;
        if (voiceResponse) {
          console.log('🎵 Playing question audio...');
          setCurrentAudio(voiceResponse);
          await playAudio(voiceResponse);
          console.log('✅ Question audio completed');
        } else {
          console.log('⚠️ No audio, using delay');
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error('Failed to generate question audio:', error);
        // Remove from generated set if failed so it can be retried
        setGeneratedAudioQuestions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(question.id);
          return newSet;
        });
      } finally {
        setIsGeneratingAudio(false);
      }
    },
    [playAudio, generatedAudioQuestions, isGeneratingAudio, isPlaying]
  );

  useEffect(() => {
    if (interviewEndedRef.current) return;
    if (currentQuestion) {
      // Reset transcript, text answer, and analysis when moving to new question
      setIsProcessingResponse(false);
      resetTranscript();
      setTextAnswer('');

      // Set question start time for all question types
      setQuestionStartTime(Date.now());

      // Only generate audio for communication questions
      if (isCommunicationQuestion) {
        // Small delay to ensure state is reset before generating audio
        setTimeout(() => {
          if (interviewEndedRef.current) return;
          generateQuestionAudio(currentQuestion);
        }, 100);
      }
    }
  }, [currentQuestion, generateQuestionAudio, resetTranscript, isCommunicationQuestion]);

  // Timeout mechanism: automatically move to next question if expectedDuration is exceeded
  // Also update remaining time every second for display
  useEffect(() => {
    if (
      !interviewStarted ||
      !session ||
      !currentQuestion ||
      interviewEndedRef.current ||
      isProcessingResponse ||
      isAnalyzing ||
      session.status !== 'active'
    ) {
      setRemainingTime(null);
      return;
    }

    const expectedDuration = currentQuestion.expectedDuration || 300; // Default to 5 minutes if not specified

    // If questionStartTime is 0 or not set yet, wait for it to be set
    if (questionStartTime === 0) {
      setRemainingTime(expectedDuration);
      return;
    }

    // Update remaining time every second
    const updateRemainingTime = () => {
      const elapsedTime = (Date.now() - questionStartTime) / 1000; // Convert to seconds
      const remaining = Math.max(0, expectedDuration - elapsedTime);
      setRemainingTime(remaining);

      // If time has exceeded, trigger timeout
      if (remaining <= 0) {
        console.log('⏰ Timeout: Expected duration exceeded, moving to next question');
        handleNextQuestion(transcript || textAnswer || 'No answer provided - time exceeded', true);
        return;
      }
    };

    // Initial update
    updateRemainingTime();

    // Update every second
    const intervalId = setInterval(updateRemainingTime, 1000);

    // Set up timeout to move to next question when time expires
    const elapsedTime = (Date.now() - questionStartTime) / 1000;
    const remainingTimeMs = Math.max(0, (expectedDuration - elapsedTime) * 1000);

    const timeoutId = setTimeout(() => {
      if (
        !interviewEndedRef.current &&
        !isProcessingResponse &&
        !isAnalyzing &&
        session.status === 'active'
      ) {
        console.log('⏰ Timeout: Expected duration reached, moving to next question');
        handleNextQuestion(transcript || textAnswer || 'No answer provided - time exceeded', true);
      }
    }, remainingTimeMs);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [
    interviewStarted,
    session,
    currentQuestion,
    questionStartTime,
    isProcessingResponse,
    isAnalyzing,
    transcript,
    textAnswer,
    handleNextQuestion,
  ]);

  const startInterview = async () => {
    if (!speechSupported) {
      alert(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      );
      return;
    }

    if (!microphoneReady) {
      alert('Microphone is not ready. Please allow microphone access and refresh the page.');
      return;
    }

    // Require photo capture before starting interview
    if (!isPhotoCaptured || !photoUrl) {
      alert(
        "Please capture your live photo before starting the interview. Click 'Capture Live Photo' button."
      );
      return;
    }

    // If this job post requires video, ensure camera is available.
    if (jobData?.enableVideoRecording && (!!cameraError || !stream)) {
      alert(
        "Camera is not ready. Please click 'Test Recording Setup' to grant camera permissions, or refresh the page."
      );
      return;
    }

    try {
      console.log('🚀 Starting interview...');

      // If microphone is already ready, permissions were granted on page load
      // Just verify access without showing pop-up again
      if (!microphoneReady) {
        // Request microphone access (will show pop-up if not already granted)
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });
        console.log('✅ Microphone access confirmed');
        testStream.getTracks().forEach((track) => track.stop());
        setMicrophoneReady(true);
      } else {
        console.log('✅ Microphone already ready (permissions granted on page load)');
      }

      // Start camera only if video recording is enabled for this job
      if (jobData?.enableVideoRecording) {
        // If stream already exists, camera was started on page load
        if (!stream) {
          try {
            await startCamera();
            console.log('✅ Camera started (video recording enabled)');
          } catch (error) {
            console.warn('⚠️ Camera failed to start, continuing without camera (audio-only)');
          }
        } else {
          console.log('✅ Camera already ready (permissions granted on page load)');
        }
      }

      // Create new session
      interviewEndedRef.current = false;
      const newSession: InterviewSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        status: 'active',
      };
      setSession(newSession);
      setInterviewStarted(true);

      // Start recording in background only when video recording is enabled
      if (jobData?.enableVideoRecording) {
        setTimeout(async () => {
          try {
            await startRecording();
            console.log('✅ Video recording started');
          } catch (error) {
            console.log('⚠️ Video recording failed, continuing without video recording');
          }
        }, 500);
      }
    } catch (error) {
      console.error('💥 Error starting interview:', error);
      alert('Failed to start interview. Please check permissions and try again.');
    }
  };

  // End interview - saves all data collected so far (even if interview ended early)
  const endInterview = useCallback(
    async (updatedSession: InterviewSession) => {
      console.log('🏁 Ending assessment');

      interviewEndedRef.current = true;
      setInterviewStarted(false);
      setIsGeneratingAudio(false);
      setIsLoading(true);

      stopListening();
      stopAudio();

      const finalSession: InterviewSession = {
        ...(updatedSession || session),
        status: 'completed',
        endTime: new Date(),
      };

      if (!finalSession) {
        setIsLoading(false);
        return;
      }

      setSession(finalSession);

      let videoBlob: Blob | null = null;
      let cleanBehavioralData: any = {};

      /* ---------- STOP RECORDING ---------- */
      if (jobData?.enableVideoRecording) {
        try {
          const result = await Promise.race([
            stopRecording(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);

          if (result?.blob && result.blob.size > 0) {
            videoBlob = result.blob;
          }
        } catch (err) {
          console.error('❌ Recording stop failed:', err);
        }
      }

      /* ---------- STOP CAMERA ---------- */
      try {
        if (jobData?.enableVideoRecording) stopCamera();
      } catch (err) {
        console.warn('⚠️ Failed to stop camera:', err);
      }

      /* ---------- BEHAVIOURAL ANALYSIS (ALWAYS) ---------- */
      try {
        const behavioraldata = await getBehaviouralAnalysis(
          proctoringSessionData?.session_id ?? ''
        );

        if (behavioraldata?.status === 'success') {
          cleanBehavioralData = { ...behavioraldata };

          delete cleanBehavioralData.alert_history;
          delete cleanBehavioralData.document_verification;
          delete cleanBehavioralData.status;
          delete cleanBehavioralData.emotion_summary;
          delete cleanBehavioralData.face_verification_summary;
          delete cleanBehavioralData.session_id;
          delete cleanBehavioralData.session_metadata;
          delete cleanBehavioralData.token_consumption;
        } else {
          console.warn('⚠️ Behavioural analysis failed');
        }
      } catch (err) {
        console.error('❌ Behavioural analysis error:', err);
      }

      /* ---------- SAVE FLOW ---------- */
      try {
        await uploadinterviewvideo(
          videoBlob, // can be null
          finalSession,
          cleanBehavioralData // {} if analysis failed
        );
      } catch (err) {
        console.error('❌ Save failed:', err);
        setErrorText('Failed to save interview data.');
      } finally {
        setIsLoading(false);
      }
    },
    [session, jobData, stopListening, stopAudio, stopRecording, stopCamera, uploadinterviewvideo]
  );

  // Update ref when endInterview changes
  useEffect(() => {
    endInterviewRef.current = endInterview;
  }, [endInterview]);

  // Always ask confirmation on refresh/close until process is completed
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isCompleted) {
        event.preventDefault();
        event.returnValue =
          '⚠️ Your assessment is not completed. If you leave now, you will need to start over. Are you sure you want to leave?'; // required for Chrome/Edge/Firefox
        return '';
      }
    };

    if (!isCompleted) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isCompleted]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100'>
      <div
        className={
          interviewStarted && session
            ? 'w-full'
            : 'container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl'
        }
      >
        {/* Header */}
        {interviewStarted && session && session.status !== 'completed' ? (
          <header className='sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div>
                <p className='text-xs uppercase tracking-wide text-indigo-500 font-semibold'>
                  AI Interview Platform
                </p>
                <h1 className='text-lg font-semibold text-slate-900'>
                  {fetchQueData?.jobTitle ?? 'Assessment'} Assessment
                </h1>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-sm text-slate-500 whitespace-nowrap'>
                  Question {session.currentQuestionIndex + 1} of {shuffledQuestions.length}
                </span>
                <div className='w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300'
                    style={{
                      width: `${shuffledQuestions.length ? ((session.currentQuestionIndex + 1) / shuffledQuestions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
        ) : (
          <div className='text-center mb-4 sm:mb-6'>
            <div className='flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3'>
              <div className='p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl text-white'>
                <Brain className='w-5 h-5 sm:w-8 sm:h-8' />
              </div>
              <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
                {fetchQueData?.jobTitle ?? 'Physics'} Assessment AI
              </h1>
              <div className='p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl sm:rounded-2xl text-white'>
                <Camera className='w-5 h-5 sm:w-8 sm:h-8' />
              </div>
            </div>
            {session?.status !== 'completed' && (
              <p className='text-gray-600 text-sm sm:text-base md:text-lg max-w-3xl mx-auto px-2'>
                <strong>Smart Voice Detection!</strong> AI Assessment that understands when you're
                speaking. Answer questions naturally at your own pace.
              </p>
            )}
          </div>
        )}

        {/* Permission Request Screen - Show First */}
        {!permissionsRequested && !interviewStarted && !session?.status ? (
          <RequestPermission
            jobData={jobData}
            setMicrophoneReady={setMicrophoneReady}
            setPermissionsRequested={setPermissionsRequested}
            startCamera={startCamera}
          />
        ) : isLoading ? (
          <div className='max-w-2xl mx-auto'>
            <ProcessingInterview currentStep={currentStep} />
          </div>
        ) : !interviewStarted && !session?.status ? (
          /* Pre-Assessment Setup */
          <PreAssessmentSetup
            jobData={jobData}
            microphoneReady={microphoneReady}
            cameraError={cameraError}
            speechError={speechError}
            speechSupported={speechSupported}
            candidateId={candidateId ?? ''}
            fetchQueData={fetchQueData}
            stream={stream}
            setPhotoUrl={setPhotoUrl}
            setIsPhotoCaptured={setIsPhotoCaptured}
            startInterview={startInterview}
          />
        ) : session?.status === 'completed' ? (
          /* Interview Summary */
          <InterviewSummary
            session={session}
            isLoading={isLoading}
            errorText={errorText}
            candidateData={candidateData}
          />
        ) : (
          <>
            {/* Active Interview (client_example layout) */}
            <div className='space-y-4 sm:space-y-6 px-3 sm:px-4 py-3 sm:py-4 pb-24 overflow-hidden'>
              <TabSwitchMonitor
                isActive={interviewStarted}
                isCompleted={isCompleted}
                onForceComplete={async (reason: string) => {
                  console.log('reason', reason);
                  if (session)
                    await endInterview(session);
                }}
              />

              <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
                {/* Left: lg:col-span-4 (client_example) */}
                <div className='lg:col-span-4 space-y-6'>
                  <CameraView
                    stream={stream}
                    isRecording={isRecording}
                    error={cameraError}
                    guidance={stream ? 'Stay centered • Maintain eye contact' : undefined}
                    isActive={interviewStarted && !!session && session.status === 'active'}
                    jobTitle={fetchQueData?.jobTitle ?? ''}
                    frameInterval={1000}
                    setMetrics={setMetrics}
                    setAlerts={setAlerts}
                    onSessionStart={(sessionData) => {
                      setProctoringSessionData(sessionData);
                      console.log('📹 Proctoring session started:', sessionData);
                    }}
                  />

                  {/* Voice Status (client_example): emerald bar, waveform, "Voice detected clearly" */}
                  <div className='bg-white rounded-2xl shadow-lg border border-slate-200 p-4'>
                    <h3 className='text-sm font-semibold mb-4 flex items-center gap-2 text-slate-800'>
                      🎧 Voice Status
                    </h3>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm text-slate-600'>Speaking</span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${isCommunicationQuestion && isListening && !hasFinishedSpeaking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {isCommunicationQuestion && isListening && !hasFinishedSpeaking
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-sm text-slate-600'>Voice Strength</span>
                      <span className='text-sm font-medium text-slate-700'>{voiceActivity}%</span>
                    </div>
                    <div className='w-full bg-slate-200 rounded-full h-2 overflow-hidden'>
                      <div
                        className='h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all'
                        style={{ width: `${Math.min(100, voiceActivity)}%` }}
                      />
                    </div>
                    <div className='mt-4 flex items-end justify-center gap-1 h-8'>
                      {[3, 6, 8, 5, 7].map((h, i) => (
                        <span
                          key={i}
                          className='w-1 bg-emerald-500 rounded-full animate-pulse'
                          style={{
                            height: `${h * 4}px`,
                            animationDelay: `${i * 75}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <p className='mt-3 text-xs text-slate-500 text-center'>
                      {isCommunicationQuestion && isListening
                        ? 'Voice detected clearly'
                        : 'Speak when ready'}
                    </p>
                  </div>
                </div>

                {/* Right: lg:col-span-8 (client_example) */}
                <div className='lg:col-span-8 space-y-6'>
                  <QuestionDisplay
                    isCommunicationQuestion={isCommunicationQuestion}
                    currentQuestion={currentQuestion}
                    isAnalyzing={isAnalyzing}
                    isProcessingResponse={isProcessingResponse}
                    isGeneratingAudio={isGeneratingAudio}
                    isPlaying={isPlaying}
                    isListening={isListening}
                    waitingForAnswer={waitingForAnswer}
                    transcript={transcript}
                    textAnswer={textAnswer}
                    setTextAnswer={setTextAnswer}
                    handleNextQuestion={handleNextQuestion}
                    remainingTime={remainingTime}
                  />

                  <MatricsView metrics={metrics} alerts={alerts} />
                </div>
              </div>
            </div>

            {/* Footer (client_example): light bg, emoji stats, red gradient button */}
            {session && (
              <footer className='sticky bottom-0 bg-white/80 backdrop-blur border-t border-slate-200'>
                <div className='max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3'>
                  <div className='flex flex-wrap gap-4 text-sm text-slate-500'>
                    <span>
                      ⏱{' '}
                      {Math.floor((now - session.startTime.getTime()) / 60000)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {(Math.floor((now - session.startTime.getTime()) / 1000) % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                    <span>
                      📊 Total Score:{' '}
                      {session.questions.length
                        ? session.questions.reduce((s, q) => s + q.score, 0)
                        : '--'}
                    </span>
                    <span>✅ Completed: {session.questions.length}</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => endInterview(session)}
                    disabled={isGeneratingAudio || isPlaying}
                    className='bg-gradient-to-r from-red-500 to-rose-500 hover:opacity-90 transition text-white px-6 py-2 rounded-xl font-medium w-full sm:w-auto disabled:opacity-50'
                  >
                    End Assessment
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InterviewInterface;
