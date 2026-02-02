import React, { useState } from 'react';
import {
  Award,
  TrendingUp,
  MessageSquare,
  Eye,
  XCircle,
  Brain,
  GraduationCap,
  Calendar,
  Star,
  Shield,
  Info,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { Candidate, InterviewSession, JobPost } from '../types';
import { motion } from 'framer-motion';

interface InterviewSummaryProps {
  session: InterviewSession;
  isLoading?: boolean;
  errorText?: string | null;
  candidateData: Candidate | null;
  jobData: JobPost | null;
  fetchQueData: { jobTitle?: string } | null;
}

export const getGrade = (score: number) => {
  if (score >= 9) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 8) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 7) return { grade: 'B+', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 6) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 5) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50' };
};

const camelToLabel = (str: string) => {
  return str
    .replace(/([A-Z])/g, ' $1') // insert space before capital letters
    .replace(/^./, (s) => s.toUpperCase()); // capitalize first letter
};

const getEducationTitle = (type: string) => {
  const typeMap: Record<string, string> = {
    tenth: '10th Standard / SSC',
    plusTwo: '12th Standard / HSC',
    degree: 'Bachelors Degree',
    pg: 'Post Graduate Degree',
    master: 'Masters Degree',
    phd: 'PhD / Doctorate',
  };
  return typeMap[type] || type;
};

