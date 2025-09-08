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
      id: 49,
      question: "Can you explain the box model in CSS?",
      type: "technical",
      difficulty: "easy",
      expectedDuration: 120,
      category: "CSS",
      suggestedAnswers: [],
      isRequired: true,
      order: 49,
    },
    {
      id: 50,
      question: "What is the difference between '== ' and '===' in JavaScript?",
      type: "technical",
      difficulty: "medium",
      expectedDuration: 90,
      category: "JavaScript",
      suggestedAnswers: [],
      isRequired: true,
      order: 50,
    },
    {
      id: 51,
      question: "How do you ensure that your web applications are responsive?",
      type: "behavioral",
      difficulty: "medium",
      expectedDuration: 120,
      category: "Web Development",
      suggestedAnswers: [],
      isRequired: true,
      order: 51,
    },
    {
      id: 52,
      question:
        "What is your experience with version control systems like Git?",
      type: "technical",
      difficulty: "easy",
      expectedDuration: 90,
      category: "Version Control",
      suggestedAnswers: [],
      isRequired: true,
      order: 52,
    },
  ],
  candidateId: "28",
};

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState(Mockresponse);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([
    ...Mockresponse.questions,
  ]);
  const [candidateId, setCandidateId] = useState<string | null>(
    Mockresponse.candidateId
  );
  // const [fetchQueData, setFetchQueData] = useState(null);
  // const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  // const [candidateId, setCandidateId] = useState<string | null>(null);
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
          {/* {!jobData && <NoQuestionData />} */}
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
