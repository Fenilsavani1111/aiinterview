import OpenAI from "openai";
import {
  InterviewQuestion,
  QuestionResponse,
} from "../components/InterviewInterface";
import { JobPost } from "../components/NameEmailModal";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
    console.log("🧠 Processing with deep context awareness...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an intelligent interviewer that understands context and responds appropriately to different types of student answers.

CONTEXT ANALYSIS GUIDELINES:
1. ANALYZE the student's answer to understand their knowledge level:
   - Complete understanding: Shows clear grasp of concepts with correct explanations
   - Partial understanding: Has some correct ideas but missing key elements
   - Confused/struggling: Shows misconceptions or very limited understanding
   - No knowledge: Admits they don't know or gives completely wrong answer

2. RESPOND CONTEXTUALLY based on their understanding level:

   FOR STUDENTS WHO CLEARLY KNOW THE ANSWER (score 7-10):
   - Give encouraging feedback: "Excellent explanation!" "Great understanding!" "Perfect!"
   - Acknowledge specific correct points they made
   - Keep it positive and brief (8-15 words)

   FOR STUDENTS WITH PARTIAL KNOWLEDGE (score 4-6):
   - Be encouraging but gently corrective: "Good start, but remember [key point]"
   - "You're on the right track with [correct part]"
   - Provide a brief hint or clarification (15-20 words)

   FOR STRUGGLING STUDENTS (score 1-3):
   - Be very supportive: "That's okay, this is tricky!"
   - "No worries, let's move on to the next question"
   - Don't explain the answer, just be encouraging (8-12 words)

   FOR STUDENTS WHO ADMIT THEY DON'T KNOW (score 0-1):
   - Be extra supportive: "That's perfectly fine!"
   - "Honesty is good, let's continue!"
   - "No problem at all, next question!"

3. NEVER give long explanations or lectures
4. ALWAYS match your tone to their confidence level
5. Be a supportive interviewer, not a teacher

Respond in JSON format:
{"score": <0-10>, "feedback": "<contextually appropriate feedback>"}`,
        },
        {
          role: "user",
          content: `Question: ${question}\n\nStudent's Answer: "${answer}"

Please analyze this answer contextually and provide appropriate feedback based on the student's demonstrated understanding level.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const responseText =
      response.choices[0]?.message?.content ||
      '{"score": 5, "feedback": "Thank you for your answer!"}';
    console.log("🧠 Context-aware evaluation:", responseText);

    try {
      const evaluation = JSON.parse(responseText);
      const score = evaluation?.score ?? 0;
      let feedback = evaluation.feedback || "Thank you for your answer!";

      // Additional context-based feedback refinement
      const answerLower = answer.toLowerCase();

      // Detect if student admits they don't know
      if (
        answerLower.includes("don't know") ||
        answerLower.includes("not sure") ||
        answerLower.includes("no idea") ||
        answerLower.includes("i don't") ||
        answer.trim().length < 10
      ) {
        feedback = getEncouragingResponse();
      }
      // Detect if student is clearly confident and knowledgeable
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
      // Detect if student shows partial understanding
      else if (score >= 4 && score < 7) {
        // Keep the AI's contextual feedback for partial understanding
        feedback = evaluation.feedback;
      }
      // For very low scores, be supportive
      else if (score < 4) {
        feedback = getSupportiveResponse();
      }

      return {
        score,
        feedback,
      };
    } catch (parseError) {
      console.log("Using contextual fallback evaluation");

      // Analyze answer content for fallback response
      const answerLower = answer.toLowerCase();
      if (answerLower.includes("don't know") || answer.trim().length < 10) {
        return {
          score: 1,
          feedback: getEncouragingResponse(),
        };
      } else if (answer.length > 100) {
        return {
          score: 6,
          feedback: "Good detailed response!",
        };
      } else {
        return {
          score: 5,
          feedback: "Thank you for your answer!",
        };
      }
    }
  } catch (error) {
    console.log("Using supportive fallback due to API error");

    // Even in error cases, try to be contextual
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts structured data from resumes. Return the result only in pure JSON format without any explanation.",
        },
        {
          role: "user",
          content: `
Extract the following information from the resume text:
- Full Name
- Email Address
- Phone Number
- Experience Level (choose only one from: "entry", "junior", "mid", "senior", "lead")
- Current or Last Designation
- Location
- Technical or Domain Skills

Resume Text:
"""
${pdfText}
"""
Respond only in this JSON format:
{
  "job_data": {
    "name": "",
    "email": "",
    "phone": "",
    "experienceLevel": "",
    "designation": "",
    "location": "",
    "skills": []
  }
}
`,
        },
      ],
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    });
    let responseText = response.choices[0]?.message?.content ?? "";
    const evaluation = JSON.parse(responseText);
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that converts interview question data and candidate answers into a single dashboard-ready JSON object and short human summary. Follow these rules exactly:
1) Treat numeric 'score' as out of 10. Do NOT invent scores for missing answers.
2) For each category (communicationSkills, technicalKnowledge, confidenceLevel, problemSolving, leadershipPotential) compute and return:
   - answeredAveragePercentage: average of only answered questions *10, rounded to 1 decimal place (zero string if none answered)
   - overallAveragePercentage: average across all questions treating missing answers as 0, rounded to 1 decimal place (zero if zero questions)
   - summary: one-sentence description of performance for that category
