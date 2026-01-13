import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Camera, Mic, Brain, Clock, Award } from "lucide-react";
import { CameraView } from "./CameraView";
import { InterviewControls } from "./InterviewControls";
import { QuestionDisplay } from "./QuestionDisplay";
import { InterviewProgress } from "./InterviewProgress";
import { getGrade, InterviewSummary } from "./InterviewSummary";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useCamera } from "../hooks/useCamera";
import {
  getBehaviouralAnalysis,
  processPhysicsQuestion,
} from "../services/apiService";
import { elevenLabsService } from "../services/elevenLabsService";
import axios from "axios";
import { JobPost } from "./NameEmailModal";
import ProcessingInterview from "./ProcessingInterview";

export interface InterviewSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  questions: QuestionResponse[];
  currentQuestionIndex: number;
  score: number;
  status: "waiting" | "active" | "completed";
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
  type: "behavioral" | "technical" | "general" | "situational";
  expectedDuration: number; // in seconds
  difficulty: "easy" | "medium" | "hard";
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
  status: "completed" | "inprogress" | "scheduled";
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
  const isLastQuestion =
    session?.currentQuestionIndex === physicsQuestions.length - 1;
  const currentQuestion = physicsQuestions[session?.currentQuestionIndex ?? -1];
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);

  let speechError = "";
  const {
    isListening,
    transcript,
    confidence,
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

  // Request microphone and camera permissions on component mount (shows native browser pop-up)
  useEffect(() => {
    const requestPermissions = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        console.warn("getUserMedia is not supported in this environment.");
        return;
      }

      // Only request if jobData is available
      if (!jobData) {
        return;
      }

      try {
        console.log("🔔 Requesting device permissions (this will show browser pop-up)...");
        
        // Request permissions based on video recording setting
        // This will show the native browser permission pop-up (like in the image)
        if (jobData.enableVideoRecording) {
          // Request both audio and video together - shows one pop-up for both
          // This triggers the native browser permission dialog
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: "user",
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
            },
          });
          
          console.log("✅ Permissions granted by user");
          
          // Stop this temporary stream - startCamera will create its own
          mediaStream.getTracks().forEach((track) => track.stop());
          
          // Now start camera properly (will reuse granted permissions)
          // This keeps the camera stream active for the interview
          try {
            await startCamera();
            setMicrophoneReady(true);
            console.log("✅ Camera and microphone ready");
          } catch (cameraErr: any) {
            console.error("❌ Camera setup failed:", cameraErr);
            // Still set microphone ready if audio track was available
            setMicrophoneReady(true);
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
          
          console.log("✅ Microphone permission granted by user");
          setMicrophoneReady(true);
          
          // Stop the stream - we'll request it again when starting the interview
          audioStream.getTracks().forEach((track) => track.stop());
        }
      } catch (error: any) {
        console.error("❌ Permission request failed:", error);
        
        // Handle different error types
        if (error.name === "NotAllowedError") {
          console.log("User denied permissions");
          setMicrophoneReady(false);
        } else if (error.name === "NotFoundError") {
          console.log("No devices found");
          setMicrophoneReady(false);
        } else {
          console.log("Other error:", error.message);
          setMicrophoneReady(false);
        }
      }
    };

    // Request permissions when component mounts and jobData is available
    // This will automatically show the browser permission pop-up
    requestPermissions();
  }, [jobData, startCamera]);

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
      formData.append("video", file);
      formData.append(
        "fileName",
        `${jobData?.id}_${candidateId}_${timestamp}.mp4`
      );
      const res = await axios.post(
        `${
          import.meta.env.VITE_AIINTERVIEW_API_KEY
        }/jobposts/upload-interview-video`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data?.path) {
        let file_url = `${
          import.meta.env.VITE_AIINTERVIEW_API_VIDEO_ENDPOINT
        }/${res.data?.path}`;
        console.log("✅ Video uploaded successfully, URL:", file_url);
        try {
          let questionsWithAnswer = session?.questions?.map((v) => {
            return {
              ...v,
              questionDetails: physicsQuestions?.find(
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
          if (behavioraldata?.status === "success") {
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
            console.warn("⚠️ Video analysis failed, saving interview data without analysis:", behavioraldata);
            // Still save interview data even if analysis fails
            setCurrentStep(2);
            await updateCandidateDetails(
              file_url?.length > 0 ? file_url : null,
              damisession,
              {}
            );
          }
        } catch (error) {
          console.error("❌ Error during video analysis:", error);
          // Still save interview data even if analysis fails
          setCurrentStep(2);
          await updateCandidateDetails(
            res.data?.path ? `${
              import.meta.env.VITE_AIINTERVIEW_API_VIDEO_ENDPOINT
            }/${res.data?.path}` : null,
            damisession,
            {}
          );
        }
      } else {
        console.warn("⚠️ Video upload response missing path, saving interview data without video");
        // Still save interview data even if video upload response is invalid
        await updateCandidateDetails(null, damisession, {});
      }
    } catch (error) {
      console.error("❌ Error uploading video file:", error);
      // Still save interview data even if video upload fails
      console.log("💾 Saving interview data without video due to upload error...");
      try {
        await updateCandidateDetails(null, damisession, {});
      } catch (saveError) {
        console.error("❌ Error saving interview data:", saveError);
        setCurrentStep(0);
        setErrorText(
          "Sorry, unable to upload the interview video and save interview data. Please try again."
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
      physicsQuestions.map((ques: any) => {
        let question = { ...ques };
        let findquesResp = damisession?.questions?.find(
          (item) => item.question === ques?.question
        );
        newQuestions.push({
          questionId: question?.id,
          studentId: candidateId,
          answer: findquesResp?.userAnswer ?? "",
          aiEvaluation: findquesResp?.aiEvaluation ?? "",
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
            interviewVideoLink: videolink ?? "",
            status: "completed",
            interviewDate: new Date(),
            hasRecording: videolink ? true : false,
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
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data) {
        setIsCompleted(true);
        setCandidateData(response.data?.candidate ?? null);
        // You can handle the response here (e.g., save data, show a message, etc.)
        setIsLoading(false);
        setCurrentStep(3);
        console.log("update candidate details response:", response.data);
      } else {
        setErrorText("Failed to save analysis data. Try a different email.");
        setCurrentStep(0);
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      // Handle error (show error message, etc.)
      console.error("Error joining job link:", error);
      setErrorText("Failed to save analysis data. Try a different email.");
    }
  };

  // Track which questions have had audio generated
  const [generatedAudioQuestions, setGeneratedAudioQuestions] = useState<
    Set<string>
  >(new Set());

  // Auto-start listening when question audio finishes playing
  useEffect(() => {
    if (!isPlaying && !isLoading && currentAudio && speechSupported) {
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
  ]);

  // Auto-advance to next question when user finishes speaking
  useEffect(() => {
    if (
      hasFinishedSpeaking &&
      transcript.trim() &&
      !isAnalyzing &&
      !isProcessingResponse
    ) {
      handleNextQuestion();
    }
  }, [hasFinishedSpeaking, transcript, isAnalyzing, isProcessingResponse]);

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
          console.log("🎵 Playing question audio...");
          setCurrentAudio(voiceResponse);
          await playAudio(voiceResponse);
          console.log("✅ Question audio completed");
        } else {
          console.log("⚠️ No audio, using delay");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error("Failed to generate question audio:", error);
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
      // Reset transcript and analysis when moving to new question
      setIsProcessingResponse(false);
      resetTranscript();
      // Small delay to ensure state is reset before generating audio
      setTimeout(() => {
        generateQuestionAudio(currentQuestion);
      }, 100);
    }
  }, [currentQuestion, generateQuestionAudio, resetTranscript]);

  const handleNextQuestion = async () => {
    if (!session || !currentQuestion || session?.status === "completed") {
      console.log("❌ Not ready to handle answer");
      return;
    }

    const trimmedAnswer = transcript.trim();
    if (trimmedAnswer.length < 10) {
      console.log("⚠️ Answer too short, waiting for more:", trimmedAnswer);
      return;
    }

    const wordCount = trimmedAnswer.split(/\s+/).length;
    if (wordCount < 3) {
      console.log(
        "⚠️ Answer has too few words, waiting for more. Words:",
        wordCount
      );
      return;
    }

    // Prevent multiple calls
    if (isProcessingResponse) return;
    setIsProcessingResponse(true);

    // Stop listening when processing response
    if (isListening) {
      stopListening();
    }
    setIsAnalyzing(true);

    try {
      const evaluation = await processPhysicsQuestion(
        currentQuestion.question,
        trimmedAnswer
      );
      console.log("📊 Evaluation completed:", evaluation);

      // Play feedback briefly, then move to next question
      setIsGeneratingAudio(true);
      try {
        console.log("🔊 Playing feedback...");
        const feedbackAudio = await elevenLabsService.textToSpeech(
          evaluation.feedback
        );
        if (feedbackAudio) {
          console.log("🎵 Playing question audio...");
          setCurrentAudio(feedbackAudio);
          await playAudio(feedbackAudio);
          console.log("✅ Question audio completed");
        } else {
          // Short delay if no audio
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error("💥 Error playing feedback:", error);
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

      if (isLastQuestion) {
        setTimeout(() => {
          endInterview(updatedSession);
        }, 1000);
      } else {
        // Small delay before allowing next response processing
        setTimeout(() => {
          setIsProcessingResponse(false);
          setIsGeneratingAudio(false);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to process response:", error);
      setIsProcessingResponse(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startInterview = async () => {
    if (!speechSupported) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (!microphoneReady) {
      alert(
        "Microphone is not ready. Please allow microphone access and refresh the page."
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
      console.log("🚀 Starting interview...");

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
        console.log("✅ Microphone access confirmed");
        testStream.getTracks().forEach((track) => track.stop());
        setMicrophoneReady(true);
      } else {
        console.log("✅ Microphone already ready (permissions granted on page load)");
      }

      // Start camera only if video recording is enabled for this job
      if (jobData?.enableVideoRecording) {
        // If stream already exists, camera was started on page load
        if (!stream) {
          try {
            await startCamera();
            console.log("✅ Camera started (video recording enabled)");
          } catch (error) {
            console.warn(
              "⚠️ Camera failed to start, continuing without camera (audio-only)"
            );
          }
        } else {
          console.log("✅ Camera already ready (permissions granted on page load)");
        }
      }

      // Create new session
      const newSession: InterviewSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        status: "active",
      };
      setSession(newSession);
      setInterviewStarted(true);

      // Start recording in background only when video recording is enabled
      if (jobData?.enableVideoRecording) {
        setTimeout(async () => {
          try {
            await startRecording();
            console.log("✅ Video recording started");
          } catch (error) {
            console.log(
              "⚠️ Video recording failed, continuing without video recording"
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error("💥 Error starting interview:", error);
      alert(
        "Failed to start interview. Please check permissions and try again."
      );
    }
  };

  // End interview - saves all data collected so far (even if interview ended early)
  const endInterview = useCallback(
    async (updatedSession: InterviewSession) => {
      console.log("🏁 Ending interview (early exit or completion)");
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
          console.log("📹 Stopping video recording...");
          // Wait for recording to stop and blob to be created
          videoBlobData = await Promise.race([
            stopRecording(),
            new Promise<null>((resolve) => 
              setTimeout(() => {
                console.warn("⏱️ Recording stop timeout after 10 seconds");
                resolve(null);
              }, 10000)
            )
          ]);
          
          if (videoBlobData?.blob && videoBlobData.blob.size > 0) {
            console.log("✅ Video recording stopped, blob captured:", {
              size: videoBlobData.blob.size,
              type: videoBlobData.blob.type
            });
          } else {
            console.warn("⚠️ Video recording stopped but no blob captured or blob is empty");
            videoBlobData = null;
          }
        } catch (recordingError) {
          console.error("❌ Error stopping video recording:", recordingError);
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
        console.warn("⚠️ Error stopping camera:", cameraStopError);
      }

      // Use current session or passed session
      const currentSession = updatedSession || session;
      if (currentSession) {
        let damisession: InterviewSession = {
          ...currentSession,
          endTime: new Date(),
          status: "completed",
        };
        
        // Update session status immediately so UI shows completion
        setSession({
          ...damisession,
        });
        
        try {
          // Save interview data even if user ended early - save whatever questions were answered
          // This ensures partial interview data is preserved with audio/video recordings
          if (damisession?.questions && damisession.questions.length > 0) {
            console.log(`💾 Saving interview data (${damisession.questions.length} question(s) answered)...`);
            
            if (jobData?.enableVideoRecording) {
              // Video recording mode
              if (videoBlobData?.blob && videoBlobData.blob.size > 0) {
                console.log("📤 Uploading video recording with interview data...");
                // Upload video and save interview details with video URL - await to ensure completion
                await uploadinterviewvideo(videoBlobData.blob, damisession);
              } else {
                console.warn("⚠️ No video blob captured, saving interview data without video");
                // No video was captured; still persist interview details without video link
                // This handles cases where recording failed but interview was completed
                await updateCandidateDetails(null, damisession, {});
              }
            } else {
              // Audio-only mode – no video upload/analysis
              console.log("🎤 Audio-only mode: Saving interview data...");
              await updateCandidateDetails(null, damisession, {});
            }
          } else {
            // No questions answered - still save empty interview record to mark as attempted
            console.log("⚠️ No questions answered, saving empty interview record");
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
          console.error("❌ Error saving interview data:", error);
          setErrorText("Failed to save interview data. Please contact support.");
        } finally {
          // Always set loading to false after saving completes (or fails)
          setIsLoading(false);
        }
      } else {
        console.error("❌ No session data available to save");
        setIsLoading(false);
      }
    },
    [session, stopListening, stopCamera, stopRecording, jobData, updateCandidateDetails]
  );

  // Always ask confirmation on refresh/close until process is completed
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isCompleted) {
        event.preventDefault();
        event.returnValue =
          "Your interview is not completed. If you refresh, you will need to give it again. Are you sure you want to leave?"; // required for Chrome/Edge/Firefox
        return "";
      }
    };

    if (!isCompleted) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isCompleted]);

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
          {session?.status !== "completed" && (
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              🎤 <strong>Smart Voice Detection!</strong> AI interview that
              understands when you're speaking. Answer questions naturally at
              your own pace.
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="max-w-2xl mx-auto">
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
          /* Pre-Interview Setup */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
              <div className="text-center mb-8">
                <div className="p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6 w-24 h-24 mx-auto flex items-center justify-center">
                  <Award className="w-12 h-12 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Ready for Your Smart {fetchQueData?.jobTitle ?? "Physics"}{" "}
                  Interview?
                </h2>
                <p className="text-gray-600 mb-6">
                  🎤 <strong>Intelligent Voice Detection!</strong> The system
                  understands when you're speaking. Answer questions naturally.
                  <br />
                  <br />
                  <strong>Speak at your own pace - no rushing needed!</strong>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-blue-800">
                      🎤 Smart Detection
                    </h3>
                    <p className="text-sm text-blue-600">
                      Natural conversation
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl ${
                      microphoneReady ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <Mic
                      className={`w-8 h-8 mx-auto mb-2 ${
                        microphoneReady ? "text-green-600" : "text-red-600"
                      }`}
                    />
                    <h3
                      className={`font-semibold ${
                        microphoneReady ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {microphoneReady ? "🎤 Mic Ready" : "Microphone Needed"}
                    </h3>
                    <p
                      className={`text-sm ${
                        microphoneReady ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {microphoneReady
                        ? "Voice detection ready"
                        : "Please allow access"}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${
                    jobData?.enableVideoRecording 
                      ? cameraError ? "bg-yellow-50" : "bg-purple-50"
                      : "bg-gray-50"
                  }`}>
                    <Camera className={`w-8 h-8 mx-auto mb-2 ${
                      jobData?.enableVideoRecording
                        ? cameraError ? "text-yellow-600" : "text-purple-600"
                        : "text-gray-400"
                    }`} />
                    <h3 className={`font-semibold ${
                      jobData?.enableVideoRecording
                        ? cameraError ? "text-yellow-800" : "text-purple-800"
                        : "text-gray-600"
                    }`}>
                      {jobData?.enableVideoRecording
                        ? cameraError ? "⚠️ Camera Issue" : "📹 Video "
                        : "🎧 Audio Only"}
                    </h3>
                    <p className={`text-sm ${
                      jobData?.enableVideoRecording
                        ? cameraError ? "text-yellow-600" : "text-purple-600"
                        : "text-gray-500"
                    }`}>
                      {jobData?.enableVideoRecording
                        ? cameraError ? "Check camera access" : "Camera recording enabled"
                        : "No camera recording"}
                    </p>
                  </div>
                </div>

                {/* Error Messages */}
                {(speechError || (jobData?.enableVideoRecording && cameraError) || !microphoneReady) && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <p className="font-medium mb-2">⚠️ Setup Required:</p>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {!speechSupported && (
                        <li>Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.</li>
                      )}
                      {speechError && <li>Speech Recognition: {speechError}</li>}
                      {!microphoneReady && (
                        <li>Microphone: Please allow microphone access and refresh the page.</li>
                      )}
                      {jobData?.enableVideoRecording && cameraError && (
                        <li>Camera: {cameraError} - Please allow camera access and refresh the page.</li>
                      )}
                      {jobData?.enableVideoRecording && !cameraError && !navigator.mediaDevices?.getUserMedia && (
                        <li>Camera: Your browser doesn't support camera access. Please use a modern browser (Chrome, Firefox, Edge, Safari).</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Test Recording Setup Button */}
                <div className="mb-6">
                  <button
                    onClick={async () => {
                      try {
                        // Test microphone
                        console.log("🧪 Testing microphone...");
                        const micStream = await navigator.mediaDevices.getUserMedia({ 
                          audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                          }
                        });
                        micStream.getTracks().forEach(track => track.stop());
                        setMicrophoneReady(true);
                        console.log("✅ Microphone ready");
                        
                        // Test camera if video recording is enabled
                        if (jobData?.enableVideoRecording) {
                          console.log("🧪 Testing camera...");
                          setShowTestResult(true);
                          await startCamera();
                          // Wait a bit for state to update, then check result
                          setTimeout(() => {
                            if (stream && !cameraError) {
                              alert("✅ All devices are working correctly!\n\nMicrophone: Ready ✓\nCamera: Ready ✓\n\nYou can now start the interview!");
                            } else if (cameraError) {
                              alert("⚠️ Device test partially successful:\n\n✅ Microphone: Ready ✓\n❌ Camera: " + cameraError + "\n\nPlease check the error message below and try again.");
                            } else {
                              alert("✅ Device test completed!\n\nMicrophone: Ready ✓\nCamera: Please check status below\n\nIf camera shows as ready, you can start the interview!");
                            }
                            setShowTestResult(false);
                          }, 800);
                        } else {
                          alert("✅ Microphone is working correctly!\n\nMicrophone: Ready ✓\n(No camera test - audio-only mode)\n\nYou can now start the interview!");
                        }
                      } catch (err: any) {
                        console.error("Device test failed:", err);
                        let errorMsg = "Device test failed:\n\n";
                        if (err.name === "NotAllowedError") {
                          errorMsg += "❌ Permission denied.\n\n";
                          errorMsg += "Please allow " + (jobData?.enableVideoRecording ? "microphone and camera" : "microphone") + " access in your browser settings.\n\n";
                          errorMsg += "Steps:\n";
                          errorMsg += "1. Click the lock/camera icon in your browser's address bar\n";
                          errorMsg += "2. Allow microphone" + (jobData?.enableVideoRecording ? " and camera" : "") + " permissions\n";
                          errorMsg += "3. Refresh this page";
                        } else if (err.name === "NotFoundError") {
                          errorMsg += "❌ No " + (err.message.includes("video") ? "camera" : "microphone") + " found.\n\n";
                          errorMsg += "Please connect a " + (err.message.includes("video") ? "camera" : "microphone") + " and try again.";
                        } else if (err.name === "NotReadableError") {
                          errorMsg += "❌ Device is already in use.\n\n";
                          errorMsg += "Please close other applications using your " + (err.message.includes("video") ? "camera" : "microphone") + " and try again.";
                        } else {
                          errorMsg += `❌ ${err.message || "Unknown error"}`;
                        }
                        alert(errorMsg);
                      }
                    }}
                    className="w-full px-6 py-3 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-xl border border-green-300 transition-all duration-200 mb-4 flex items-center justify-center gap-2"
                  >
                    <span>🧪</span>
                    <span>Test Recording Setup</span>
                  </button>
                </div>

                <button
                  onClick={startInterview}
                  disabled={
                    !speechSupported ||
                    !!speechError ||
                    !microphoneReady ||
                    (jobData?.enableVideoRecording && !!cameraError)
                  }
                  className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🎤 Start Interview
                </button>
              </div>
            </div>
          </div>
        ) : session?.status === "completed" ? (
          /* Interview Summary */
          <InterviewSummary
            session={session}
            isLoading={isLoading}
            errorText={errorText}
            candidateData={candidateData}
          />
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
                isProcessing={isAnalyzing || isProcessingResponse}
                isPlayingAudio={isGeneratingAudio || isPlaying}
                waitingForAnswer={waitingForAnswer}
                onEndInterview={endInterview}
                session={session as InterviewSession}
              />

              {/* Voice Activity Status */}
              {!isAnalyzing && !isPlaying && isListening && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    🎤 Voice Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Speaking:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hasFinishedSpeaking
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {hasFinishedSpeaking ? "🤐 No" : "🗣️ Yes"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Activity:</span>
                      <span className="text-sm font-medium">
                        {voiceActivity}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-200 ${
                          voiceActivity > 15 ? "bg-green-500" : "bg-gray-400"
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
                  totalQuestions={physicsQuestions.length}
                />
              )}

              <QuestionDisplay
                question={currentQuestion}
                isProcessing={isAnalyzing}
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
                          <p className="font-medium text-gray-800">
                            Your Answer:
                          </p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              response.score >= 8
                                ? "bg-green-100 text-green-800"
                                : response.score >= 6
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {response.score}/10
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">
                          {response.userAnswer}
                        </p>
                        <div className="border-t pt-3">
                          <p className="font-medium text-gray-800 mb-1">
                            🎤 AI Feedback:
                          </p>
                          <p className="text-gray-600 text-sm">
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
        )}
      </div>
    </div>
  );
};

export default InterviewInterface;
