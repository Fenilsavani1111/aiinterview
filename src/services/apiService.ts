import {
  InterviewQuestion,
  QuestionResponse,
} from "../components/InterviewInterface";
import { JobPost } from "../components/NameEmailModal";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface PhysicsEvaluation {
  score: number; // 0-10
  feedback: string;
  correctAnswer?: string;
}

export interface VoiceResponse {
  audioUrl: string;
  duration: number;
}

// Cache for TTS responses to avoid repeated API calls
const ttsCache = new Map<string, VoiceResponse>();

// Enhanced interview question processing with deep context awareness
export const processPhysicsQuestion = async (
  question: string,
  answer: string
): Promise<PhysicsEvaluation> => {
  try {
    console.log("🧠 Processing with deep context awareness via backend...");
    const response = await fetch(`${apiBaseUrl}/openai/process-question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, answer }),
    });

    if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
    }

    const evaluation = await response.json();
    console.log("🧠 Context-aware evaluation from backend:", evaluation);

    const score = evaluation?.score ?? 0;
    let feedback = evaluation.feedback || "Thank you for your answer!";

    // Additional context-based feedback refinement can still happen on the client
    const answerLower = answer.toLowerCase();

    if (
      answerLower.includes("don't know") ||
      answerLower.includes("not sure") ||
      answerLower.includes("no idea") ||
      answerLower.includes("i don't") ||
      answer.trim().length < 10
    ) {
      feedback = getEncouragingResponse();
    }
    else if (score >= 7 && answer.length > 50) {
      const positiveResponses = [
        "Excellent explanation!",
        "Great understanding!",
        "Perfect answer!",
        "Outstanding knowledge!",
        "Brilliant explanation!",
        "Superb understanding!",
      ];
      feedback =
        positiveResponses[
          Math.floor(Math.random() * positiveResponses.length)
        ];
    }
    else if (score < 4) {
      feedback = getSupportiveResponse();
    }

    return {
      score,
      feedback,
    };
  } catch (error) {
    console.log("Using supportive fallback due to API error:", error);

    const answerLower = answer.toLowerCase();
    if (answerLower.includes("don't know") || answer.trim().length < 10) {
      return {
        score: 1,
        feedback: getEncouragingResponse(),
      };
    }

    return {
      score: 5,
      feedback: "Thank you for participating!",
    };
  }
};

// Helper function for encouraging responses when students don't know
const getEncouragingResponse = (): string => {
  const responses = [
    "That's perfectly fine!",
    "No worries at all!",
    "That's okay, let's continue!",
    "Honesty is appreciated!",
    "No problem, moving on!",
    "That's alright, next question!",
    "All good, let's keep going!",
    "That's fine, continuing!",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// Helper function for supportive responses when students struggle
const getSupportiveResponse = (): string => {
  const responses = [
    "That's okay, this is tricky!",
    "No worries, tough question!",
    "That's fine, let's move on!",
    "Good effort, next question!",
    "That's alright, continuing!",
    "Nice try, moving forward!",
    "That's okay, let's continue!",
    "Good attempt, next one!",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// Enhanced TTS with better error handling and fallback to browser TTS
export const textToSpeech = async (
  text: string
): Promise<VoiceResponse | null> => {
  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  if (ttsCache.has(cacheKey)) {
    console.log("🚀 Using cached TTS response");
    return ttsCache.get(cacheKey)!;
  }

  const apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

  console.log("🔊 TTS Request:", {
    hasApiKey: !!apiKey,
    hasVoiceId: !!voiceId,
    textLength: text.length,
  });

  // Try ElevenLabs first if configured
  if (apiKey && voiceId) {
    try {
      console.log("🎵 Attempting ElevenLabs TTS...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.7,
              style: 0.1,
              use_speaker_boost: false,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Estimate duration based on text length and speaking rate
        const wordsCount = text.split(/\s+/).length;
        const duration = Math.max(2000, (wordsCount / 2.5) * 1000); // ~2.5 words per second

        const result = { audioUrl, duration };

        // Cache the result
        ttsCache.set(cacheKey, result);

        console.log("✅ ElevenLabs TTS generated successfully");
        return result;
      } else {
        const errorText = await response.text();
        console.warn("⚠️ ElevenLabs API error:", response.status, errorText);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn("⚠️ ElevenLabs TTS timeout");
      } else {
        console.warn("⚠️ ElevenLabs TTS error:", error.message);
      }
    }
  }

  // Fallback to browser Speech Synthesis API
  console.log("🔊 Falling back to browser TTS...");
  return await browserTextToSpeech(text, cacheKey);
};

// Browser TTS fallback using Speech Synthesis API
const browserTextToSpeech = async (
  text: string,
  cacheKey: string
): Promise<VoiceResponse | null> => {
  return new Promise((resolve) => {
    try {
      if (!("speechSynthesis" in window)) {
        console.log("❌ Browser TTS not supported");
        resolve(null);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice settings
      utterance.rate = 1.1; // Slightly faster for efficiency
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Try to use a good English voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("en") &&
            (voice.name.includes("Google") ||
              voice.name.includes("Microsoft") ||
              voice.name.includes("Alex"))
        ) || voices.find((voice) => voice.lang.startsWith("en"));

      if (englishVoice) {
        utterance.voice = englishVoice;
        console.log("🎤 Using voice:", englishVoice.name);
      }

      // Create a blob URL for the audio (simulated)
      const duration = Math.max(2000, (text.split(/\s+/).length / 2.5) * 1000);

      // For browser TTS, we create a special response that indicates browser speech
      const result: VoiceResponse = {
        audioUrl: "browser-tts://" + encodeURIComponent(text), // Special URL format
        duration: duration,
      };

      utterance.onstart = () => {
        console.log("🔊 Browser TTS started");
      };

      utterance.onend = () => {
        console.log("✅ Browser TTS completed");
      };

      utterance.onerror = (event) => {
        // Handle 'interrupted' error as success since it means TTS was initiated but superseded
        if (event.error === "interrupted") {
          console.log("🔄 Browser TTS interrupted (expected behavior)");
          // Cache the result since TTS was successfully initiated
          ttsCache.set(cacheKey, result);
          resolve(result);
        } else {
          console.error("❌ Browser TTS error:", event.error);
          resolve(null);
        }
      };

      // Cache the result
      ttsCache.set(cacheKey, result);

      // Start speaking
      window.speechSynthesis.speak(utterance);

      console.log("✅ Browser TTS initiated");
      resolve(result);
    } catch (error) {
      console.error("❌ Browser TTS setup error:", error);
      resolve(null);
    }
  });
};

// Preload common contextual TTS responses for instant playback
export const preloadCommonTTS = async () => {
  const apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

  // Only preload if ElevenLabs is configured, as browser TTS requires user interaction
  if (!apiKey || !voiceId) {
    console.log("🔊 Skipping TTS preloading - ElevenLabs not configured");
    return;
  }

  const contextualPhrases = [
    // Encouraging responses for students who don't know
    "That's perfectly fine!",
    "No worries at all!",
    "That's okay, let's continue!",
    "Honesty is appreciated!",
    "No problem, moving on!",

    // Supportive responses for struggling students
    "That's okay, this is tricky!",
    "No worries, tough question!",
    "Good effort, next question!",
    "Nice try, moving forward!",

    // Positive responses for good answers
    "Excellent explanation!",
    "Great understanding!",
    "Perfect answer!",
    "Outstanding knowledge!",
    "Brilliant explanation!",

    // Partial understanding responses
    "Good start, but remember the key concept!",
    "You're on the right track!",
    "Good detailed response!",
    "Thank you for your answer!",

    // Question transitions
    "Let's begin with your first question.",
    "Ready for the next question?",
    "Here's your next question.",
  ];

  console.log("🚀 Preloading contextual TTS responses with ElevenLabs...");

  // Preload in parallel with timeout - only using ElevenLabs API
  const preloadPromises = contextualPhrases.map(async (phrase) => {
    try {
      const cacheKey = phrase.toLowerCase().trim();
      if (ttsCache.has(cacheKey)) {
        return; // Already cached
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: phrase,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.7,
              style: 0.1,
              use_speaker_boost: false,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const wordsCount = phrase.split(/\s+/).length;
        const duration = Math.max(2000, (wordsCount / 2.5) * 1000);

        const result = { audioUrl, duration };
        ttsCache.set(cacheKey, result);

        console.log(
          "✅ Preloaded contextual phrase:",
          phrase.substring(0, 30) + "..."
        );
      }
    } catch (error) {
      // Silently fail for preloading
      console.log("⚠️ Preload failed for phrase, will generate on demand");
    }
  });

  await Promise.allSettled(preloadPromises);
  console.log("✅ Contextual TTS preloading complete");
};

// Get Data from resume pdf
export const getDataFromResumePdf = async (pdfText: string) => {
  try {
    const response = await fetch(`${apiBaseUrl}/openai/get-data-from-resume`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfText }),
    });
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    const evaluation = await response.json();
    let data:
      | {
          name: string;
          email: string;
          phone: string;
          experienceLevel: string;
          designation: string;
          location: string;
          skills: string[];
        }
      | undefined = evaluation?.job_data ?? {
      name: "",
      email: "",
      phone: "",
      experienceLevel: "",
      designation: "",
      location: "",
      skills: [],
    };
    return data;
  } catch (error) {
    console.log("error", error);
  }
};

// get overview skill breakdown with ai
export const getInterviewOverviewWithAI = async (
  interviewQuestions: InterviewQuestion[],
  candidateInterview: QuestionResponse[]
) => {
  try {
    const response = await fetch(`${apiBaseUrl}/openai/get-interview-overview`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewQuestions, candidateInterview }),
    });
    if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
    }
    const evaluation = await response.json();
    return evaluation;
  } catch (error) {
    console.log("error", error);
  }
};

// get behaviour analysis using local API endpoint
export const getBehaviouralAnalysis = async (
  video_url: string,
  questionsWithAnswer: any,
  jobData: any
) => {
  try {
    // Use local API endpoint - NO AUTHENTICATION REQUIRED for this endpoint
    const apiBaseUrl =
      import.meta.env.VITE_AIINTERVIEW_API_KEY ||
      "http://localhost:5000/api/jobposts";
    
    console.log("📹 Calling behavioral analysis API:", {
      endpoint: `${apiBaseUrl}/behavioral-analysis`,
      video_url: video_url ? video_url.substring(0, 50) + "..." : null,
      questionsCount: questionsWithAnswer?.length || 0,
    });

    const response = await fetch(`${apiBaseUrl}/behavioral-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // NO Authorization header - this endpoint is public
      },
      body: JSON.stringify({
        video_url: video_url,
        questionsWithAnswer: questionsWithAnswer,
        jobData: jobData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Behavioral analysis API error:",
        response.status,
        errorText
      );
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const res = await response.json();
    console.log("✅ Behavioral analysis response:", {
      status: res.status,
      hasPerformanceBreakdown: !!res.performanceBreakdown,
    });
    return res;
  } catch (error: any) {
    console.error("❌ Behavioral analysis error:", error);
    return {
      status: "error",
      error: error.message || "Failed to analyze interview",
      status_code: 500,
      video_url: video_url,
    };
  }
};

// get overview skill breakdown with ai
export const getCvMatchWithJD = async (
  jobdetails: JobPost,
  resumetext: string
) => {
  try {
    const response = await fetch(`${apiBaseUrl}/openai/get-cv-match-with-jd`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobdetails, resumetext }),
    });
    if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
    }
    const evaluation = await response.json();
    return evaluation;
  } catch (error) {
    console.log("error", error);
  }
};