export const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  session,
  isLoading,
  errorText,
  candidateData,
  jobData,
  fetchQueData,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getQuestionScoreColor = (score: number, type: string) => {
    if (type === 'communication' || type === 'behavioral') {
      if (score >= 8) return 'text-green-600 bg-green-100';
      if (score >= 6) return 'text-blue-600 bg-blue-100';
      if (score >= 4) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    }
    if (score >= 1) return 'text-green-600 bg-green-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    return 'C';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'excellent':
        return <TrendingUp className='h-4 w-4 text-green-600' />;
      case 'good':
        return <TrendingUp className='h-4 w-4 text-blue-600' />;
      case 'average':
        return <TrendingUp className='h-4 w-4 text-yellow-600' />;
      default:
        return <TrendingUp className='h-4 w-4 text-gray-600' />;
    }
  };

  return (
    <div className='max-w-5xl mx-auto'>
      <div className='bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8'>
        {errorText ? (
          <div className='mb-8 text-center'>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <div className='p-6 bg-gradient-to-br from-red-400 to-red-200 rounded-full mb-6 w-24 h-24 mx-auto flex items-center justify-center'>
                <XCircle className='w-12 h-12 text-red-600' />
              </div>
              <h2 className='text-center text-3xl font-bold text-gray-800 mb-4'>
                Assessment Incomplete
              </h2>
              <p className='text-gray-600'>{errorText}</p>
            </motion.div>
          </div>
        ) : (
          <div className='text-center mb-8'>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <div className='flex flex-col items-center justify-center gap-2 sm:gap-3 mb-3'>
                {jobData?.logoUrl ? (
                  <img
                    src={jobData.logoUrl}
                    alt=''
                    className='h-10 sm:h-12 object-contain'
                  />
                ) : (
                  <div className='p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl text-white'>
                    <Brain className='w-5 h-5 sm:w-8 sm:h-8' />
                  </div>
                )}
                <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
                  {fetchQueData?.jobTitle ?? 'Physics'} Assessment AI
                </h2>
              </div>
              <p className='text-gray-600 text-sm sm:text-base md:text-lg max-w-3xl mx-auto px-2'>
                <strong>Smart Voice Detection!</strong> AI Assessment that understands when you're
                speaking. Answer questions naturally at your own pace.
              </p>
              <p className='text-gray-600 text-center mt-3'>
                Your assessment has been successfully processed and saved.
              </p>
            </motion.div>
            <div className='grid lg:grid-cols-4 gap-8 items-center !mb-4'>
              <div className='lg:col-span-1'>
                <div className='text-center'>
                  <div className='bg-gray-200 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center'>
                    <span className='text-2xl font-bold text-gray-700'>
                      {candidateData?.name
                        ?.split(' ')
                        ?.map((n: string) => n[0])
                        ?.join('')}
                    </span>
                  </div>
                  <h2 className='text-xl font-bold text-gray-900 mb-1'>{candidateData?.name}</h2>
                  <p className='text-gray-600 mb-2'>{candidateData?.email}</p>
                  <p className='text-gray-600'>{candidateData?.mobile}</p>
                </div>
              </div>

              <div className='lg:col-span-3'>
                <div className='grid md:grid-cols-3 gap-6'>
                  {candidateData?.status === 'completed' && (
                    <>
                      <div className='text-center'>
                        <div
                          className={`text-4xl font-bold mb-2 ${getScoreColor(candidateData?.categoryPercentage?.overallPercentage ?? 0).split(' ')[0]
                            }`}
                        >
                          {candidateData?.categoryPercentage?.overallPercentage ?? 0}%
                        </div>
                        <div className='text-sm text-gray-600'>Overall Score</div>
                        <div
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getScoreColor(
                            candidateData?.categoryPercentage?.overallPercentage ?? 0
                          )}`}
                        >
                          Grade: {getScoreGrade(candidateData?.categoryPercentage?.overallPercentage ?? 0)}
                        </div>
                      </div>

                      <div className='text-center'>
                        <div className='text-4xl font-bold text-gray-900 mb-2'>
                          {candidateData?.duration}m
                        </div>
                        <div className='text-sm text-gray-600'>Assessment Duration</div>
                        {/* <div className="text-sm text-green-600 mt-2">
                      {MockcandidateData.comparisonData.percentileRank}th
                      percentile
                    </div> */}
                      </div>

                      <div className='text-center'>
                        <div className='text-4xl font-bold text-gray-900 mb-2'>
                          {candidateData?.attemptedQuestions}
                        </div>
                        <div className='text-sm text-gray-600'>Questions Answered</div>
                      </div>
                    </>
                  )}
                </div>

                {/* <div className="my-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Assessment Details
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Applied:{" "}
                          {moment(candidateData?.appliedDate).format(
                            "DD/MM/YYYY"
                          )}
                        </span>
                      </div>
                      {(candidateData?.status === "completed" || candidateData?.status === "under_review") && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Assessed:{" "}
                            {moment(candidateData?.interviewDate).format(
                              "DD/MM/YYYY"
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4" />
                        <span>
                          Status:{" "}
                          {candidateData?.status !== undefined
                            ? candidateData?.status.charAt(0).toUpperCase() +
                              candidateData?.status.slice(1)
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
            {candidateData?.status === 'completed' && (
              <>
                {/* Navigation Tabs */}
                <div className='bg-white rounded-xl shadow-sm mb-8'>
                  <div className='border-b border-gray-200'>
                    <nav className='flex space-x-8 px-6'>
                      {[
                        { id: 'overview', label: 'Overview', icon: Award },
                        {
                          id: 'responses',
                          label: 'Response Analysis',
                          icon: MessageSquare,
                        },
                        {
                          id: 'skills',
                          label: 'Skill Breakdown',
                          icon: TrendingUp,
                        },
                        {
                          id: 'behavioral',
                          label: 'Behavioral Analysis',
                          icon: Eye,
                        },
                        {
                          id: 'proctoring',
                          label: 'Proctoring Alerts',
                          icon: Shield,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                          <tab.icon className='h-4 w-4' />
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className='grid lg:grid-cols-3 gap-8'>
                    {/* Performance Scores */}
                    <div className='lg:col-span-2'>
                      <div className='bg-white rounded-xl shadow-sm p-6 mb-8'>
                        <h2 className='text-xl font-bold text-gray-900 mb-6'>
                          Performance Breakdown
                        </h2>
                        <div className='space-y-6'>
                          {[
                            {
                              label: 'Communication Skills',
                              score:
                                candidateData?.performanceBreakdown?.communicationSkills
                                  ?.overallAveragePercentage ?? 0,
                              icon: '💬',
                            },
                            {
                              label: 'Technical Knowledge',
                              score:
                                candidateData?.performanceBreakdown?.technicalKnowledge
                                  ?.overallAveragePercentage ?? 0,
                              icon: '🔧',
                            },
                            {
                              label: 'Body Language',
                              score:
                                candidateData?.performanceBreakdown?.body_language
                                  ?.overallAveragePercentage ?? 0,
                              icon: '👤',
                            },
                            {
                              label: 'Confidence Level',
                              score:
                                candidateData?.performanceBreakdown?.confidenceLevel
                                  ?.overallAveragePercentage ?? 0,
                              icon: '💪',
                            },
                            {
                              label: 'Professional Attire',
                              score:
                                candidateData?.performanceBreakdown?.culturalFit
                                  ?.overallAveragePercentage ?? 0,
                              icon: '👔',
                            },
                          ].map((item, index) => (
                            <div key={index}>
                              <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center space-x-3'>
                                  <span className='text-2xl'>{item.icon}</span>
                                  <span className='font-medium text-gray-900'>{item.label}</span>
                                </div>
                                <div className='flex items-center space-x-2'>
                                  <span className='font-bold text-gray-900'>{item.score}%</span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(
                                      item.score
                                    )}`}
                                  >
                                    {getScoreGrade(item.score)}
                                  </span>
                                </div>
                              </div>
                              <div className='w-full bg-gray-200 rounded-full h-3'>
                                <div
                                  className={`h-3 rounded-full transition-all duration-1000 ${item.score >= 90
                                    ? 'bg-green-500'
                                    : item.score >= 80
                                      ? 'bg-blue-500'
                                      : item.score >= 70
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                  style={{ width: `${item.score}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Feedback */}
                      <div className='bg-white rounded-xl shadow-sm p-6'>
                        <h2 className='text-xl font-bold text-gray-900 mb-6'>
                          AI Evaluation Summary
                        </h2>
                        <div className='bg-blue-50 p-6 rounded-xl mb-6'>
                          <p className='text-gray-700 leading-relaxed text-left'>
                            {candidateData?.aiEvaluationSummary?.summary}
                          </p>
                        </div>
                        <div className='grid md:grid-cols-2 gap-6'>
                          <div>
                            <h3 className='font-semibold text-green-800 mb-3 flex items-center space-x-2'>
                              <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                              <span>Key Strengths</span>
                            </h3>
                            <ul className='space-y-2'>
                              {candidateData?.aiEvaluationSummary?.keyStrengths?.map(
                                (strength, index) => (
                                  <li
                                    key={index}
                                    className='text-sm text-gray-700 flex items-start space-x-2'
                                  >
                                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0'></div>
                                    <span className='text-left'>{strength}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>

                          <div>
                            <h3 className='font-semibold text-blue-800 mb-3 flex items-center space-x-2'>
                              <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                              <span>Areas for Growth</span>
                            </h3>
                            <ul className='space-y-2'>
                              {candidateData?.aiEvaluationSummary?.areasOfGrowth?.map(
                                (improvement, index) => (
                                  <li
                                    key={index}
                                    className='text-sm text-gray-700 flex items-start space-x-2'
                                  >
                                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0'></div>
                                    <span className='text-left'>{improvement}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats, Recommendation & Education */}
                    <div className='space-y-6'>
                      <div className='bg-white rounded-xl shadow-sm p-6'>
                        <h3 className='font-semibold text-gray-900 mb-4'>Quick Stats</h3>
                        <div className='space-y-4'>
                          {candidateData?.quickStats &&
                            Object.keys(candidateData.quickStats).length > 0 ? (
                            Object.entries(candidateData.quickStats).map(([skill, data]: any) => (
                              <div key={skill} className='flex justify-between items-center'>
                                <span className='text-sm text-gray-600'>{camelToLabel(skill)}</span>
                                <span className='font-semibold text-green-600'>{data}</span>
                              </div>
                            ))
                          ) : (
                            <p className='text-sm text-gray-500'>No quick stats available</p>
                          )}
                        </div>
                      </div>

                      <div className='bg-white rounded-xl shadow-sm p-6'>
                        <h3 className='font-semibold text-gray-900 mb-4'>Recommendation</h3>
                        <div className='text-center'>
                          <div className='bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center'>
                            <Award className='h-8 w-8 text-green-600' />
                          </div>
                          <div className='text-lg font-bold text-green-800 mb-2'>
                            {candidateData?.recommendations?.recommendation ||
                              candidateData?.recommendation ||
                              'Strong Candidate'}
                          </div>
                          <p className='text-sm text-gray-600'>
                            {candidateData?.recommendations?.summary ||
                              'Candidate shows good potential and is recommended for further consideration.'}
                          </p>
                        </div>
                      </div>

                      {/* Education Section */}
                      <div className='bg-white rounded-xl shadow-sm p-6'>
                        <h3 className='font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
                          <div className='bg-blue-100 p-1.5 rounded-lg'>
                            <GraduationCap className='h-4 w-4 text-blue-600' />
                          </div>
                          <span>Education</span>
                        </h3>
                        <div className='space-y-3'>
                          {candidateData?.highestQualification && (
                            <div className='bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm'>
                              <div className='flex items-center space-x-2 mb-1'>
                                <Award className='h-4 w-4 text-blue-600' />
                                <div className='text-sm font-bold text-gray-900'>
                                  Highest Qualification
                                </div>
                              </div>
                              <div className='text-base font-semibold text-gray-800 ml-6'>
                                {candidateData.highestQualification}
                              </div>
                            </div>
                          )}

                          {candidateData?.educations && candidateData.educations.length > 0 && (
                            <div className='space-y-3'>
                              <div className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>
                                Education History
                              </div>
                              {candidateData.educations.map((edu, index) => (
                                <div
                                  key={index}
                                  className='bg-gray-50 p-4 rounded-xl border border-gray-200'
                                >
                                  <div className='flex items-start space-x-3'>
                                    <div className='bg-blue-100 p-2 rounded-lg flex-shrink-0'>
                                      <GraduationCap className='h-4 w-4 text-blue-600' />
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                      <div className='font-semibold text-gray-900 text-sm mb-1'>
                                        {getEducationTitle(edu.type)}
                                        {edu.stream && edu.stream.trim() && (
                                          <span className='text-gray-600 font-normal'>
                                            {' '}
                                            - {edu.stream}
                                          </span>
                                        )}
                                      </div>
                                      <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                                        {edu.yearOfPassing && edu.yearOfPassing.trim() && (
                                          <div className='flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md'>
                                            <Calendar className='h-3 w-3' />
                                            <span>Year: {edu.yearOfPassing}</span>
                                          </div>
                                        )}
                                        {edu.percentage && edu.percentage.toString().trim() && (
                                          <div className='flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium'>
                                            <Star className='h-3 w-3' />
                                            <span>
                                              {parseFloat(edu.percentage) > 10
                                                ? `${edu.percentage}%`
                                                : `${edu.percentage} CGPA`}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!candidateData?.highestQualification &&
                            (!candidateData?.educations ||
                              candidateData.educations.length === 0) && (
                              <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 text-center'>
                                <GraduationCap className='h-8 w-8 text-gray-300 mx-auto mb-2' />
                                <div className='text-sm text-gray-500'>
                                  No education details available
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'responses' && (
                  <div className='space-y-6'>
                    {session?.questions &&
                      session?.questions.map((response: any, index) => (
                        <div key={index} className='bg-white rounded-xl shadow-sm p-6'>
                          <div className='flex items-start justify-between mb-4'>
                            <div className='flex-1'>
                              <div className='flex items-center space-x-3 mb-2'>
                                <span className='bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium'>
                                  Question {index + 1}
                                </span>
                                <span className='text-sm text-gray-500'>
                                  {response?.responseTime?.toFixed(0)}s
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getQuestionScoreColor(
                                    response?.score,
                                    response?.Question.type
                                  )}`}
                                >
                                  {response?.Question.type === 'communication' || response?.Question.type === 'behavioral' ? `${response?.score} out of 10` : response?.score}
                                </span>
                              </div>
                              <h3 className='text-lg font-medium text-gray-900 mb-3 text-left'>
                                {response?.question}
                              </h3>
                            </div>
                          </div>

                          <div className='bg-gray-50 p-4 rounded-lg mb-4 text-left'>
                            <h4 className='font-medium text-gray-900 mb-2'>Candidate Response:</h4>
                            <p className='text-gray-700 leading-relaxed'>{response?.userAnswer}</p>
                          </div>

                          <div className='bg-blue-50 p-4 rounded-lg text-left'>
                            <h4 className='font-medium text-blue-900 mb-2'>AI Analysis:</h4>
                            <p className='text-blue-800 text-sm'>{response.aiEvaluation}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {activeTab === 'proctoring' && (
                  <div className='space-y-6'>
                    {/* Proctoring Overview */}
                    <div className='bg-white rounded-xl shadow-sm p-6'>
                      <div className='flex items-center space-x-3 mb-6'>
                        <div className='bg-blue-100 p-2 rounded-lg'>
                          <Shield className='h-5 w-5 text-blue-600' />
                        </div>
                        <h2 className='text-xl font-bold text-gray-900'>Proctoring Overview</h2>
                      </div>

                      <div className='grid md:grid-cols-3 gap-6 mb-2'>
                        <div className='bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <p className='text-sm text-blue-600 font-medium'>Status</p>
                              <p className='text-lg font-bold text-blue-900 capitalize'>
                                {candidateData?.proctoringStatus || 'N/A'}
                              </p>
                            </div>
                            <div className='bg-blue-100 p-2 rounded-lg'>
                              <Eye className='h-4 w-4 text-blue-600' />
                            </div>
                          </div>
                        </div>

                        <div className='bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-100'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <p className='text-sm text-amber-600 font-medium'>Total Alerts</p>
                              <p className='text-lg font-bold text-amber-900'>
                                {candidateData?.proctoringAlerts?.length || 0}
                              </p>
                            </div>
                            <div className='bg-amber-100 p-2 rounded-lg'>
                              <Bell className='h-4 w-4 text-amber-600' />
                            </div>
                          </div>
                        </div>

                        <div className='bg-gradient-to-br from-rose-50 to-red-50 p-4 rounded-lg border border-rose-100'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <p className='text-sm text-rose-600 font-medium'>Critical Alerts</p>
                              <p className='text-lg font-bold text-rose-900'>
                                {candidateData?.proctoringAlerts?.filter(
                                  (alert: any) => (alert.severity || 'info') === 'critical'
                                ).length || 0}
                              </p>
                            </div>
                            <div className='bg-rose-100 p-2 rounded-lg'>
                              <XCircle className='h-4 w-4 text-rose-600' />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proctoring Alerts List */}
                    <div className='bg-white rounded-xl shadow-sm p-6'>
                      <div className='flex items-center space-x-3 mb-4'>
                        <div className='bg-amber-100 p-2 rounded-lg'>
                          <Bell className='h-5 w-5 text-amber-600' />
                        </div>
                        <h2 className='text-xl font-bold text-gray-900'>Proctoring Alerts</h2>
                      </div>

                      {!candidateData?.proctoringAlerts ||
                        candidateData.proctoringAlerts.length === 0 ? (
                        <div className='bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center'>
                          <p className='text-sm font-medium text-gray-700'>No proctoring alerts</p>
                          <p className='text-xs text-gray-500 mt-1'>
                            You maintained a stable and compliant test environment.
                          </p>
                        </div>
                      ) : (
                        <div className='space-y-3'>
                          {candidateData.proctoringAlerts.map((alert: any, index: number) => {
                            const severity = alert.severity || 'info';
                            const severityStyles: Record<string, string> = {
                              info: 'bg-indigo-50 border-indigo-100',
                              warning: 'bg-amber-50 border-amber-100',
                              critical: 'bg-rose-50 border-rose-100',
                            };
                            const icon =
                              severity === 'critical'
                                ? XCircle
                                : severity === 'warning'
                                  ? AlertTriangle
                                  : Info;

                            return (
                              <div
                                key={index}
                                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left ${severityStyles[severity] || 'bg-gray-50 border-gray-100'
                                  }`}
                              >
                                <div className='mt-1'>
                                  {React.createElement(icon, {
                                    className:
                                      severity === 'critical'
                                        ? 'h-4 w-4 text-rose-600'
                                        : severity === 'warning'
                                          ? 'h-4 w-4 text-amber-600'
                                          : 'h-4 w-4 text-indigo-600',
                                  })}
                                </div>
                                <div className='flex-1 min-w-0'>
                                  <p className='text-sm font-medium text-gray-900'>
                                    {alert.type || 'Alert'}
                                  </p>
                                  <p className='text-xs text-gray-700 mt-0.5'>{alert.message}</p>
                                  {alert.timestamp && (
                                    <p className='text-[11px] text-gray-500 mt-0.5'>
                                      {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className=''>
                    <div className='bg-white rounded-xl shadow-sm p-6'>
                      <h2 className='text-xl font-bold text-gray-900 mb-6'>Skill Assessment</h2>
                      <div className='space-y-6'>
                        {Object.entries(candidateData?.performanceBreakdown).map(
                          ([skill, data]: any) => {
                            if (['culturalFit', 'behavior', 'body_language'].includes(skill))
                              return;
                            else
                              return (
                                <div key={skill}>
                                  <div className='flex items-center justify-between mb-2'>
                                    <div className='flex items-center space-x-2'>
                                      <span className='font-medium text-gray-900 capitalize'>
                                        {camelToLabel(skill)}
                                      </span>
                                      {getTrendIcon(skill)}
                                    </div>
                                    <span
                                      className={`font-bold ${getScoreColor(
                                        data.overallAveragePercentage
                                      )}`}
                                    >
                                      {data.overallAveragePercentage ?? 0}%
                                    </span>
                                  </div>
                                  <div className='w-full bg-gray-200 rounded-full h-2 mb-2'>
                                    <div
                                      className={`h-2 rounded-full ${data.overallAveragePercentage >= 90
                                        ? 'bg-green-500'
                                        : data.overallAveragePercentage >= 80
                                          ? 'bg-blue-500'
                                          : data.overallAveragePercentage >= 70
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}
                                      style={{
                                        width: `${data.overallAveragePercentage}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <p className='text-sm text-gray-600 text-left'>{data.summary}</p>
                                </div>
                              );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'behavioral' && (
                  <div className='grid lg:grid-cols-2 gap-8'>
                    <div className='bg-white rounded-xl shadow-sm p-6'>
                      <h2 className='text-xl font-bold text-gray-900 mb-6'>Behavioral Analysis</h2>
                      <div className='space-y-6'>
                        {renderAnalysis(
                          'Eye Contact',
                          candidateData?.behavioral_analysis?.eye_contact ?? 0
                        )}
                        {renderAnalysis(
                          'Posture',
                          candidateData?.behavioral_analysis?.posture ?? 0
                        )}
                        {renderAnalysis(
                          'Gestures',
                          candidateData?.behavioral_analysis?.gestures ?? 0
                        )}
                        {renderAnalysis(
                          'Face Expressions',
                          candidateData?.behavioral_analysis?.facial_expressions ?? 0
                        )}
                        {renderAnalysis(
                          'Voice Tone',
                          candidateData?.behavioral_analysis?.voice_tone ?? 0
                        )}
                        {renderAnalysis(
                          'Confidence',
                          candidateData?.behavioral_analysis?.confidence ?? 0
                        )}
                        {renderAnalysis(
                          'Engagement',
                          candidateData?.behavioral_analysis?.engagement ?? 0
                        )}
                      </div>
                    </div>

                    <div className='bg-white rounded-xl shadow-sm p-6'>
                      <h2 className='text-xl font-bold text-gray-900 mb-6'>
                        Video Analysis Insights
                      </h2>
                      <div className='space-y-4'>
                        <div className='bg-green-50 p-4 rounded-lg'>
                          <h3 className='font-medium text-green-800 mb-2'>Positive Indicators</h3>
                          <ul className='text-sm text-green-700 space-y-1 text-left'>
                            {candidateData?.video_analysis_insights?.positive_indicators
                              ?.slice(1)
                              ?.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                          </ul>
                        </div>

                        <div className='bg-blue-50 p-4 rounded-lg'>
                          <h3 className='font-medium text-blue-800 mb-2'>Areas for Improvement</h3>
                          <ul className='text-sm text-blue-700 space-y-1 text-left'>
                            {candidateData?.video_analysis_insights?.areas_for_improvement
                              ?.slice(1)
                              ?.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                          </ul>
                        </div>

                        <div className='bg-yellow-50 p-4 rounded-lg'>
                          <h3 className='font-medium text-yellow-800 mb-2'>Recommendations</h3>
                          <ul className='text-sm text-yellow-700 space-y-1 text-left'>
                            {candidateData?.video_analysis_insights?.recommendations?.map(
                              (item, i) => (
                                <li key={i}>• {item}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {isLoading ? <div className='mt-5'>Loading....</div> : <></>}
      </div>
    </div>
  );
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 bg-green-100';
  if (score >= 80) return 'text-blue-600 bg-blue-100';
  if (score >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const renderAnalysis = (title: string, score: number) => {
  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <span className='font-medium text-gray-900 capitalize'>{title}</span>
        <span className={`font-bold ${getScoreColor(score).split(' ')[0]}`}>{score}%</span>
      </div>
      <div className='w-full bg-gray-200 rounded-full h-2'>
        <div
          className={`h-2 rounded-full ${score >= 90
            ? 'bg-green-500'
            : score >= 80
              ? 'bg-blue-500'
              : score >= 70
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          style={{
            width: `${score}%`,
          }}
        ></div>
      </div>
    </div>
  );
};
