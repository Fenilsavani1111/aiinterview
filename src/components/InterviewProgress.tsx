import React from "react";
import { Cross as Progress, Clock, Award } from "lucide-react";
import { InterviewSession } from "./InterviewInterface";

interface QuestionResponse {
  question: string;
  userAnswer: string;
  aiEvaluation: string;
  score: number;
  timestamp: Date;
  responseTime: number;
}

interface InterviewProgressProps {
  session: InterviewSession;
  totalQuestions: number;
}

export const InterviewProgress: React.FC<InterviewProgressProps> = ({
  session,
  totalQuestions,
}) => {
  const progressPercentage =
    (session.currentQuestionIndex / totalQuestions) * 100;
  const elapsedTime = Math.floor(
    (Date.now() - session.startTime.getTime()) / 1000 / 60
  );
  const averageScore =
    session.questions.length > 0
      ? Math.round(
          session.questions.reduce((sum, q) => sum + q.score, 0) /
            session.questions.length
        )
      : 0;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg text-white">
          <Progress className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          Interview Progress
        </h2>
      </div>

      <div className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {session.currentQuestionIndex} of {totalQuestions}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl text-center">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-800">
              {elapsedTime}
            </div>
            <div className="text-sm text-blue-600">Minutes Elapsed</div>
          </div>

          <div className="p-4 bg-green-50 rounded-xl text-center">
            <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-800">
              {averageScore}
            </div>
            <div className="text-sm text-green-600">Average Score</div>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl text-center">
            <Progress className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-800">
              {session.questions.length}
            </div>
            <div className="text-sm text-purple-600">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
