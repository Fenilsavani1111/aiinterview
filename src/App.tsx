import axios from 'axios';
import React, { useEffect, useState } from 'react';
import './App.css';
import InterviewInterface from './components/InterviewInterface';
import NameEmailModal from './components/NameEmailModal';
import NoQuestionData from './components/NoQuestionData';
import { JobPost } from './types';

let staticFetchQueData = {
  message: 'Access granted successfully',
  jobId: 7,
  jobTitle: 'Tax Consultant',
  activeJoinUserCount: 0,
  questions: [
    {
      id: 145,
      question: 'Tell me about yourself.',
      type: 'behavioral',
      difficulty: 'easy',
      duration: 120,
      category: 'Introduction',
      createdAt: '2026-01-17T08:45:08.144Z',
      updatedAt: '2026-01-17T08:45:08.144Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 146,
      question:
        'Can you explain the key differences between Corporate Income Tax and Zakat in Saudi Arabia?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Tax Knowledge',
      createdAt: '2026-01-17T08:45:08.318Z',
      updatedAt: '2026-01-17T08:45:08.318Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 147,
      question:
        'Describe a situation where you had to resolve a complex tax compliance issue. What steps did you take?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 180,
      category: 'Problem Solving',
      createdAt: '2026-01-17T08:45:08.389Z',
      updatedAt: '2026-01-17T08:45:08.389Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 148,
      question:
        "How would you prioritize tasks when managing multiple clients' tax compliance deadlines?",
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Time Management',
      createdAt: '2026-01-17T08:45:08.469Z',
      updatedAt: '2026-01-17T08:45:08.469Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 149,
      question:
        'What are the common audit inquiries you have encountered in tax compliance, and how did you address them?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 150,
      category: 'Audit Management',
      createdAt: '2026-01-17T08:45:08.555Z',
      updatedAt: '2026-01-17T08:45:08.555Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 150,
      question: 'How do you stay updated with changes in the Saudi tax regime?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 90,
      category: 'Continuous Learning',
      createdAt: '2026-01-17T08:45:08.623Z',
      updatedAt: '2026-01-17T08:45:08.623Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 151,
      question:
        'Can you provide an example of a successful tax planning strategy you implemented for a client?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 180,
      category: 'Tax Planning',
      createdAt: '2026-01-17T08:45:08.688Z',
      updatedAt: '2026-01-17T08:45:08.688Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 152,
      question:
        'What challenges do you foresee in managing tax compliance for clients in Saudi Arabia?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Risk Assessment',
      createdAt: '2026-01-17T08:45:08.812Z',
      updatedAt: '2026-01-17T08:45:08.812Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
      options: ['Corporate Income Tax', 'Zakat'],
      rightAnswer: 'Corporate Income Tax',
    },
    {
      id: 153,
      question:
        'How would you handle a disagreement with a client regarding their tax obligations?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 150,
      category: 'Conflict Resolution',
      createdAt: '2026-01-17T08:45:08.888Z',
      updatedAt: '2026-01-17T08:45:08.888Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 154,
      question:
        "What steps would you take if you discovered a significant error in a client's tax return just before submission?",
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Ethical Decision Making',
      createdAt: '2026-01-17T08:45:08.974Z',
      updatedAt: '2026-01-17T08:45:08.974Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 155,
      question: 'How do you assess the effectiveness of your tax compliance processes?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Process Improvement',
      createdAt: '2026-01-17T08:45:09.053Z',
      updatedAt: '2026-01-17T08:45:09.053Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 156,
      question:
        'Can you describe a time when you had to explain complex tax regulations to a client who was unfamiliar with them?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Communication',
      createdAt: '2026-01-17T08:45:09.124Z',
      updatedAt: '2026-01-17T08:45:09.124Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 157,
      question:
        'How do you ensure that your communication with ZATCA is effective and professional?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Professional Communication',
      createdAt: '2026-01-17T08:45:09.219Z',
      updatedAt: '2026-01-17T08:45:09.219Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 158,
      question:
        'What strategies do you use to maintain clear communication with clients during the tax compliance process?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Client Management',
      createdAt: '2026-01-17T08:45:09.351Z',
      updatedAt: '2026-01-17T08:45:09.351Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 159,
      question: 'How would you handle a situation where a client is unhappy with your tax advice?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Conflict Management',
      createdAt: '2026-01-17T08:45:09.457Z',
      updatedAt: '2026-01-17T08:45:09.457Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 160,
      question:
        'Describe how you would prepare for a meeting with a new client regarding their tax situation.',
      type: 'communication',
      difficulty: 'medium',
      duration: 180,
      category: 'Preparation Skills',
      createdAt: '2026-01-17T08:45:09.547Z',
      updatedAt: '2026-01-17T08:45:09.547Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 161,
      question: 'How do you ensure that your written tax documentation is clear and comprehensive?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Documentation Skills',
      createdAt: '2026-01-17T08:45:09.642Z',
      updatedAt: '2026-01-17T08:45:09.642Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 162,
      question: 'What methods do you use to communicate tax changes to your clients effectively?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Client Updates',
      createdAt: '2026-01-17T08:45:09.747Z',
      updatedAt: '2026-01-17T08:45:09.747Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 163,
      question: 'How do you handle feedback from clients regarding your tax services?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Feedback Management',
      createdAt: '2026-01-17T08:45:09.824Z',
      updatedAt: '2026-01-17T08:45:09.824Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 164,
      question:
        'What is your approach to collaborating with other departments to ensure comprehensive tax compliance?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Interdepartmental Collaboration',
      createdAt: '2026-01-17T08:45:09.909Z',
      updatedAt: '2026-01-17T08:45:09.909Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 165,
      question:
        'How would you explain the importance of VAT compliance to a client who is skeptical about it?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Education',
      createdAt: '2026-01-17T08:45:09.990Z',
      updatedAt: '2026-01-17T08:45:09.990Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 166,
      question:
        'If a client reports a discrepancy in their VAT return, how would you approach the situation?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Tax Calculation',
      createdAt: '2026-01-17T08:45:10.070Z',
      updatedAt: '2026-01-17T08:45:10.070Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 167,
      question:
        'How would you calculate the total Zakat due for a client based on their financial statements?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 180,
      category: 'Zakat Calculation',
      createdAt: '2026-01-17T08:45:10.155Z',
      updatedAt: '2026-01-17T08:45:10.155Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 168,
      question:
        "What is the formula for calculating Withholding Tax, and how would you apply it to a client's payment?",
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Withholding Tax Calculation',
      createdAt: '2026-01-17T08:45:10.253Z',
      updatedAt: '2026-01-17T08:45:10.253Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 169,
      question:
        'If a client has a taxable income of 500,000 SR, what would be their Corporate Income Tax liability based on current rates?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Corporate Tax Calculation',
      createdAt: '2026-01-17T08:45:10.332Z',
      updatedAt: '2026-01-17T08:45:10.332Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 170,
      question:
        "How would you assess the impact of Excise Tax on a client's product pricing strategy?",
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Excise Tax Impact',
      createdAt: '2026-01-17T08:45:10.408Z',
      updatedAt: '2026-01-17T08:45:10.408Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 171,
      question:
        'What metrics do you use to evaluate the effectiveness of tax compliance strategies?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Performance Metrics',
      createdAt: '2026-01-17T08:45:10.488Z',
      updatedAt: '2026-01-17T08:45:10.488Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 172,
      question:
        'How do you calculate the total tax liability for a client with multiple income sources?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Tax Liability Calculation',
      createdAt: '2026-01-17T08:45:10.577Z',
      updatedAt: '2026-01-17T08:45:10.577Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 173,
      question:
        'If a client has a VAT-exempt product, how would you determine the implications for their overall tax strategy?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'VAT Strategy Assessment',
      createdAt: '2026-01-17T08:45:10.672Z',
      updatedAt: '2026-01-17T08:45:10.672Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 174,
      question:
        'How would you approach a situation where a client’s tax documentation is incomplete?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Documentation Management',
      createdAt: '2026-01-17T08:45:10.735Z',
      updatedAt: '2026-01-17T08:45:10.735Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 175,
      question:
        'What do you believe is the most important quality for a Tax Consultant to possess?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Personal Qualities',
      createdAt: '2026-01-17T08:45:10.836Z',
      updatedAt: '2026-01-17T08:45:10.836Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 176,
      question:
        'How do you ensure that your tax planning strategies align with a client’s overall business goals?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Strategic Alignment',
      createdAt: '2026-01-17T08:45:10.925Z',
      updatedAt: '2026-01-17T08:45:10.925Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 177,
      question:
        "Describe a time when you had to advocate for a client's tax position. What was the outcome?",
      type: 'subjective',
      difficulty: 'medium',
      duration: 180,
      category: 'Advocacy Skills',
      createdAt: '2026-01-17T08:45:11.013Z',
      updatedAt: '2026-01-17T08:45:11.013Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 178,
      question:
        'What ethical considerations do you take into account when advising clients on tax matters?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Ethical Standards',
      createdAt: '2026-01-17T08:45:11.090Z',
      updatedAt: '2026-01-17T08:45:11.090Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 179,
      question: 'How do you handle pressure when facing tight deadlines for tax compliance?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Stress Management',
      createdAt: '2026-01-17T08:45:11.187Z',
      updatedAt: '2026-01-17T08:45:11.187Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 180,
      question: 'What role do you believe technology plays in modern tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Technological Awareness',
      createdAt: '2026-01-17T08:45:11.273Z',
      updatedAt: '2026-01-17T08:45:11.273Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 181,
      question:
        'How do you approach continuous professional development in the field of tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Professional Growth',
      createdAt: '2026-01-17T08:45:11.346Z',
      updatedAt: '2026-01-17T08:45:11.346Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 182,
      question:
        'What is your experience with handling tax audits, and what strategies do you employ to prepare for them?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 180,
      category: 'Audit Experience',
      createdAt: '2026-01-17T08:45:11.453Z',
      updatedAt: '2026-01-17T08:45:11.453Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 183,
      question:
        'How do you ensure compliance with tax regulations while also maximizing client benefits?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Compliance and Benefits',
      createdAt: '2026-01-17T08:45:11.563Z',
      updatedAt: '2026-01-17T08:45:11.563Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 184,
      question: 'What do you consider the biggest challenge in the field of tax consulting today?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Industry Challenges',
      createdAt: '2026-01-17T08:45:11.641Z',
      updatedAt: '2026-01-17T08:45:11.641Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 185,
      question:
        'How do you approach building long-term relationships with clients in tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Relationship Management',
      createdAt: '2026-01-17T08:45:11.753Z',
      updatedAt: '2026-01-17T08:45:11.753Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
  ],
  candidateId: 109,
  candidateName: 'Surbhi Vasoya',
};
let staticJobData = {
  id: 7,
  jobTitle: 'Tax Consultant',
  company: 'TechInfo ',
  department: 'Tax Advisory',
  location: ['Saudi Arabia'],
  jobType: 'full-time',
  experienceLevel: 'mid',
  jobDescription:
    'We are seeking a knowledgeable and detail-oriented Tax Consultant to join our Tax Advisory team. \nThe ideal candidate will have hands-on experience with the Saudi tax regime, including Corporate Income Tax, Zakat, Withholding Tax, VAT, Excise Tax, and Customs duties. \nThe role requires managing tax compliance, audit inquiries, and effective communication with ZATCA. \nYou will also assist clients with tax planning, documentation, and advisory services to ensure regulatory compliance.',
  salaryMin: 12000,
  salaryMax: 18000,
  salaryCurrency: 'SR',
  status: 'active',
  createdBy: 'admin',
  shareableUrl: null,
  applicants: 5,
  interviews: 15,
  activeJoinUser: null,
  activeJoinUserCount: 0,
  enableVideoRecording: true,
  createdAt: '2025-09-06T10:34:17.692Z',
  updatedAt: '2026-01-17T08:32:06.433Z',
  requirements: [
    {
      id: 208,
      requirement:
        "Bachelor's degree in Accounting, Finance, or related field; CPA / CMA / ACCA is a plus",
      createdAt: '2026-01-17T08:45:07.864Z',
      updatedAt: '2026-01-17T08:45:07.864Z',
      jobPostId: 7,
    },
    {
      id: 209,
      requirement:
        'Minimum 3 years of experience in tax compliance or advisory, preferably in Saudi Arabia',
      createdAt: '2026-01-17T08:45:07.864Z',
      updatedAt: '2026-01-17T08:45:07.864Z',
      jobPostId: 7,
    },
    {
      id: 210,
      requirement: 'Strong knowledge of Saudi Tax regulations, Zakat, VAT, and Withholding Tax',
      createdAt: '2026-01-17T08:45:07.864Z',
      updatedAt: '2026-01-17T08:45:07.864Z',
      jobPostId: 7,
    },
  ],
  responsibilities: [
    {
      id: 288,
      responsibility: 'Manage tax compliance for clients',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
    {
      id: 289,
      responsibility: 'Handle audit inquiries related to tax matters',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
    {
      id: 290,
      responsibility: 'Communicate effectively with ZATCA',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
    {
      id: 291,
      responsibility: 'Assist clients with tax planning',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
    {
      id: 292,
      responsibility: 'Prepare and maintain tax documentation',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
    {
      id: 293,
      responsibility: 'Provide advisory services to ensure regulatory compliance',
      createdAt: '2026-01-17T08:45:07.964Z',
      updatedAt: '2026-01-17T08:45:07.964Z',
      jobPostId: 7,
    },
  ],
  skills: [
    {
      id: 96,
      skill: 'Tax compliance and advisory',
      createdAt: '2026-01-17T08:45:08.053Z',
      updatedAt: '2026-01-17T08:45:08.053Z',
      jobPostId: 7,
    },
    {
      id: 97,
      skill: 'Corporate Income Tax, Zakat, VAT, Withholding Tax knowledge',
      createdAt: '2026-01-17T08:45:08.053Z',
      updatedAt: '2026-01-17T08:45:08.053Z',
      jobPostId: 7,
    },
    {
      id: 98,
      skill: 'Audit management and documentation',
      createdAt: '2026-01-17T08:45:08.053Z',
      updatedAt: '2026-01-17T08:45:08.053Z',
      jobPostId: 7,
    },
  ],
  interviewQuestions: [
    {
      id: 145,
      question: 'Tell me about yourself.',
      type: 'behavioral',
      difficulty: 'easy',
      duration: 120,
      category: 'Introduction',
      createdAt: '2026-01-17T08:45:08.144Z',
      updatedAt: '2026-01-17T08:45:08.144Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 146,
      question:
        'Can you explain the key differences between Corporate Income Tax and Zakat in Saudi Arabia?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Tax Knowledge',
      createdAt: '2026-01-17T08:45:08.318Z',
      updatedAt: '2026-01-17T08:45:08.318Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 147,
      question:
        'Describe a situation where you had to resolve a complex tax compliance issue. What steps did you take?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 180,
      category: 'Problem Solving',
      createdAt: '2026-01-17T08:45:08.389Z',
      updatedAt: '2026-01-17T08:45:08.389Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 148,
      question:
        "How would you prioritize tasks when managing multiple clients' tax compliance deadlines?",
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Time Management',
      createdAt: '2026-01-17T08:45:08.469Z',
      updatedAt: '2026-01-17T08:45:08.469Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 149,
      question:
        'What are the common audit inquiries you have encountered in tax compliance, and how did you address them?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 150,
      category: 'Audit Management',
      createdAt: '2026-01-17T08:45:08.555Z',
      updatedAt: '2026-01-17T08:45:08.555Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 150,
      question: 'How do you stay updated with changes in the Saudi tax regime?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 90,
      category: 'Continuous Learning',
      createdAt: '2026-01-17T08:45:08.623Z',
      updatedAt: '2026-01-17T08:45:08.623Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 151,
      question:
        'Can you provide an example of a successful tax planning strategy you implemented for a client?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 180,
      category: 'Tax Planning',
      createdAt: '2026-01-17T08:45:08.688Z',
      updatedAt: '2026-01-17T08:45:08.688Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 152,
      question:
        'What challenges do you foresee in managing tax compliance for clients in Saudi Arabia?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Risk Assessment',
      createdAt: '2026-01-17T08:45:08.812Z',
      updatedAt: '2026-01-17T08:45:08.812Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 153,
      question:
        'How would you handle a disagreement with a client regarding their tax obligations?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 150,
      category: 'Conflict Resolution',
      createdAt: '2026-01-17T08:45:08.888Z',
      updatedAt: '2026-01-17T08:45:08.888Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 154,
      question:
        "What steps would you take if you discovered a significant error in a client's tax return just before submission?",
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Ethical Decision Making',
      createdAt: '2026-01-17T08:45:08.974Z',
      updatedAt: '2026-01-17T08:45:08.974Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 155,
      question: 'How do you assess the effectiveness of your tax compliance processes?',
      type: 'reasoning',
      difficulty: 'medium',
      duration: 120,
      category: 'Process Improvement',
      createdAt: '2026-01-17T08:45:09.053Z',
      updatedAt: '2026-01-17T08:45:09.053Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 156,
      question:
        'Can you describe a time when you had to explain complex tax regulations to a client who was unfamiliar with them?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Communication',
      createdAt: '2026-01-17T08:45:09.124Z',
      updatedAt: '2026-01-17T08:45:09.124Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 157,
      question:
        'How do you ensure that your communication with ZATCA is effective and professional?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Professional Communication',
      createdAt: '2026-01-17T08:45:09.219Z',
      updatedAt: '2026-01-17T08:45:09.219Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 158,
      question:
        'What strategies do you use to maintain clear communication with clients during the tax compliance process?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Client Management',
      createdAt: '2026-01-17T08:45:09.351Z',
      updatedAt: '2026-01-17T08:45:09.351Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 159,
      question: 'How would you handle a situation where a client is unhappy with your tax advice?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Conflict Management',
      createdAt: '2026-01-17T08:45:09.457Z',
      updatedAt: '2026-01-17T08:45:09.457Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 160,
      question:
        'Describe how you would prepare for a meeting with a new client regarding their tax situation.',
      type: 'communication',
      difficulty: 'medium',
      duration: 180,
      category: 'Preparation Skills',
      createdAt: '2026-01-17T08:45:09.547Z',
      updatedAt: '2026-01-17T08:45:09.547Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 161,
      question: 'How do you ensure that your written tax documentation is clear and comprehensive?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Documentation Skills',
      createdAt: '2026-01-17T08:45:09.642Z',
      updatedAt: '2026-01-17T08:45:09.642Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 162,
      question: 'What methods do you use to communicate tax changes to your clients effectively?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Client Updates',
      createdAt: '2026-01-17T08:45:09.747Z',
      updatedAt: '2026-01-17T08:45:09.747Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 163,
      question: 'How do you handle feedback from clients regarding your tax services?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Feedback Management',
      createdAt: '2026-01-17T08:45:09.824Z',
      updatedAt: '2026-01-17T08:45:09.824Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 164,
      question:
        'What is your approach to collaborating with other departments to ensure comprehensive tax compliance?',
      type: 'communication',
      difficulty: 'medium',
      duration: 120,
      category: 'Interdepartmental Collaboration',
      createdAt: '2026-01-17T08:45:09.909Z',
      updatedAt: '2026-01-17T08:45:09.909Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 165,
      question:
        'How would you explain the importance of VAT compliance to a client who is skeptical about it?',
      type: 'communication',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Education',
      createdAt: '2026-01-17T08:45:09.990Z',
      updatedAt: '2026-01-17T08:45:09.990Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 166,
      question:
        'If a client reports a discrepancy in their VAT return, how would you approach the situation?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Tax Calculation',
      createdAt: '2026-01-17T08:45:10.070Z',
      updatedAt: '2026-01-17T08:45:10.070Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 167,
      question:
        'How would you calculate the total Zakat due for a client based on their financial statements?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 180,
      category: 'Zakat Calculation',
      createdAt: '2026-01-17T08:45:10.155Z',
      updatedAt: '2026-01-17T08:45:10.155Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 168,
      question:
        "What is the formula for calculating Withholding Tax, and how would you apply it to a client's payment?",
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Withholding Tax Calculation',
      createdAt: '2026-01-17T08:45:10.253Z',
      updatedAt: '2026-01-17T08:45:10.253Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 169,
      question:
        'If a client has a taxable income of 500,000 SR, what would be their Corporate Income Tax liability based on current rates?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Corporate Tax Calculation',
      createdAt: '2026-01-17T08:45:10.332Z',
      updatedAt: '2026-01-17T08:45:10.332Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 170,
      question:
        "How would you assess the impact of Excise Tax on a client's product pricing strategy?",
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Excise Tax Impact',
      createdAt: '2026-01-17T08:45:10.408Z',
      updatedAt: '2026-01-17T08:45:10.408Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 171,
      question:
        'What metrics do you use to evaluate the effectiveness of tax compliance strategies?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 120,
      category: 'Performance Metrics',
      createdAt: '2026-01-17T08:45:10.488Z',
      updatedAt: '2026-01-17T08:45:10.488Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 172,
      question:
        'How do you calculate the total tax liability for a client with multiple income sources?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'Tax Liability Calculation',
      createdAt: '2026-01-17T08:45:10.577Z',
      updatedAt: '2026-01-17T08:45:10.577Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 173,
      question:
        'If a client has a VAT-exempt product, how would you determine the implications for their overall tax strategy?',
      type: 'arithmetic',
      difficulty: 'medium',
      duration: 150,
      category: 'VAT Strategy Assessment',
      createdAt: '2026-01-17T08:45:10.672Z',
      updatedAt: '2026-01-17T08:45:10.672Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 174,
      question:
        'How would you approach a situation where a client’s tax documentation is incomplete?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Documentation Management',
      createdAt: '2026-01-17T08:45:10.735Z',
      updatedAt: '2026-01-17T08:45:10.735Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 175,
      question:
        'What do you believe is the most important quality for a Tax Consultant to possess?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Personal Qualities',
      createdAt: '2026-01-17T08:45:10.836Z',
      updatedAt: '2026-01-17T08:45:10.836Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 176,
      question:
        'How do you ensure that your tax planning strategies align with a client’s overall business goals?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Strategic Alignment',
      createdAt: '2026-01-17T08:45:10.925Z',
      updatedAt: '2026-01-17T08:45:10.925Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 177,
      question:
        "Describe a time when you had to advocate for a client's tax position. What was the outcome?",
      type: 'subjective',
      difficulty: 'medium',
      duration: 180,
      category: 'Advocacy Skills',
      createdAt: '2026-01-17T08:45:11.013Z',
      updatedAt: '2026-01-17T08:45:11.013Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 178,
      question:
        'What ethical considerations do you take into account when advising clients on tax matters?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Ethical Standards',
      createdAt: '2026-01-17T08:45:11.090Z',
      updatedAt: '2026-01-17T08:45:11.090Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 179,
      question: 'How do you handle pressure when facing tight deadlines for tax compliance?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Stress Management',
      createdAt: '2026-01-17T08:45:11.187Z',
      updatedAt: '2026-01-17T08:45:11.187Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 180,
      question: 'What role do you believe technology plays in modern tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Technological Awareness',
      createdAt: '2026-01-17T08:45:11.273Z',
      updatedAt: '2026-01-17T08:45:11.273Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 181,
      question:
        'How do you approach continuous professional development in the field of tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Professional Growth',
      createdAt: '2026-01-17T08:45:11.346Z',
      updatedAt: '2026-01-17T08:45:11.346Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 182,
      question:
        'What is your experience with handling tax audits, and what strategies do you employ to prepare for them?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 180,
      category: 'Audit Experience',
      createdAt: '2026-01-17T08:45:11.453Z',
      updatedAt: '2026-01-17T08:45:11.453Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 183,
      question:
        'How do you ensure compliance with tax regulations while also maximizing client benefits?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Compliance and Benefits',
      createdAt: '2026-01-17T08:45:11.563Z',
      updatedAt: '2026-01-17T08:45:11.563Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 184,
      question: 'What do you consider the biggest challenge in the field of tax consulting today?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 120,
      category: 'Industry Challenges',
      createdAt: '2026-01-17T08:45:11.641Z',
      updatedAt: '2026-01-17T08:45:11.641Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
    {
      id: 185,
      question:
        'How do you approach building long-term relationships with clients in tax consulting?',
      type: 'subjective',
      difficulty: 'medium',
      duration: 150,
      category: 'Client Relationship Management',
      createdAt: '2026-01-17T08:45:11.753Z',
      updatedAt: '2026-01-17T08:45:11.753Z',
      jobPostId: 7,
      suggestedAnswerPoints: [],
    },
  ],
};

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState<any>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [jobData, setJobData] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');
  let ignore = false;

  const getdata = async (tokenValue: string | null) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/get-jobpost-by-token`,
        { token: tokenValue },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        if (response.data?.job) {
          setJobData(response.data?.job);
          document.title = response.data?.job?.jobTitle ?? 'AI Interview';
          setShowModal(true);
        }
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Error fetching job data:', error);
    }
  };

  useEffect(() => {
    if (!ignore) {
      const params = new URLSearchParams(window.location.search);
      let tokenFromUrl: string | null = params.get('token');

      if (tokenFromUrl) {
        setToken(tokenFromUrl);
        setLoading(true);
        getdata(tokenFromUrl);
      }
    }
    return () => {
      ignore = true;
    };
  }, []);

  const handleModalSubmit = async (
    name: string,
    email: string,
    resumeUrl: string,
    mobile: string,
    dob: string,
    highestQualification: string,
    educations: Array<{
      type: 'degree' | 'plusTwo' | 'tenth';
      stream?: string;
      percentage?: string;
      yearOfPassing?: string;
    }>,
    location: string,
    skills: string[],
    region: string,
    residenceLocation: string
  ) => {
    try {
      setIsModalLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/join-job-link`,
        {
          token: token,
          user: email,
          name: name,
          email: email,
          resumeUrl: resumeUrl,
          mobile: mobile,
          dob: dob,
          highestQualification: highestQualification,
          educations: educations,
          location: location,
          skills: skills,
          region: region,
          residenceLocation: residenceLocation,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        setShowModal(false);
        setFetchQueData(response.data);
        document.title = response.data?.jobTitle ?? 'AI Interview';

        if (response.data.questions && Array.isArray(response.data.questions)) {
          let dummyquestions = [...response.data.questions];
          dummyquestions = dummyquestions.sort((a, b) => a.id - b.id);
          setInterviewQuestions([...dummyquestions]);
          setCandidateId(response.data.candidateId);
        }
        setIsModalLoading(false);
      }
    } catch (error: any) {
      setIsModalLoading(false);
      setModalError(error?.response?.data?.error ?? null);
      console.error('Error joining job link:', error);
    }
  };

  return (
    <div>
      {loading ? (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100'>
          <div className='bg-white/95 backdrop-blur-sm p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-11/12 max-w-md border border-gray-200 text-center'>
            <div className='flex justify-center items-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600'></div>
              <span className='ml-3 text-indigo-600'>Loading job post...</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!jobData && <NoQuestionData />}
          {fetchQueData ? (
            interviewQuestions.length === 0 ? (
              <NoQuestionData />
            ) : (
              <InterviewInterface
                physicsQuestions={interviewQuestions}
                fetchQueData={fetchQueData}
                candidateId={candidateId}
                jobData={jobData}
              />
            )
          ) : (
            <NameEmailModal
              isOpen={showModal}
              onSubmitPopup={handleModalSubmit}
              isLoading={isModalLoading}
              modalError={modalError}
              jobData={jobData}
              token={token}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
