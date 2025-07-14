import axios from 'axios';
import React, { useEffect, useState } from 'react';
import './App.css';
import InterviewInterface from './components/InterviewInterface';
import NameEmailModal from './components/NameEmailModal';
import NoQuestionData from './components/NoQuestionData';




const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [fetchQueData, setFetchQueData] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("token")) {
      setShowModal(true);
    }
  }, []);
  const handleModalSubmit = async (name: string, email: string) => {

    try {
      const response = await axios.post(`${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/join-job-link`, {
        token: new URLSearchParams(window.location.search).get("token"),
        user: email
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
       if (response.data) {
         setShowModal(false);
         setFetchQueData(response.data)
         if (response.data.questions && Array.isArray(response.data.questions)) {
          const normalizedQuestions = response.data.questions.map((q: any) =>
            q.question
          );
          setInterviewQuestions(normalizedQuestions);
          setCurrentQuestion(normalizedQuestions[0]);
        }
        
       }
    } catch (error) {
      // Handle error (show error message, etc.)
      console.error('Error joining job link:', error);
    }
  };


  return (
    <div>
        <NameEmailModal isOpen={showModal} onSubmit={handleModalSubmit} />
        { interviewQuestions.length === 0 && !showModal &&  <NoQuestionData />}
       { interviewQuestions.length !== 0 && <InterviewInterface physicsQuestions={interviewQuestions} fetchQueData={fetchQueData} title="Physics Interview AI" />}
    </div>
  );
};

export default App;