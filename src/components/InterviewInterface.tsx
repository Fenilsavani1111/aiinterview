import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Camera, Mic, Brain, Clock, Award } from 'lucide-react';
import { CameraView } from './CameraView';
import { InterviewControls } from './InterviewControls';
import { QuestionDisplay } from './QuestionDisplay';
import { InterviewProgress } from './InterviewProgress';
import { getGrade, InterviewSummary } from './InterviewSummary';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useCamera } from '../hooks/useCamera';
import {
  getBehaviouralAnalysis,
  processPhysicsQuestion,
} from '../services/apiService';
import { elevenLabsService } from '../services/elevenLabsService';
import axios from 'axios';
import { JobPost } from './NameEmailModal';
import ProcessingInterview from './ProcessingInterview';
import CaptureLivePhoto from './CaptureLivePhoto';
import TabSwitchMonitor from './TabSwitchMonitor';

export interface InterviewSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  questions: QuestionResponse[];
  currentQuestionIndex: number;
  score: number;
  status: 'waiting' | 'active' | 'completed';
}

export interface QuestionResponse {
  question: string;
  userAnswer: string;
  aiEvaluation: string;
  score: number;
  endTime?: number;
  responseTime: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'general' | 'situational';
  expectedDuration: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  suggestedAnswers?: string[];
  evaluationCriteria?: string[];
  isRequired: boolean;
  order: number;
}

interface InterviewInterfaceProps {
  physicsQuestions: InterviewQuestion[];
  fetchQueData: {
    jobTitle?: string;
  } | null;
  candidateId?: string | null;
  jobData: JobPost | null;
  token: string | null;
}

export interface StudentInterviewAnswer {
  id: string;
  answer: string;
  aiEvaluation: string;
  score: number;
  responseTime: number;
  Question: InterviewQuestion;
  start: number;
  end: number;
}

export interface Candidate {
  id: string;
  jobPostId: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  interviewVideoLink?: string;
  appliedDate: any;
  interviewDate: any;
  duration: number;
  status: 'completed' | 'inprogress' | 'scheduled';
  overallScore: number;
  scores: {
    communication: number;
    technical: number;
    problemSolving: number;
    leadership: number;
    bodyLanguage: number;
    confidence: number;
  };
  experienceLevel: string;
  skills: string[];
  resumeUrl: string;
  linkedinUrl: string;
  recommendation: string;
  notes: string;
  hasRecording: boolean;
  designation?: string;
  location?: string;
  attemptedQuestions: number;
  photoUrl?: string;
  JobPost?: JobPost;
  StudentInterviewAnswer?: StudentInterviewAnswer[];
  aiEvaluationSummary?: {
    summary?: string;
    keyStrengths?: string[];
    areasOfGrowth?: string[];
  };
  performanceBreakdown?: any;
  quickStats?: any;
  recommendations?: {
    summary?: string;
    recommendation?: string;
  };
  behavioral_analysis: any;
  video_analysis_insights?: {
    areas_for_improvement?: string[];
    positive_indicators?: string[];
    recommendations?: string[];
  };
}

