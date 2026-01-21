export interface JobPost {
  id?: string;
  jobTitle: string;
  company: string;
  department: string;
  location: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: string;
  jobDescription: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  questions: InterviewQuestion[];
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  candidates?: [];
  enableVideoRecording?: boolean;
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
  options?: string[];
  rightAnswer?: string | null;
  evaluationCriteria?: string[];
  isRequired: boolean;
  order: number;
}

type IDType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

export interface IdentityVerificationState {
  step: 1 | 2 | 3;
  idType: IDType | '';
  idNumber: string;
  idImageBase64: string | null;
  liveFaceBase64: string | null;
  verificationResult: null | {
    similarity: number;
    documentFaceConfidence: number;
    liveFaceConfidence: number;
    verified: boolean;
    message: string;
  };
}
