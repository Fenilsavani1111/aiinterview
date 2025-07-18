import axios from "axios";
import React, { useEffect, useState } from "react";
import "./App.css";
import InterviewInterface from "./components/InterviewInterface";
import NameEmailModal from "./components/NameEmailModal";
import NoQuestionData from "./components/NoQuestionData";

const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("token")) {
      setShowModal(true);
    }
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
        if (response.data.questions && Array.isArray(response.data.questions)) {
          setInterviewQuestions(response.data.questions);
          setCurrentQuestion(response.data.questions[0]);
        }
        setIsModalLoading(false);
      }
      // You can handle the response here (e.g., save data, show a message, etc.)
      console.log("Join job link response:", response.data);
    } catch (error: any) {
      setIsModalLoading(false);
      // Handle error (show error message, etc.)
      console.error("Error joining job link:", error);
    }
  };

  return (
    <div>
      <NameEmailModal
        isOpen={showModal}
        onSubmitPopup={handleModalSubmit}
        isLoading={isModalLoading}
      />
      {interviewQuestions.length === 0 && !showModal && <NoQuestionData />}
      {interviewQuestions.length !== 0 && (
        <InterviewInterface
          physicsQuestions={interviewQuestions}
          fetchQueData={fetchQueData}
          title="Physics Interview AI"
        />
      )}
    </div>
  );
};

export default App;