const InterviewInterface: React.FC<InterviewInterfaceProps> = ({
  physicsQuestions,
  fetchQueData,
  candidateId,
  jobData,
  token,
}) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
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
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const endInterviewRef = useRef<
    ((updatedSession: InterviewSession) => Promise<void>) | null
  >(null);

  // Shuffle questions with communication type questions first
  const shuffledQuestions = useMemo(() => {
    if (!physicsQuestions || physicsQuestions.length === 0) {
      return [];
    }

    // Separate communication questions from others
    const communicationQuestions = physicsQuestions.filter(
      (q) => q.type?.toLowerCase() === 'communication'
    );

    const otherQuestions = physicsQuestions.filter(
      (q) => q.type?.toLowerCase() !== 'communication'
    );

    // Fisher-Yates shuffle function
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Shuffle communication questions
    const shuffledCommunication = shuffleArray(communicationQuestions);

    // Shuffle other questions
    const shuffledOthers = shuffleArray(otherQuestions);

    // Return: communication questions first, then others
    return [...shuffledCommunication, ...shuffledOthers];
  }, [physicsQuestions]);

  const isLastQuestion =
    session?.currentQuestionIndex === shuffledQuestions.length - 1;
  const currentQuestion =
    shuffledQuestions[session?.currentQuestionIndex ?? -1];
  const isCommunicationQuestion =
    currentQuestion?.type?.toLowerCase() === 'communication';

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
    isLoading: isLoadingAudio,
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

  // Request microphone and camera permissions
  const requestPermissions = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      console.warn('getUserMedia is not supported in this environment.');
      alert(
        'Your browser does not support camera/microphone access. Please use Chrome, Edge, Firefox, or Safari.'
      );
      return;
    }

    // Only request if jobData is available
    if (!jobData) {
      return;
    }

    setIsRequestingPermissions(true);

    try {
      console.log(
        '🔔 Requesting device permissions (this will show browser pop-up)...'
      );

      // Request permissions based on video recording setting
      // This will show the native browser permission pop-up
      if (jobData.enableVideoRecording) {
        // Request both audio and video together - shows one pop-up for both
        // This triggers the native browser permission dialog
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });

        console.log('✅ Permissions granted by user');

        // Stop this temporary stream - startCamera will create its own
        mediaStream.getTracks().forEach((track) => track.stop());

        // Now start camera properly (will reuse granted permissions)
        // This keeps the camera stream active for the interview
        try {
          await startCamera();
          setMicrophoneReady(true);
          setPermissionsRequested(true);
          console.log('✅ Camera and microphone ready');
        } catch (cameraErr: any) {
          console.error('❌ Camera setup failed:', cameraErr);
          // Still set microphone ready if audio track was available
          setMicrophoneReady(true);
          setPermissionsRequested(true);
        }
      } else {
        // Audio-only mode - request microphone permission
        // This triggers the native browser permission dialog
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        });

        console.log('✅ Microphone permission granted by user');
        setMicrophoneReady(true);
        setPermissionsRequested(true);

        // Stop the stream - we'll request it again when starting the interview
        audioStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error: any) {
      console.error('❌ Permission request failed:', error);

      // Handle different error types
      if (error.name === 'NotAllowedError') {
        console.log('User denied permissions');
        setMicrophoneReady(false);
        alert(
          '❌ Permission denied.\n\nPlease allow ' +
            (jobData.enableVideoRecording
              ? 'microphone and camera'
              : 'microphone') +
            " access in your browser settings and try again.\n\nSteps:\n1. Click the lock/camera icon in your browser's address bar\n2. Allow " +
            (jobData.enableVideoRecording
              ? 'microphone and camera'
              : 'microphone') +
            ' permissions\n3. Click "Request Permissions" again'
        );
      } else if (error.name === 'NotFoundError') {
        console.log('No devices found');
        setMicrophoneReady(false);
        alert(
          '❌ No ' +
            (error.message.includes('video') ? 'camera' : 'microphone') +
            ' found.\n\nPlease connect a ' +
            (error.message.includes('video') ? 'camera' : 'microphone') +
            ' and try again.'
        );
      } else if (error.name === 'NotReadableError') {
        setMicrophoneReady(false);
        alert(
          '❌ Device is already in use.\n\nPlease close other applications using your ' +
            (error.message.includes('video') ? 'camera' : 'microphone') +
            ' and try again.'
        );
      } else {
        console.log('Other error:', error.message);
        setMicrophoneReady(false);
        alert(
          `❌ Error requesting permissions: ${error.message || 'Unknown error'}`
        );
      }
    } finally {
      setIsRequestingPermissions(false);
    }
  };

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
    file: any,
    damisession: InterviewSession
  ) => {
    try {
      setCurrentStep(0);
      setIsLoading(true);
      const timestamp = Date.now();
      const formData = new FormData();
      formData.append('video', file);
      formData.append(
        'fileName',
        `${jobData?.id}_${candidateId}_${timestamp}.mp4`
      );
      const res = await axios.post(
        `${
          import.meta.env.VITE_AIINTERVIEW_API_KEY
        }/jobposts/upload-interview-video`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      if (res.data?.path) {
        let file_url = `${
          import.meta.env.VITE_AIINTERVIEW_API_VIDEO_ENDPOINT
        }/${res.data?.path}`;
        console.log('✅ Video uploaded successfully, URL:', file_url);
        try {
          let questionsWithAnswer = session?.questions?.map((v) => {
            return {
              ...v,
              questionDetails: shuffledQuestions?.find(
                (q) => q.question === v?.question
              ),
            };
          });
          setCurrentStep(1);
          let behavioraldata = await getBehaviouralAnalysis(
            file_url,
            questionsWithAnswer,
            jobData
          );
          if (behavioraldata?.status === 'success') {
            let newbehavioraldata = {
              ...behavioraldata,
            };
            // Remove metadata fields that shouldn't be saved to database
            delete newbehavioraldata?.analysis_settings;
            delete newbehavioraldata?.status;
            delete newbehavioraldata?.timestamp;
            delete newbehavioraldata?.token_consumption;
            // Keep video_url in meta but don't duplicate it in main data
            // (video_url is already saved separately as interviewVideoLink)
            if (newbehavioraldata?.meta) {
              delete newbehavioraldata.meta.video_url;
            }
            setCurrentStep(2);
            await updateCandidateDetails(
              file_url?.length > 0 ? file_url : null,
              damisession,
              {
                ...newbehavioraldata,
              }
            );
          } else {
            console.warn(
              '⚠️ Video analysis failed, saving interview data without analysis:',
              behavioraldata
            );
            // Still save interview data even if analysis fails
            setCurrentStep(2);
            await updateCandidateDetails(
              file_url?.length > 0 ? file_url : null,
              damisession,
              {}
            );
          }
        } catch (error) {
          console.error('❌ Error during video analysis:', error);
          // Still save interview data even if analysis fails
          setCurrentStep(2);
          await updateCandidateDetails(
            res.data?.path
              ? `${import.meta.env.VITE_AIINTERVIEW_API_VIDEO_ENDPOINT}/${
                  res.data?.path
                }`
              : null,
            damisession,
            {}
          );
        }
      } else {
        console.warn(
          '⚠️ Video upload response missing path, saving interview data without video'
        );
        // Still save interview data even if video upload response is invalid
        await updateCandidateDetails(null, damisession, {});
      }
    } catch (error) {
      console.error('❌ Error uploading video file:', error);
      // Still save interview data even if video upload fails
      console.log(
        '💾 Saving interview data without video due to upload error...'
      );
      try {
        await updateCandidateDetails(null, damisession, {});
      } catch (saveError) {
        console.error('❌ Error saving interview data:', saveError);
        setCurrentStep(0);
        setErrorText(
          'Sorry, unable to upload the interview video and save interview data. Please try again.'
        );
        setIsLoading(false);
      }
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
        ? Math.round(
            (damisession.endTime.getTime() - damisession.startTime.getTime()) /
              1000 /
              60
          )
        : 0;

      let averageScore = 0;
      let totalScore = 0;
      let averageResponseTime = 0;
      if (damisession?.questions) {
        averageScore =
          damisession?.questions.length > 0
            ? Math.round(
                damisession?.questions.reduce(
                  (sum: any, q: { score: any }) => sum + q.score,
                  0
                ) / damisession?.questions.length
              )
            : 0;
        totalScore =
          damisession?.questions.length > 0
            ? Math.round(
                damisession?.questions.reduce((sum, q) => sum + q.score, 0)
              )
            : 0;

        averageResponseTime =
          damisession?.questions.length > 0
            ? Math.round(
                damisession?.questions.reduce(
                  (sum, q) => sum + q.responseTime,
                  0
                ) / damisession?.questions.length
              )
            : 0;
      }
      const gradeInfo = getGrade(averageScore);
      let newQuestions: any[] = [];
      shuffledQuestions.map((ques: any) => {
        let question = { ...ques };
        let findquesResp = damisession?.questions?.find(
          (item) => item.question === ques?.question
        );
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
          interviewoverview?.performanceBreakdown?.communicationSkills
            ?.overallAveragePercentage ?? 0,
        technical:
          interviewoverview?.performanceBreakdown?.technicalKnowledge
            ?.overallAveragePercentage ?? 0,
        problemSolving:
          interviewoverview?.performanceBreakdown?.problemSolving
            ?.overallAveragePercentage ?? 0,
        leadership:
          interviewoverview?.performanceBreakdown?.leadershipPotential
            ?.overallAveragePercentage ?? 0,
        bodyLanguage:
          interviewoverview?.performanceBreakdown?.body_language
            ?.overallAveragePercentage ?? 0,
        confidence:
          interviewoverview?.performanceBreakdown?.confidenceLevel
            ?.overallAveragePercentage ?? 0,
      };
      // setIsModalLoading(true);
      const response = await axios.post(
        `${
          import.meta.env.VITE_AIINTERVIEW_API_KEY
        }/jobposts/update-candidate-byid`,
        {
          candidateId: candidateId,
          data: {
            interviewVideoLink: videolink ?? '',
            status: 'completed',
            interviewDate: new Date(),
            hasRecording: videolink ? true : false,
            photoUrl: photoUrl ?? '',
            questions: newQuestions,
            attemptedQuestions: damisession?.questions?.length ?? 0,
            overallScore: averageScore,
            totalScore: totalScore,
            grade: gradeInfo?.grade,
            duration: totalTime,
            scores: damiscores,
            averageResponseTime: averageResponseTime,
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
  const [generatedAudioQuestions, setGeneratedAudioQuestions] = useState<
    Set<string>
  >(new Set());

  // Auto-start listening when question audio finishes playing (only for communication questions)
  useEffect(() => {
    if (
      !isPlaying &&
      !isLoading &&
      currentAudio &&
      speechSupported &&
      isCommunicationQuestion
    ) {
      // Small delay to ensure audio has fully stopped
      const timer = setTimeout(() => {
        if (!isListening && !hasFinishedSpeaking) {
          startListening();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    isPlaying,
    isLoading,
    currentAudio,
    speechSupported,
    isListening,
    hasFinishedSpeaking,
    startListening,
    isCommunicationQuestion,
  ]);

  const handleNextQuestion = useCallback(
    async (answerText?: string) => {
      if (!session || !currentQuestion || session?.status === 'completed') {
        console.log('❌ Not ready to handle answer');
        return;
      }

      // Use provided answer text (for text input) or transcript (for voice)
      const trimmedAnswer = answerText?.trim() || transcript.trim();

      if (trimmedAnswer.length < 10) {
        console.log('⚠️ Answer too short, waiting for more:', trimmedAnswer);
        return;
      }

      const wordCount = trimmedAnswer.split(/\s+/).length;
      if (wordCount < 3) {
        console.log(
          '⚠️ Answer has too few words, waiting for more. Words:',
          wordCount
        );
        return;
      }

      // Prevent multiple calls
      if (isProcessingResponse) return;
      setIsProcessingResponse(true);

      // Stop listening when processing response (only if listening)
      if (isListening) {
        stopListening();
      }
      setIsAnalyzing(true);

      try {
        const evaluation = await processPhysicsQuestion(
          currentQuestion.question,
          trimmedAnswer
        );
        console.log('📊 Evaluation completed:', evaluation);

        const isCommQuestion =
          currentQuestion?.type?.toLowerCase() === 'communication';
        // Play feedback briefly for communication questions, then move to next question
        if (isCommQuestion) {
          setIsGeneratingAudio(true);
          try {
            console.log('🔊 Playing feedback...');
            const feedbackAudio = await elevenLabsService.textToSpeech(
              evaluation.feedback
            );
            if (feedbackAudio) {
              console.log('🎵 Playing question audio...');
              setCurrentAudio(feedbackAudio);
              await playAudio(feedbackAudio);
              console.log('✅ Question audio completed');
            } else {
              // Short delay if no audio
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error('💥 Error playing feedback:', error);
          }
        } else {
          // Short delay for text questions
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const responseTime = (Date.now() - questionStartTime) / 1000;
        let totalResponseTime = session.questions.reduce(
          (sum, q) => sum + q.responseTime,
          0
        );
        const endTime = totalResponseTime + responseTime;

        // Create question response
        const questionResponse: QuestionResponse = {
          question: currentQuestion?.question,
          userAnswer: trimmedAnswer,
          aiEvaluation: evaluation.feedback,
          score: evaluation.score ?? 0,
          endTime: endTime,
          responseTime: responseTime,
        };

        // Update session
        const updatedSession = {
          ...session,
          questions: [...session.questions, questionResponse],
          currentQuestionIndex: session.currentQuestionIndex + 1,
          score: session.score + evaluation.score,
        };
        setSession(updatedSession);

        const isLast =
          session.currentQuestionIndex === shuffledQuestions.length - 1;
        if (isLast && endInterviewRef.current) {
          setTimeout(() => {
            endInterviewRef.current?.(updatedSession);
          }, 1000);
        } else {
          // Small delay before allowing next response processing
          setTimeout(() => {
            setIsProcessingResponse(false);
            setIsGeneratingAudio(false);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to process response:', error);
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
      !isProcessingResponse
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
      // Prevent duplicate audio generation for the same question
      if (
        generatedAudioQuestions.has(question.id) ||
        isGeneratingAudio ||
        isPlaying
      ) {
        return;
      }

      setIsGeneratingAudio(true);
      setGeneratedAudioQuestions((prev) => new Set(prev).add(question.id));

      try {
        setQuestionStartTime(Date.now());
        const voiceResponse = await elevenLabsService.textToSpeech(
          question?.question
        );

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
    if (currentQuestion) {
      // Reset transcript, text answer, and analysis when moving to new question
      setIsProcessingResponse(false);
      resetTranscript();
      setTextAnswer('');

      // Only generate audio for communication questions
      if (isCommunicationQuestion) {
        // Small delay to ensure state is reset before generating audio
        setTimeout(() => {
          generateQuestionAudio(currentQuestion);
        }, 100);
      }
    }
  }, [
    currentQuestion,
    generateQuestionAudio,
    resetTranscript,
    isCommunicationQuestion,
  ]);

  const startInterview = async () => {
    if (!speechSupported) {
      alert(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      );
      return;
    }

    if (!microphoneReady) {
      alert(
        'Microphone is not ready. Please allow microphone access and refresh the page.'
      );
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
        console.log(
          '✅ Microphone already ready (permissions granted on page load)'
        );
      }

      // Start camera only if video recording is enabled for this job
      if (jobData?.enableVideoRecording) {
        // If stream already exists, camera was started on page load
        if (!stream) {
          try {
            await startCamera();
            console.log('✅ Camera started (video recording enabled)');
          } catch (error) {
            console.warn(
              '⚠️ Camera failed to start, continuing without camera (audio-only)'
            );
          }
        } else {
          console.log(
            '✅ Camera already ready (permissions granted on page load)'
          );
        }
      }

      // Create new session
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
            console.log(
              '⚠️ Video recording failed, continuing without video recording'
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error('💥 Error starting interview:', error);
      alert(
        'Failed to start interview. Please check permissions and try again.'
      );
    }
  };

  // End interview - saves all data collected so far (even if interview ended early)
  const endInterview = useCallback(
    async (updatedSession: InterviewSession) => {
      console.log('🏁 Ending assessment (early exit or completion)');
      setIsLoading(true);
      setInterviewStarted(false);
      setIsGeneratingAudio(false);
      stopListening();

      // IMPORTANT: Stop recording FIRST to capture the blob BEFORE stopping camera
      // If video recording was enabled, stop recorder and upload video;
      // otherwise, just update candidate details using audio-only data.
      let videoBlobData: { blob: Blob } | null = null;
      if (jobData?.enableVideoRecording) {
        try {
          console.log('📹 Stopping video recording...');
          // Wait for recording to stop and blob to be created
          videoBlobData = await Promise.race([
            stopRecording(),
            new Promise<null>((resolve) =>
              setTimeout(() => {
                console.warn('⏱️ Recording stop timeout after 10 seconds');
                resolve(null);
              }, 10000)
            ),
          ]);

          if (videoBlobData?.blob && videoBlobData.blob.size > 0) {
            console.log('✅ Video recording stopped, blob captured:', {
              size: videoBlobData.blob.size,
              type: videoBlobData.blob.type,
            });
          } else {
            console.warn(
              '⚠️ Video recording stopped but no blob captured or blob is empty'
            );
            videoBlobData = null;
          }
        } catch (recordingError) {
          console.error('❌ Error stopping video recording:', recordingError);
          videoBlobData = null;
          // Continue without video - save interview data anyway
        }
      }

      // Stop camera AFTER recording is stopped and blob is captured (cleanup)
      try {
        if (jobData?.enableVideoRecording) {
          stopCamera();
        }
      } catch (cameraStopError) {
        console.warn('⚠️ Error stopping camera:', cameraStopError);
      }

      // Use current session or passed session
      const currentSession = updatedSession || session;
      if (currentSession) {
        let damisession: InterviewSession = {
          ...currentSession,
          endTime: new Date(),
          status: 'completed',
        };

        // Update session status immediately so UI shows completion
        setSession({
          ...damisession,
        });

        try {
          // Save interview data even if user ended early - save whatever questions were answered
          // This ensures partial interview data is preserved with audio/video recordings
          if (damisession?.questions && damisession.questions.length > 0) {
            console.log(
              `💾 Saving interview data (${damisession.questions.length} question(s) answered)...`
            );

            if (jobData?.enableVideoRecording) {
              // Video recording mode
              if (videoBlobData?.blob && videoBlobData.blob.size > 0) {
                console.log(
                  '📤 Uploading video recording with interview data...'
                );
                // Upload video and save interview details with video URL - await to ensure completion
                await uploadinterviewvideo(videoBlobData.blob, damisession);
              } else {
                console.warn(
                  '⚠️ No video blob captured, saving interview data without video'
                );
                // No video was captured; still persist interview details without video link
                // This handles cases where recording failed but interview was completed
                await updateCandidateDetails(null, damisession, {});
              }
            } else {
              // Audio-only mode – no video upload/analysis
              console.log('🎤 Audio-only mode: Saving interview data...');
              await updateCandidateDetails(null, damisession, {});
            }
          } else {
            // No questions answered - still save empty interview record to mark as attempted
            console.log(
              '⚠️ No questions answered, saving empty interview record'
            );
            if (jobData?.enableVideoRecording) {
              if (videoBlobData?.blob && videoBlobData.blob.size > 0) {
                // Save video even if no questions answered
                await uploadinterviewvideo(videoBlobData.blob, damisession);
              } else {
                await updateCandidateDetails(null, damisession, {});
              }
            } else {
              await updateCandidateDetails(null, damisession, {});
            }
          }
        } catch (error) {
          console.error('❌ Error saving interview data:', error);
          setErrorText(
            'Failed to save interview data. Please contact support.'
          );
        } finally {
          // Always set loading to false after saving completes (or fails)
          setIsLoading(false);
        }
      } else {
        console.error('❌ No session data available to save');
        setIsLoading(false);
      }
    },
    [
      session,
      stopListening,
      stopCamera,
      stopRecording,
      jobData,
      updateCandidateDetails,
    ]
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
      <div className='container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl'>
        {/* Header */}
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
              🎤 <strong>Smart Voice Detection!</strong> AI Assessment that
              understands when you're speaking. Answer questions naturally at
              your own pace.
            </p>
          )}
        </div>

        {/* Permission Request Screen - Show First */}
        {!permissionsRequested && !interviewStarted && !session?.status ? (
          <div className='max-w-2xl mx-auto'>
            <div className='bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8'>
              <div className='text-center'>
                <div className='p-4 sm:p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto flex items-center justify-center'>
                  <Camera className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600' />
                </div>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3'>
                  Device Permissions Required
                </h2>
                <p className='text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 px-2'>
                  To conduct the interview, we need access to your{' '}
                  {jobData?.enableVideoRecording
                    ? 'camera and microphone'
                    : 'microphone'}
                  . Click the button below to grant permissions.
                </p>

                <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl'>
                  <h3 className='font-semibold text-blue-800 mb-2 text-sm sm:text-base'>
                    Required Permissions:
                  </h3>
                  <ul className='text-left text-xs sm:text-sm text-blue-700 space-y-1'>
                    <li className='flex items-center gap-2'>
                      <Mic className='w-4 h-4' />
                      <span>Microphone - Required for voice responses</span>
                    </li>
                    {jobData?.enableVideoRecording && (
                      <li className='flex items-center gap-2'>
                        <Camera className='w-4 h-4' />
                        <span>Camera - Required for video recording</span>
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={requestPermissions}
                  // onClick={() => {
                  //   fetch(`${import.meta.env.VITE_PYTHON_API}/health`, {
                  //     method: 'GET',
                  //     headers: {
                  //       'content-type': 'application/json',
                  //     },
                  //   })
                  //     .then((res) => res.json())
                  //     .then((data) => {
                  //       console.log('-=-=-=--=---health=-=--=--=--=', data);
                  //     })
                  //     .catch((err) => {
                  //       console.log(err);
                  //     });
                  //   // fetch(
                  //   //   `${
                  //   //     import.meta.env.VITE_PYTHON_API
                  //   //   }/comprehensive-interview-analysis`,
                  //   //   {
                  //   //     headers: {
                  //   //       'content-type': 'application/json',
                  //   //     },
                  //   //     body: '{"video_url":"https://pseudoparalytic-madonna-swithly.ngrok-free.dev/uploads/blob-1757165397191-355742435.webm","questionsWithAnswer":[{"question":"How do you ensure that your communication with ZATCA is effective and professional?","userAnswer":"I don\'t know about this but you can skip this question","aiEvaluation":"No worries at all!","score":0,"endTime":26.858,"responseTime":26.858,"questionDetails":{"id":157,"question":"How do you ensure that your communication with ZATCA is effective and professional?","type":"communication","difficulty":"medium","duration":120,"category":"Professional Communication","createdAt":"2026-01-17T08:45:09.219Z","updatedAt":"2026-01-17T08:45:09.219Z","jobPostId":7,"suggestedAnswerPoints":[]}},{"question":"How would you handle a situation where a client is unhappy with your tax advice?","userAnswer":"again I don\'t know you can skip this also","aiEvaluation":"No worries at all!","score":0,"endTime":43.775999999999996,"responseTime":16.918,"questionDetails":{"id":159,"question":"How would you handle a situation where a client is unhappy with your tax advice?","type":"communication","difficulty":"medium","duration":150,"category":"Conflict Management","createdAt":"2026-01-17T08:45:09.457Z","updatedAt":"2026-01-17T08:45:09.457Z","jobPostId":7,"suggestedAnswerPoints":[]}},{"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","userAnswer":"I don\'t know about that I don\'t have any idea about tax","aiEvaluation":"No worries at all!","score":0,"endTime":69.431,"responseTime":25.655,"questionDetails":{"id":158,"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","type":"communication","difficulty":"medium","duration":120,"category":"Client Management","createdAt":"2026-01-17T08:45:09.351Z","updatedAt":"2026-01-17T08:45:09.351Z","jobPostId":7,"suggestedAnswerPoints":[]}}],"jobData":{"id":7,"jobTitle":"Tax Consultant","company":"TechInfo ","department":"Tax Advisory","location":["Saudi Arabia"],"jobType":"full-time","experienceLevel":"mid","jobDescription":"We are seeking a knowledgeable and detail-oriented Tax Consultant to join our Tax Advisory team. \\nThe ideal candidate will have hands-on experience with the Saudi tax regime, including Corporate Income Tax, Zakat, Withholding Tax, VAT, Excise Tax, and Customs duties. \\nThe role requires managing tax compliance, audit inquiries, and effective communication with ZATCA. \\nYou will also assist clients with tax planning, documentation, and advisory services to ensure regulatory compliance.","salaryMin":12000,"salaryMax":18000,"salaryCurrency":"SR","status":"active","createdBy":"admin","shareableUrl":null,"applicants":5,"interviews":16,"activeJoinUser":null,"activeJoinUserCount":0,"enableVideoRecording":true,"createdAt":"2025-09-06T10:34:17.692Z","updatedAt":"2026-01-17T10:10:55.222Z","requirements":[{"id":208,"requirement":"Bachelor\'s degree in Accounting, Finance, or related field; CPA / CMA / ACCA is a plus","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7},{"id":209,"requirement":"Minimum 3 years of experience in tax compliance or advisory, preferably in Saudi Arabia","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7},{"id":210,"requirement":"Strong knowledge of Saudi Tax regulations, Zakat, VAT, and Withholding Tax","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7}],"responsibilities":[{"id":288,"responsibility":"Manage tax compliance for clients","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":289,"responsibility":"Handle audit inquiries related to tax matters","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":290,"responsibility":"Communicate effectively with ZATCA","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":291,"responsibility":"Assist clients with tax planning","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":292,"responsibility":"Prepare and maintain tax documentation","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":293,"responsibility":"Provide advisory services to ensure regulatory compliance","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7}],"skills":[{"id":96,"skill":"Tax compliance and advisory","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7},{"id":97,"skill":"Corporate Income Tax, Zakat, VAT, Withholding Tax knowledge","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7},{"id":98,"skill":"Audit management and documentation","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7}],"interviewQuestions":[{"id":145,"question":"Tell me about yourself.","type":"behavioral","difficulty":"easy","duration":120,"category":"Introduction","createdAt":"2026-01-17T08:45:08.144Z","updatedAt":"2026-01-17T08:45:08.144Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":146,"question":"Can you explain the key differences between Corporate Income Tax and Zakat in Saudi Arabia?","type":"reasoning","difficulty":"medium","duration":120,"category":"Tax Knowledge","createdAt":"2026-01-17T08:45:08.318Z","updatedAt":"2026-01-17T08:45:08.318Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":147,"question":"Describe a situation where you had to resolve a complex tax compliance issue. What steps did you take?","type":"reasoning","difficulty":"medium","duration":180,"category":"Problem Solving","createdAt":"2026-01-17T08:45:08.389Z","updatedAt":"2026-01-17T08:45:08.389Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":148,"question":"How would you prioritize tasks when managing multiple clients\' tax compliance deadlines?","type":"reasoning","difficulty":"medium","duration":120,"category":"Time Management","createdAt":"2026-01-17T08:45:08.469Z","updatedAt":"2026-01-17T08:45:08.469Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":149,"question":"What are the common audit inquiries you have encountered in tax compliance, and how did you address them?","type":"reasoning","difficulty":"medium","duration":150,"category":"Audit Management","createdAt":"2026-01-17T08:45:08.555Z","updatedAt":"2026-01-17T08:45:08.555Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":150,"question":"How do you stay updated with changes in the Saudi tax regime?","type":"reasoning","difficulty":"medium","duration":90,"category":"Continuous Learning","createdAt":"2026-01-17T08:45:08.623Z","updatedAt":"2026-01-17T08:45:08.623Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":151,"question":"Can you provide an example of a successful tax planning strategy you implemented for a client?","type":"reasoning","difficulty":"medium","duration":180,"category":"Tax Planning","createdAt":"2026-01-17T08:45:08.688Z","updatedAt":"2026-01-17T08:45:08.688Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":152,"question":"What challenges do you foresee in managing tax compliance for clients in Saudi Arabia?","type":"reasoning","difficulty":"medium","duration":120,"category":"Risk Assessment","createdAt":"2026-01-17T08:45:08.812Z","updatedAt":"2026-01-17T08:45:08.812Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":153,"question":"How would you handle a disagreement with a client regarding their tax obligations?","type":"reasoning","difficulty":"medium","duration":150,"category":"Conflict Resolution","createdAt":"2026-01-17T08:45:08.888Z","updatedAt":"2026-01-17T08:45:08.888Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":154,"question":"What steps would you take if you discovered a significant error in a client\'s tax return just before submission?","type":"reasoning","difficulty":"medium","duration":120,"category":"Ethical Decision Making","createdAt":"2026-01-17T08:45:08.974Z","updatedAt":"2026-01-17T08:45:08.974Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":155,"question":"How do you assess the effectiveness of your tax compliance processes?","type":"reasoning","difficulty":"medium","duration":120,"category":"Process Improvement","createdAt":"2026-01-17T08:45:09.053Z","updatedAt":"2026-01-17T08:45:09.053Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":156,"question":"Can you describe a time when you had to explain complex tax regulations to a client who was unfamiliar with them?","type":"communication","difficulty":"medium","duration":150,"category":"Client Communication","createdAt":"2026-01-17T08:45:09.124Z","updatedAt":"2026-01-17T08:45:09.124Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":157,"question":"How do you ensure that your communication with ZATCA is effective and professional?","type":"communication","difficulty":"medium","duration":120,"category":"Professional Communication","createdAt":"2026-01-17T08:45:09.219Z","updatedAt":"2026-01-17T08:45:09.219Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":158,"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","type":"communication","difficulty":"medium","duration":120,"category":"Client Management","createdAt":"2026-01-17T08:45:09.351Z","updatedAt":"2026-01-17T08:45:09.351Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":159,"question":"How would you handle a situation where a client is unhappy with your tax advice?","type":"communication","difficulty":"medium","duration":150,"category":"Conflict Management","createdAt":"2026-01-17T08:45:09.457Z","updatedAt":"2026-01-17T08:45:09.457Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":160,"question":"Describe how you would prepare for a meeting with a new client regarding their tax situation.","type":"communication","difficulty":"medium","duration":180,"category":"Preparation Skills","createdAt":"2026-01-17T08:45:09.547Z","updatedAt":"2026-01-17T08:45:09.547Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":161,"question":"How do you ensure that your written tax documentation is clear and comprehensive?","type":"communication","difficulty":"medium","duration":120,"category":"Documentation Skills","createdAt":"2026-01-17T08:45:09.642Z","updatedAt":"2026-01-17T08:45:09.642Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":162,"question":"What methods do you use to communicate tax changes to your clients effectively?","type":"communication","difficulty":"medium","duration":120,"category":"Client Updates","createdAt":"2026-01-17T08:45:09.747Z","updatedAt":"2026-01-17T08:45:09.747Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":163,"question":"How do you handle feedback from clients regarding your tax services?","type":"communication","difficulty":"medium","duration":150,"category":"Feedback Management","createdAt":"2026-01-17T08:45:09.824Z","updatedAt":"2026-01-17T08:45:09.824Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":164,"question":"What is your approach to collaborating with other departments to ensure comprehensive tax compliance?","type":"communication","difficulty":"medium","duration":120,"category":"Interdepartmental Collaboration","createdAt":"2026-01-17T08:45:09.909Z","updatedAt":"2026-01-17T08:45:09.909Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":165,"question":"How would you explain the importance of VAT compliance to a client who is skeptical about it?","type":"communication","difficulty":"medium","duration":150,"category":"Client Education","createdAt":"2026-01-17T08:45:09.990Z","updatedAt":"2026-01-17T08:45:09.990Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":166,"question":"If a client reports a discrepancy in their VAT return, how would you approach the situation?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Tax Calculation","createdAt":"2026-01-17T08:45:10.070Z","updatedAt":"2026-01-17T08:45:10.070Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":167,"question":"How would you calculate the total Zakat due for a client based on their financial statements?","type":"arithmetic","difficulty":"medium","duration":180,"category":"Zakat Calculation","createdAt":"2026-01-17T08:45:10.155Z","updatedAt":"2026-01-17T08:45:10.155Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":168,"question":"What is the formula for calculating Withholding Tax, and how would you apply it to a client\'s payment?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Withholding Tax Calculation","createdAt":"2026-01-17T08:45:10.253Z","updatedAt":"2026-01-17T08:45:10.253Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":169,"question":"If a client has a taxable income of 500,000 SR, what would be their Corporate Income Tax liability based on current rates?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Corporate Tax Calculation","createdAt":"2026-01-17T08:45:10.332Z","updatedAt":"2026-01-17T08:45:10.332Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":170,"question":"How would you assess the impact of Excise Tax on a client\'s product pricing strategy?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Excise Tax Impact","createdAt":"2026-01-17T08:45:10.408Z","updatedAt":"2026-01-17T08:45:10.408Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":171,"question":"What metrics do you use to evaluate the effectiveness of tax compliance strategies?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Performance Metrics","createdAt":"2026-01-17T08:45:10.488Z","updatedAt":"2026-01-17T08:45:10.488Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":172,"question":"How do you calculate the total tax liability for a client with multiple income sources?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Tax Liability Calculation","createdAt":"2026-01-17T08:45:10.577Z","updatedAt":"2026-01-17T08:45:10.577Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":173,"question":"If a client has a VAT-exempt product, how would you determine the implications for their overall tax strategy?","type":"arithmetic","difficulty":"medium","duration":150,"category":"VAT Strategy Assessment","createdAt":"2026-01-17T08:45:10.672Z","updatedAt":"2026-01-17T08:45:10.672Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":174,"question":"How would you approach a situation where a client’s tax documentation is incomplete?","type":"subjective","difficulty":"medium","duration":150,"category":"Documentation Management","createdAt":"2026-01-17T08:45:10.735Z","updatedAt":"2026-01-17T08:45:10.735Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":175,"question":"What do you believe is the most important quality for a Tax Consultant to possess?","type":"subjective","difficulty":"medium","duration":120,"category":"Personal Qualities","createdAt":"2026-01-17T08:45:10.836Z","updatedAt":"2026-01-17T08:45:10.836Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":176,"question":"How do you ensure that your tax planning strategies align with a client’s overall business goals?","type":"subjective","difficulty":"medium","duration":150,"category":"Strategic Alignment","createdAt":"2026-01-17T08:45:10.925Z","updatedAt":"2026-01-17T08:45:10.925Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":177,"question":"Describe a time when you had to advocate for a client\'s tax position. What was the outcome?","type":"subjective","difficulty":"medium","duration":180,"category":"Advocacy Skills","createdAt":"2026-01-17T08:45:11.013Z","updatedAt":"2026-01-17T08:45:11.013Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":178,"question":"What ethical considerations do you take into account when advising clients on tax matters?","type":"subjective","difficulty":"medium","duration":150,"category":"Ethical Standards","createdAt":"2026-01-17T08:45:11.090Z","updatedAt":"2026-01-17T08:45:11.090Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":179,"question":"How do you handle pressure when facing tight deadlines for tax compliance?","type":"subjective","difficulty":"medium","duration":120,"category":"Stress Management","createdAt":"2026-01-17T08:45:11.187Z","updatedAt":"2026-01-17T08:45:11.187Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":180,"question":"What role do you believe technology plays in modern tax consulting?","type":"subjective","difficulty":"medium","duration":120,"category":"Technological Awareness","createdAt":"2026-01-17T08:45:11.273Z","updatedAt":"2026-01-17T08:45:11.273Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":181,"question":"How do you approach continuous professional development in the field of tax consulting?","type":"subjective","difficulty":"medium","duration":150,"category":"Professional Growth","createdAt":"2026-01-17T08:45:11.346Z","updatedAt":"2026-01-17T08:45:11.346Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":182,"question":"What is your experience with handling tax audits, and what strategies do you employ to prepare for them?","type":"subjective","difficulty":"medium","duration":180,"category":"Audit Experience","createdAt":"2026-01-17T08:45:11.453Z","updatedAt":"2026-01-17T08:45:11.453Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":183,"question":"How do you ensure compliance with tax regulations while also maximizing client benefits?","type":"subjective","difficulty":"medium","duration":150,"category":"Compliance and Benefits","createdAt":"2026-01-17T08:45:11.563Z","updatedAt":"2026-01-17T08:45:11.563Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":184,"question":"What do you consider the biggest challenge in the field of tax consulting today?","type":"subjective","difficulty":"medium","duration":120,"category":"Industry Challenges","createdAt":"2026-01-17T08:45:11.641Z","updatedAt":"2026-01-17T08:45:11.641Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":185,"question":"How do you approach building long-term relationships with clients in tax consulting?","type":"subjective","difficulty":"medium","duration":150,"category":"Client Relationship Management","createdAt":"2026-01-17T08:45:11.753Z","updatedAt":"2026-01-17T08:45:11.753Z","jobPostId":7,"suggestedAnswerPoints":[]}]}}',
                  //   //     method: 'POST',
                  //   //   }
                  //   // )
                  //   //   .then((res) => res.json())
                  //   //   .then((data) => {
                  //   //     console.log('-=-=-=--=---=-=--=--=--=', data);
                  //   //   })
                  //   //   .catch((err) => {
                  //   //     console.log(err);
                  //   //   });
                  // }}
                  disabled={isRequestingPermissions || !jobData}
                  className='w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2'
                >
                  {isRequestingPermissions ? (
                    <>
                      <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                      <span>Requesting Permissions...</span>
                    </>
                  ) : (
                    <>
                      <Camera className='w-5 h-5' />
                      <span>
                        Request{' '}
                        {jobData?.enableVideoRecording ? 'Camera & ' : ''}
                        Microphone Permission
                      </span>
                    </>
                  )}
                </button>

                {!jobData && (
                  <p className='text-red-600 text-xs sm:text-sm mt-4'>
                    ⚠️ Job data is loading. Please wait...
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className='max-w-2xl mx-auto'>
            {/* <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mt-3 text-gray-600">
                  Please wait do not refresh page...
                </span>
              </div>
            </div> */}
            <ProcessingInterview currentStep={currentStep} />
          </div>
        ) : !interviewStarted && !session?.status ? (
          /* Pre-Assessment Setup */
          <div className='max-w-2xl mx-auto'>
            <div className='bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8'>
              <div className='text-center mb-4 sm:mb-6'>
                <div className='p-4 sm:p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto flex items-center justify-center'>
                  <Award className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600' />
                </div>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3'>
                  Ready for Your Smart {fetchQueData?.jobTitle ?? 'Physics'}{' '}
                  Assessment?
                </h2>
                <p className='text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 px-2'>
                  🎤 <strong>Intelligent Voice Detection!</strong> The system
                  understands when you're speaking. Answer questions naturally.
                  <span className='block mt-1'>
                    <strong>Speak at your own pace - no rushing needed!</strong>
                  </span>
                </p>

                <div className='grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6'>
                  <div className='p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg sm:rounded-xl'>
                    <Clock className='w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600 mx-auto mb-1 sm:mb-2' />
                    <h3 className='font-semibold text-blue-800 text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1'>
                      🎤 Smart
                    </h3>
                    <p className='text-xs sm:text-sm text-blue-600 hidden sm:block'>
                      Detection
                    </p>
                  </div>
                  <div
                    className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${
                      microphoneReady ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <Mic
                      className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2 ${
                        microphoneReady ? 'text-green-600' : 'text-red-600'
                      }`}
                    />
                    <h3
                      className={`font-semibold text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1 ${
                        microphoneReady ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {microphoneReady ? '🎤 Ready' : 'Mic Needed'}
                    </h3>
                    <p
                      className={`text-xs sm:text-sm hidden sm:block ${
                        microphoneReady ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {microphoneReady ? 'Ready' : 'Allow access'}
                    </p>
                  </div>
                  <div
                    className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${
                      jobData?.enableVideoRecording
                        ? cameraError
                          ? 'bg-yellow-50'
                          : 'bg-purple-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <Camera
                      className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2 ${
                        jobData?.enableVideoRecording
                          ? cameraError
                            ? 'text-yellow-600'
                            : 'text-purple-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <h3
                      className={`font-semibold text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1 ${
                        jobData?.enableVideoRecording
                          ? cameraError
                            ? 'text-yellow-800'
                            : 'text-purple-800'
                          : 'text-gray-600'
                      }`}
                    >
                      {jobData?.enableVideoRecording
                        ? cameraError
                          ? '⚠️ Issue'
                          : '📹 Video'
                        : '🎧 Audio'}
                    </h3>
                    <p
                      className={`text-xs sm:text-sm hidden sm:block ${
                        jobData?.enableVideoRecording
                          ? cameraError
                            ? 'text-yellow-600'
                            : 'text-purple-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {jobData?.enableVideoRecording
                        ? cameraError
                          ? 'Check access'
                          : 'Enabled'
                        : 'Only'}
                    </p>
                  </div>
                </div>

                {/* Error Messages */}
                {(speechError ||
                  (jobData?.enableVideoRecording && cameraError) ||
                  !microphoneReady) && (
                  <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700'>
                    <p className='font-medium mb-1 sm:mb-2 text-sm sm:text-base'>
                      ⚠️ Setup Required:
                    </p>
                    <ul className='text-xs sm:text-sm list-disc list-inside space-y-0.5 sm:space-y-1'>
                      {!speechSupported && (
                        <li>
                          Speech recognition is not supported in this browser.
                          Please use Chrome, Edge, or Safari.
                        </li>
                      )}
                      {speechError && (
                        <li>Speech Recognition: {speechError}</li>
                      )}
                      {!microphoneReady && (
                        <li>
                          Microphone: Please allow microphone access and refresh
                          the page.
                        </li>
                      )}
                      {jobData?.enableVideoRecording && cameraError && (
                        <li>
                          Camera: {cameraError} - Please allow camera access and
                          refresh the page.
                        </li>
                      )}
                      {jobData?.enableVideoRecording &&
                        !cameraError &&
                        !navigator.mediaDevices?.getUserMedia && (
                          <li>
                            Camera: Your browser doesn't support camera access.
                            Please use a modern browser (Chrome, Firefox, Edge,
                            Safari).
                          </li>
                        )}
                    </ul>
                  </div>
                )}

                {/* Test Recording Setup Button */}
                <div className='mb-4 sm:mb-6'>
                  <button
                    onClick={async () => {
                      try {
                        // Test microphone
                        console.log('🧪 Testing microphone...');
                        const micStream =
                          await navigator.mediaDevices.getUserMedia({
                            audio: {
                              echoCancellation: true,
                              noiseSuppression: true,
                              autoGainControl: true,
                            },
                          });
                        micStream.getTracks().forEach((track) => track.stop());
                        setMicrophoneReady(true);
                        console.log('✅ Microphone ready');

                        // Test camera if video recording is enabled
                        if (jobData?.enableVideoRecording) {
                          console.log('🧪 Testing camera...');
                          setShowTestResult(true);
                          await startCamera();
                          // Wait a bit for state to update, then check result
                          setTimeout(() => {
                            if (stream && !cameraError) {
                              alert(
                                '✅ All devices are working correctly!\n\nMicrophone: Ready ✓\nCamera: Ready ✓\n\nYou can now start the interview!'
                              );
                            } else if (cameraError) {
                              alert(
                                '⚠️ Device test partially successful:\n\n✅ Microphone: Ready ✓\n❌ Camera: ' +
                                  cameraError +
                                  '\n\nPlease check the error message below and try again.'
                              );
                            } else {
                              alert(
                                '✅ Device test completed!\n\nMicrophone: Ready ✓\nCamera: Please check status below\n\nIf camera shows as ready, you can start the interview!'
                              );
                            }
                            setShowTestResult(false);
                          }, 800);
                        } else {
                          alert(
                            '✅ Microphone is working correctly!\n\nMicrophone: Ready ✓\n(No camera test - audio-only mode)\n\nYou can now start the interview!'
                          );
                        }
                      } catch (err: any) {
                        console.error('Device test failed:', err);
                        let errorMsg = 'Device test failed:\n\n';
                        if (err.name === 'NotAllowedError') {
                          errorMsg += '❌ Permission denied.\n\n';
                          errorMsg +=
                            'Please allow ' +
                            (jobData?.enableVideoRecording
                              ? 'microphone and camera'
                              : 'microphone') +
                            ' access in your browser settings.\n\n';
                          errorMsg += 'Steps:\n';
                          errorMsg +=
                            "1. Click the lock/camera icon in your browser's address bar\n";
                          errorMsg +=
                            '2. Allow microphone' +
                            (jobData?.enableVideoRecording
                              ? ' and camera'
                              : '') +
                            ' permissions\n';
                          errorMsg += '3. Refresh this page';
                        } else if (err.name === 'NotFoundError') {
                          errorMsg +=
                            '❌ No ' +
                            (err.message.includes('video')
                              ? 'camera'
                              : 'microphone') +
                            ' found.\n\n';
                          errorMsg +=
                            'Please connect a ' +
                            (err.message.includes('video')
                              ? 'camera'
                              : 'microphone') +
                            ' and try again.';
                        } else if (err.name === 'NotReadableError') {
                          errorMsg += '❌ Device is already in use.\n\n';
                          errorMsg +=
                            'Please close other applications using your ' +
                            (err.message.includes('video')
                              ? 'camera'
                              : 'microphone') +
                            ' and try again.';
                        } else {
                          errorMsg += `❌ ${err.message || 'Unknown error'}`;
                        }
                        alert(errorMsg);
                      }
                    }}
                    className='w-full px-4 sm:px-6 py-2 sm:py-3 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg sm:rounded-xl border border-green-300 transition-all duration-200 mb-3 sm:mb-4 flex items-center justify-center gap-2 text-sm sm:text-base'
                  >
                    <span>🧪</span>
                    <span>Test Recording Setup</span>
                  </button>
                </div>

                {/* Live Photo Capture Section */}
                <CaptureLivePhoto
                  stream={stream}
                  jobData={jobData}
                  candidateId={candidateId ?? ''}
                  isPhotoCaptured={isPhotoCaptured}
                  setPhotoUrl={setPhotoUrl}
                  setIsPhotoCaptured={setIsPhotoCaptured}
                />

                <button
                  onClick={startInterview}
                  disabled={
                    !speechSupported ||
                    !!speechError ||
                    !microphoneReady ||
                    (jobData?.enableVideoRecording && !!cameraError) ||
                    !isPhotoCaptured ||
                    !photoUrl
                  }
                  className='w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                >
                  🎤 Start Assessment
                </button>
              </div>
            </div>
          </div>
        ) : session?.status === 'completed' ? (
          /* Interview Summary */
          <InterviewSummary
            session={session}
            isLoading={isLoading}
            errorText={errorText}
            candidateData={candidateData}
          />
        ) : (
          /* Active Interview */
          <div className='space-y-4 sm:space-y-6'>
            {/* Tab Switch Monitor Component */}
            <TabSwitchMonitor
              isActive={interviewStarted}
              isCompleted={isCompleted}
              onForceComplete={(reason: string) => {
                console.log('reason', reason);
              }}
            />

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
              {/* Camera and Controls */}
              <div className='lg:col-span-1 space-y-4 sm:space-y-6'>
                <CameraView
                  stream={stream}
                  isRecording={isRecording}
                  error={cameraError}
                />

                <InterviewControls
                  isListening={isListening}
                  isProcessing={isAnalyzing || isProcessingResponse}
                  isPlayingAudio={isGeneratingAudio || isPlaying}
                  waitingForAnswer={waitingForAnswer}
                  onEndInterview={endInterview}
                  session={session as InterviewSession}
                  isCommunicationQuestion={isCommunicationQuestion}
                />

                {/* Voice Activity Status */}
                {!isAnalyzing && !isPlaying && isListening && (
                  <div className='bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/50 p-3 sm:p-4'>
                    <h3 className='text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3'>
                      🎤 Voice Status
                    </h3>
                    <div className='space-y-2 sm:space-y-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-600'>Speaking:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            hasFinishedSpeaking
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {hasFinishedSpeaking ? '🤐 No' : '🗣️ Yes'}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-600'>Activity:</span>
                        <span className='text-sm font-medium'>
                          {voiceActivity}%
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-2'>
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
              <div className='lg:col-span-2 space-y-4 sm:space-y-6'>
                {session && (
                  <InterviewProgress
                    session={session}
                    totalQuestions={shuffledQuestions.length}
                  />
                )}

                <QuestionDisplay
                  question={currentQuestion}
                  isProcessing={isAnalyzing}
                  isListening={isListening}
                  waitingForAnswer={waitingForAnswer}
                  transcript={transcript}
                  textAnswer={textAnswer}
                  onTextAnswerChange={setTextAnswer}
                  onSubmitTextAnswer={() => handleNextQuestion(textAnswer)}
                />

                {/* Recent Responses */}
                {session && session.questions.length > 0 && (
                  <div className='bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6'>
                    <h3 className='text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4'>
                      🎤 Latest Response
                    </h3>
                    <div className='space-y-2 sm:space-y-3'>
                      {session.questions.slice(-1).map((response, index) => (
                        <div
                          key={index}
                          className='p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl'
                        >
                          <div className='flex justify-between items-start mb-2'>
                            <p className='font-medium text-gray-800 text-sm sm:text-base'>
                              Your Answer:
                            </p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                response.score >= 8
                                  ? 'bg-green-100 text-green-800'
                                  : response.score >= 6
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {response.score}/10
                            </span>
                          </div>
                          <p className='text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3'>
                            {response.userAnswer}
                          </p>
                          <div className='border-t pt-2 sm:pt-3'>
                            <p className='font-medium text-gray-800 mb-1 text-sm sm:text-base'>
                              🎤 AI Feedback:
                            </p>
                            <p className='text-gray-600 text-xs sm:text-sm'>
                              {response.aiEvaluation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewInterface;
