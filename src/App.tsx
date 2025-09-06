import axios from "axios";
import React, { useEffect, useState } from "react";
import "./App.css";
import InterviewInterface from "./components/InterviewInterface";
import NameEmailModal, { JobPost } from "./components/NameEmailModal";
import NoQuestionData from "./components/NoQuestionData";

let Mockresponse = {
  message: "User joined successfully",
  jobId: 3,
  jobTitle: "Junior Web Developer",
  activeJoinUserCount: 32,
  questions: [
    {
      id: 10,
      question: "Can you explain the box model in CSS?",
      type: "technical",
      difficulty: "easy",
      expectedDuration: 120,
      category: "CSS",
      suggestedAnswers: [
        "The box model consists of margins, borders, padding, and the actual content area.",
        "Margins are the outermost layer, followed by borders, padding, and then the content itself.",
      ],
      isRequired: true,
      order: 10,
    },
    {
      id: 11,
      question: "What is the difference between '== ' and '===' in JavaScript?",
      type: "technical",
      difficulty: "medium",
      expectedDuration: 90,
      category: "JavaScript",
      suggestedAnswers: [
        "'==' checks for value equality, while '===' checks for both value and type equality.",
        "'===' is generally preferred to avoid type coercion issues.",
      ],
      isRequired: true,
      order: 11,
    },
    {
      id: 12,
      question: "How do you ensure that your web applications are responsive?",
      type: "behavioral",
      difficulty: "medium",
      expectedDuration: 120,
      category: "Web Development",
      suggestedAnswers: [
        "Using CSS media queries to adjust styles based on screen size.",
        "Utilizing flexible grid layouts and responsive images.",
      ],
      isRequired: true,
      order: 12,
    },
    // {
    //   id: 13,
    //   question:
    //     "Can you describe a time when you had to troubleshoot a web application issue?",
    //   type: "behavioral",
    //   difficulty: "medium",
    //   expectedDuration: 180,
    //   category: "Troubleshooting",
    //   suggestedAnswers: [
    //     "I encountered a bug that caused a page to not load properly, and I used the browser's developer tools to identify the issue.",
    //     "I resolved a compatibility issue by testing the application on different browsers and applying necessary fixes.",
    //   ],
    //   isRequired: true,
    //   order: 13,
    // },
    // {
    //   id: 14,
    //   question:
    //     "What is your experience with version control systems like Git?",
    //   type: "technical",
    //   difficulty: "easy",
    //   expectedDuration: 90,
    //   category: "Version Control",
    //   suggestedAnswers: [
    //     "I have used Git for version control in my projects, including branching and merging.",
    //     "I understand how to commit changes and resolve merge conflicts.",
    //   ],
    //   isRequired: true,
    //   order: 14,
    // },
    // {
    //   id: 15,
    //   question:
    //     "How do you stay updated with the latest web development trends and technologies?",
    //   type: "behavioral",
    //   difficulty: "easy",
    //   expectedDuration: 120,
    //   category: "Professional Development",
    //   suggestedAnswers: [
    //     "I follow web development blogs and forums.",
    //     "I participate in online courses and webinars.",
    //   ],
    //   isRequired: true,
    //   order: 15,
    // },
    // {
    //   id: 16,
    //   question: "What role does accessibility play in web development?",
    //   type: "technical",
    //   difficulty: "medium",
    //   expectedDuration: 120,
    //   category: "Web Development",
    //   suggestedAnswers: [
    //     "Accessibility ensures that web applications are usable by people with disabilities.",
    //     "I implement ARIA roles and ensure proper semantic HTML.",
    //   ],
    //   isRequired: true,
    //   order: 16,
    // },
  ],
  candidateId: "19",
};

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  // const [fetchQueData, setFetchQueData] = useState(Mockresponse);
  // const [interviewQuestions, setInterviewQuestions] = useState<any[]>([
  //   ...Mockresponse.questions,
  // ]);
  // const [candidateId, setCandidateId] = useState<string | null>(
  //   Mockresponse.candidateId
  // );
  const [fetchQueData, setFetchQueData] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [jobData, setJobData] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(false);
  let ignore = false;

  const getdata = async (token: string | null) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${
          import.meta.env.VITE_AIINTERVIEW_API_KEY
        }/jobposts/get-jobpost-by-token`,
        { token: token },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data) {
        if (response.data?.job) {
          setJobData(response.data?.job);
          document.title = response.data?.job?.jobTitle ?? "AI Interview";
          setShowModal(true);
        }
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  useEffect(() => {
    if (!ignore) {
      const params = new URLSearchParams(window.location.search);
      let token: string | null = params.get("token");
      if (token) {
        setLoading(true);
        getdata(token);
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
    experienceLevel: string,
    designation: string,
    location: string,
    skills: string[]
  ) => {
    try {
      setIsModalLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/join-job-link`,
        {
          token: new URLSearchParams(window.location.search).get("token"),
          user: email,
          name: name,
          email: email,
          resumeUrl: resumeUrl,
          mobile: mobile,
          experienceLevel: experienceLevel,
          designation: designation,
          location: location,
          skills: skills,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data) {
        setShowModal(false);
        setFetchQueData(response.data);
        document.title = response.data?.jobTitle ?? "AI Interview"; // Set page title
        if (response.data.questions && Array.isArray(response.data.questions)) {
          let dummyquestions = [...response.data.questions];
          dummyquestions = dummyquestions.sort((a, b) => a.id - b.id);
          setInterviewQuestions([...dummyquestions]);
          setCandidateId(response.data.candidateId);
        }
        setIsModalLoading(false);
      }
      // You can handle the response here (e.g., save data, show a message, etc.)
      console.log("Join job link response:", response.data);
    } catch (error: any) {
      setIsModalLoading(false);
      setModalError(error?.response?.data?.error ?? null);
      // Handle error (show error message, etc.)
      console.error("Error joining job link:", error);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-11/12 max-w-md border border-gray-700 text-center">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading job post...</span>
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
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
