import React from "react";
import { Award, Clock, BarChart3, RefreshCw } from "lucide-react";
import { useCamera } from "../hooks/useCamera";
import { InterviewSession } from "./InterviewInterface";

interface InterviewSummaryProps {
  session: InterviewSession;
  onRestart: () => void;
  isLoading?: boolean;
}

export const getGrade = (score: number) => {
  if (score >= 9)
    return { grade: "A+", color: "text-green-600", bg: "bg-green-50" };
  if (score >= 8)
    return { grade: "A", color: "text-green-600", bg: "bg-green-50" };
  if (score >= 7)
    return { grade: "B+", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 6)
    return { grade: "B", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 5)
    return { grade: "C", color: "text-yellow-600", bg: "bg-yellow-50" };
  return { grade: "D", color: "text-red-600", bg: "bg-red-50" };
};

export const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  session,
  onRestart,
  isLoading,
}) => {
  const totalTime = session.endTime
    ? Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60
      )
    : 0;

  const averageScore =
    session.questions.length > 0
      ? Math.round(
          session.questions.reduce((sum, q) => sum + q.score, 0) /
            session.questions.length
        )
      : 0;

  const averageResponseTime =
    session.questions.length > 0
      ? Math.round(
          session.questions.reduce((sum, q) => sum + q.responseTime, 0) /
            session.questions.length
        )
      : 0;

  const gradeInfo = getGrade(averageScore);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
        <div className="text-center mb-8">
          <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 rounded-full mb-6 w-24 h-24 mx-auto flex items-center justify-center">
            <Award className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Interview Complete!
          </h2>
          <p className="text-gray-600 text-lg">
            Great job completing your interview. Here's your performance
            summary:
          </p>
        </div>
        {isLoading ? (
          <div className="mt-5">Loading....</div>
        ) : (
          <>
            {/* Overall Stats */}
            {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 rounded-2xl text-center ${gradeInfo.bg}`}>
                <Award className={`w-8 h-8 mx-auto mb-3 ${gradeInfo.color}`} />
                <div className={`text-3xl font-bold ${gradeInfo.color}`}>
                  {gradeInfo.grade}
                </div>
                <div className="text-sm text-gray-600">Overall Grade</div>
              </div>

              <div className="p-6 bg-blue-50 rounded-2xl text-center">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-blue-800">
                  {averageScore}/10
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>

              <div className="p-6 bg-purple-50 rounded-2xl text-center">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-800">
                  {totalTime}m
                </div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-2xl text-center">
                <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-indigo-800">
                  {averageResponseTime}s
                </div>
                <div className="text-sm text-gray-600">Avg Response</div>
              </div>
            </div> */}

            {/* Detailed Results */}
            {/* <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Question-by-Question Results
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {session.questions.map((response, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-800">
                        Question {index + 1}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Q: </span>
                        <span className="text-gray-600">
                          {response.question}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Your Answer:{" "}
                        </span>
                        <span className="text-gray-600">
                          {response.userAnswer}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Feedback:{" "}
                        </span>
                        <span className="text-gray-600">
                          {response.aiEvaluation}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Response time: {Math.round(response.responseTime)}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Actions */}
            {/* <div className="text-center">
              <button
                onClick={onRestart}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Take Another Interview
                </div>
              </button>
            </div> */}
          </>
        )}
      </div>
    </div>
  );
};
