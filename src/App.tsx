import axios from "axios";
import React, { useEffect, useState } from "react";
import "./App.css";
import InterviewInterface from "./components/InterviewInterface";
import NameEmailModal, { JobPost } from "./components/NameEmailModal";
import NoQuestionData from "./components/NoQuestionData";

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [jobData, setJobData] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>("");
  let ignore = false;

  const getdata = async (tokenValue: string | null) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/get-jobpost-by-token`,
        { token: tokenValue },
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
    } catch (error: any) {
      setLoading(false);
      console.error("Error fetching job data:", error);
    }
  };

  useEffect(() => {
    if (!ignore) {
      const params = new URLSearchParams(window.location.search);
      let tokenFromUrl: string | null = params.get("token");
      
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
          token: token,
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
        document.title = response.data?.jobTitle ?? "AI Interview";
        
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
              token={token}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;