3) Also return counts: answeredCount, totalQuestions.
4) Category mapping:
   - communicationSkills: type == 'behavioral'
   - technicalKnowledge: type == 'technical'
   - confidenceLevel: aggregate across all answered and all questions
5) Build quickStats using the percentage ranges but **return only the label** (Excellent, Good, Fair, Poor) without the numeric ranges. For example, if the percentage falls in 40-59.9%, the output should be "Fair" (do not include "40-59.9%" in the string).
6) Recommendation: one of {"Highly Recommended", "Recommended", "Consider with reservations", "Not Recommended"}, include a 'summary' field explaining reasoning. Weight: 60% Tech, 40% Communication.
7) Include meta.assumption: "Scores are out of 10. Missing answers are handled in two ways (answered-only averages and overall averages treating missing required answers as 0). calculationDate: ${new Date().toISOString()}"
8) Output JSON must include: meta, performanceBreakdown (with percentages and summary), quickStats, recommendations (with summary), aiEvaluationSummary.
9) aiEvaluationSummary must include: a 'summary' string, a 'keyStrengths' array, and an 'areasOfGrowth' array. Derive these from the computed category results; do not contradict the numbers.
10) Determinism: Be deterministic (temperature 0). Do not include anything except the single JSON object followed by a 2–6 line human summary.`
        },
        {
          role: "user",
          content: `Produce professional interview evaluation in JSON and short human summary for the following data. Use the rules in the system message exactly.

---
questions: [
${interviewQuestions.map(v =>
            `{
  "id": ${v.id},
  "question": ${JSON.stringify(v.question)},
  "type": ${JSON.stringify(v.type)},
  "difficulty": ${JSON.stringify(v.difficulty)},
  "expectedDuration": ${v.expectedDuration},
  "category": ${JSON.stringify(v.category)},
  "suggestedAnswers": [${v.suggestedAnswers?.map(s => JSON.stringify(s)).join(", ")}],
  "isRequired": ${v.isRequired},
  "order": ${v.order}
}`).join(",\n")}
]

candidateAnswers: [
${candidateInterview.map(v =>
              `{
  "question": ${JSON.stringify(v.question)},
  "userAnswer": ${JSON.stringify(v.userAnswer)},
  "aiEvaluation": ${JSON.stringify(v.aiEvaluation)},
  "score": ${v.score},
  "responseTime": ${v.responseTime}
}`).join(",\n")}
]
---`
        }
      ],
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    });
    let responseText = response.choices[0]?.message?.content ?? "";
    const evaluation = JSON.parse(responseText);
    return evaluation;
  } catch (error) {
    console.log("error", error);
  }
};

// get behaviour analysis using python api
export const getBehaviouralAnalysis = async (
  video_url: string
) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BEHAVIOUR_API}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: video_url })
    })
    let res = await response.json()
    return res
  } catch (error: any) {
    console.log("error", error);
    return (typeof error === "object" && error !== null && "message" in error) ? (error as any).message : String(error);
  }
};

// get overview skill breakdown with ai
export const getCvMatchWithJD = async (
  jobdetails: JobPost,
  resumetext: string
) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        // {
        //   role: "system",
        //   content: "You are a resume-to-job matching engine. Compare the resume against the job post and return a JSON object with match percentages."
        // },
        // {
        //   role: "user",
        //   content: `RESUME: ${resumetext}\n\nJOB POST: ${JSON.stringify(jobdetails)}`
        // }
        {
          role: "system",
          content: `You are a resume-to-job matching engine and a structured data extractor. 
1. First, extract structured data from the resume into JSON format. 
2. Then, compare the extracted resume data against the job post and return a JSON object with match percentages.
3. Always respond only in pure JSON without any explanation.`
        },
        {
          role: "user",
          content: `
RESUME TEXT:
"""
${resumetext}
"""

JOB POST:
${JSON.stringify(jobdetails)}

Respond only in this JSON format:
{
  "job_data": {
    "name": "",
    "email": "",
    "phone": "",
    "experienceLevel": "",
    "designation": "",
    "location": "",
    "skills": []
  },
  "match": {
    "overallMatchPercentage": 0,
    "skillsMatchPercentage": 0,
    "experienceMatchPercentage": 0,
    "educationMatchPercentage": 0,
    "locationMatchPercentage": 0
  }
}
`
        }
      ],
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    });
    let responseText = response.choices[0]?.message?.content ?? "";
    const evaluation = JSON.parse(responseText);
    return evaluation;
  } catch (error) {
    console.log("error", error);
  }
};