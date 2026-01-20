import React, { useState } from 'react'
import { Camera, Mic } from 'lucide-react';
import { JobPost } from '../types';

interface RequestPermissionProps {
    jobData: JobPost | null;
    setMicrophoneReady: (ready: boolean) => void;
    setPermissionsRequested: (ready: boolean) => void;
    startCamera: () => Promise<void>;
}

const RequestPermission: React.FC<RequestPermissionProps> = ({ jobData, setMicrophoneReady, setPermissionsRequested, startCamera }) => {
    const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

    // Request microphone and camera permissions
    const requestPermissions = async () => {
        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
            console.warn('getUserMedia is not supported in this environment.');
            alert(
                'Your browser does not support camera/microphone access. Please use Chrome, Edge, Firefox, or Safari.'
            );
            return;
        }

        // Only request if jobData is available
        if (!jobData) {
            return;
        }

        setIsRequestingPermissions(true);

        try {
            console.log(
                '🔔 Requesting device permissions (this will show browser pop-up)...'
            );

            // Request permissions based on video recording setting
            // This will show the native browser permission pop-up
            if (jobData.enableVideoRecording) {
                // Request both audio and video together - shows one pop-up for both
                // This triggers the native browser permission dialog
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 },
                        facingMode: 'user',
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100,
                    },
                });

                console.log('✅ Permissions granted by user');

                // Stop this temporary stream - startCamera will create its own
                mediaStream.getTracks().forEach((track) => track.stop());

                // Now start camera properly (will reuse granted permissions)
                // This keeps the camera stream active for the interview
                try {
                    await startCamera();
                    setMicrophoneReady(true);
                    setPermissionsRequested(true);
                    console.log('✅ Camera and microphone ready');
                } catch (cameraErr: any) {
                    console.error('❌ Camera setup failed:', cameraErr);
                    // Still set microphone ready if audio track was available
                    setMicrophoneReady(true);
                    setPermissionsRequested(true);
                }
            } else {
                // Audio-only mode - request microphone permission
                // This triggers the native browser permission dialog
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100,
                    },
                });

                console.log('✅ Microphone permission granted by user');
                setMicrophoneReady(true);
                setPermissionsRequested(true);

                // Stop the stream - we'll request it again when starting the interview
                audioStream.getTracks().forEach((track) => track.stop());
            }
        } catch (error: any) {
            console.error('❌ Permission request failed:', error);

            // Handle different error types
            if (error.name === 'NotAllowedError') {
                console.log('User denied permissions');
                setMicrophoneReady(false);
                alert(
                    '❌ Permission denied.\n\nPlease allow ' +
                    (jobData.enableVideoRecording
                        ? 'microphone and camera'
                        : 'microphone') +
                    " access in your browser settings and try again.\n\nSteps:\n1. Click the lock/camera icon in your browser's address bar\n2. Allow " +
                    (jobData.enableVideoRecording
                        ? 'microphone and camera'
                        : 'microphone') +
                    ' permissions\n3. Click "Request Permissions" again'
                );
            } else if (error.name === 'NotFoundError') {
                console.log('No devices found');
                setMicrophoneReady(false);
                alert(
                    '❌ No ' +
                    (error.message.includes('video') ? 'camera' : 'microphone') +
                    ' found.\n\nPlease connect a ' +
                    (error.message.includes('video') ? 'camera' : 'microphone') +
                    ' and try again.'
                );
            } else if (error.name === 'NotReadableError') {
                setMicrophoneReady(false);
                alert(
                    '❌ Device is already in use.\n\nPlease close other applications using your ' +
                    (error.message.includes('video') ? 'camera' : 'microphone') +
                    ' and try again.'
                );
            } else {
                console.log('Other error:', error.message);
                setMicrophoneReady(false);
                alert(
                    `❌ Error requesting permissions: ${error.message || 'Unknown error'}`
                );
            }
        } finally {
            setIsRequestingPermissions(false);
        }
    };

    return (
        <div className='max-w-2xl mx-auto'>
            <div className='bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8'>
                <div className='text-center'>
                    <div className='p-4 sm:p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto flex items-center justify-center'>
                        <Camera className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600' />
                    </div>
                    <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3'>
                        Device Permissions Required
                    </h2>
                    <p className='text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 px-2'>
                        To conduct the interview, we need access to your{' '}
                        {jobData?.enableVideoRecording
                            ? 'camera and microphone'
                            : 'microphone'}
                        . Click the button below to grant permissions.
                    </p>

                    <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl'>
                        <h3 className='font-semibold text-blue-800 mb-2 text-sm sm:text-base'>
                            Required Permissions:
                        </h3>
                        <ul className='text-left text-xs sm:text-sm text-blue-700 space-y-1'>
                            <li className='flex items-center gap-2'>
                                <Mic className='w-4 h-4' />
                                <span>Microphone - Required for voice responses</span>
                            </li>
                            {jobData?.enableVideoRecording && (
                                <li className='flex items-center gap-2'>
                                    <Camera className='w-4 h-4' />
                                    <span>Camera - Required for video recording</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    <button
                        onClick={requestPermissions}
                        // onClick={() => {
                        //   fetch(`${import.meta.env.VITE_PYTHON_API}/health`, {
                        //     method: 'GET',
                        //     headers: {
                        //       'content-type': 'application/json',
                        //     },
                        //   })
                        //     .then((res) => res.json())
                        //     .then((data) => {
                        //       console.log('-=-=-=--=---health=-=--=--=--=', data);
                        //     })
                        //     .catch((err) => {
                        //       console.log(err);
                        //     });
                        //   // fetch(
                        //   //   `${
                        //   //     import.meta.env.VITE_PYTHON_API
                        //   //   }/comprehensive-interview-analysis`,
                        //   //   {
                        //   //     headers: {
                        //   //       'content-type': 'application/json',
                        //   //     },
                        //   //     body: '{"video_url":"https://pseudoparalytic-madonna-swithly.ngrok-free.dev/uploads/blob-1757165397191-355742435.webm","questionsWithAnswer":[{"question":"How do you ensure that your communication with ZATCA is effective and professional?","userAnswer":"I don\'t know about this but you can skip this question","aiEvaluation":"No worries at all!","score":0,"endTime":26.858,"responseTime":26.858,"questionDetails":{"id":157,"question":"How do you ensure that your communication with ZATCA is effective and professional?","type":"communication","difficulty":"medium","duration":120,"category":"Professional Communication","createdAt":"2026-01-17T08:45:09.219Z","updatedAt":"2026-01-17T08:45:09.219Z","jobPostId":7,"suggestedAnswerPoints":[]}},{"question":"How would you handle a situation where a client is unhappy with your tax advice?","userAnswer":"again I don\'t know you can skip this also","aiEvaluation":"No worries at all!","score":0,"endTime":43.775999999999996,"responseTime":16.918,"questionDetails":{"id":159,"question":"How would you handle a situation where a client is unhappy with your tax advice?","type":"communication","difficulty":"medium","duration":150,"category":"Conflict Management","createdAt":"2026-01-17T08:45:09.457Z","updatedAt":"2026-01-17T08:45:09.457Z","jobPostId":7,"suggestedAnswerPoints":[]}},{"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","userAnswer":"I don\'t know about that I don\'t have any idea about tax","aiEvaluation":"No worries at all!","score":0,"endTime":69.431,"responseTime":25.655,"questionDetails":{"id":158,"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","type":"communication","difficulty":"medium","duration":120,"category":"Client Management","createdAt":"2026-01-17T08:45:09.351Z","updatedAt":"2026-01-17T08:45:09.351Z","jobPostId":7,"suggestedAnswerPoints":[]}}],"jobData":{"id":7,"jobTitle":"Tax Consultant","company":"TechInfo ","department":"Tax Advisory","location":["Saudi Arabia"],"jobType":"full-time","experienceLevel":"mid","jobDescription":"We are seeking a knowledgeable and detail-oriented Tax Consultant to join our Tax Advisory team. \\nThe ideal candidate will have hands-on experience with the Saudi tax regime, including Corporate Income Tax, Zakat, Withholding Tax, VAT, Excise Tax, and Customs duties. \\nThe role requires managing tax compliance, audit inquiries, and effective communication with ZATCA. \\nYou will also assist clients with tax planning, documentation, and advisory services to ensure regulatory compliance.","salaryMin":12000,"salaryMax":18000,"salaryCurrency":"SR","status":"active","createdBy":"admin","shareableUrl":null,"applicants":5,"interviews":16,"activeJoinUser":null,"activeJoinUserCount":0,"enableVideoRecording":true,"createdAt":"2025-09-06T10:34:17.692Z","updatedAt":"2026-01-17T10:10:55.222Z","requirements":[{"id":208,"requirement":"Bachelor\'s degree in Accounting, Finance, or related field; CPA / CMA / ACCA is a plus","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7},{"id":209,"requirement":"Minimum 3 years of experience in tax compliance or advisory, preferably in Saudi Arabia","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7},{"id":210,"requirement":"Strong knowledge of Saudi Tax regulations, Zakat, VAT, and Withholding Tax","createdAt":"2026-01-17T08:45:07.864Z","updatedAt":"2026-01-17T08:45:07.864Z","jobPostId":7}],"responsibilities":[{"id":288,"responsibility":"Manage tax compliance for clients","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":289,"responsibility":"Handle audit inquiries related to tax matters","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":290,"responsibility":"Communicate effectively with ZATCA","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":291,"responsibility":"Assist clients with tax planning","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":292,"responsibility":"Prepare and maintain tax documentation","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7},{"id":293,"responsibility":"Provide advisory services to ensure regulatory compliance","createdAt":"2026-01-17T08:45:07.964Z","updatedAt":"2026-01-17T08:45:07.964Z","jobPostId":7}],"skills":[{"id":96,"skill":"Tax compliance and advisory","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7},{"id":97,"skill":"Corporate Income Tax, Zakat, VAT, Withholding Tax knowledge","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7},{"id":98,"skill":"Audit management and documentation","createdAt":"2026-01-17T08:45:08.053Z","updatedAt":"2026-01-17T08:45:08.053Z","jobPostId":7}],"interviewQuestions":[{"id":145,"question":"Tell me about yourself.","type":"behavioral","difficulty":"easy","duration":120,"category":"Introduction","createdAt":"2026-01-17T08:45:08.144Z","updatedAt":"2026-01-17T08:45:08.144Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":146,"question":"Can you explain the key differences between Corporate Income Tax and Zakat in Saudi Arabia?","type":"reasoning","difficulty":"medium","duration":120,"category":"Tax Knowledge","createdAt":"2026-01-17T08:45:08.318Z","updatedAt":"2026-01-17T08:45:08.318Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":147,"question":"Describe a situation where you had to resolve a complex tax compliance issue. What steps did you take?","type":"reasoning","difficulty":"medium","duration":180,"category":"Problem Solving","createdAt":"2026-01-17T08:45:08.389Z","updatedAt":"2026-01-17T08:45:08.389Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":148,"question":"How would you prioritize tasks when managing multiple clients\' tax compliance deadlines?","type":"reasoning","difficulty":"medium","duration":120,"category":"Time Management","createdAt":"2026-01-17T08:45:08.469Z","updatedAt":"2026-01-17T08:45:08.469Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":149,"question":"What are the common audit inquiries you have encountered in tax compliance, and how did you address them?","type":"reasoning","difficulty":"medium","duration":150,"category":"Audit Management","createdAt":"2026-01-17T08:45:08.555Z","updatedAt":"2026-01-17T08:45:08.555Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":150,"question":"How do you stay updated with changes in the Saudi tax regime?","type":"reasoning","difficulty":"medium","duration":90,"category":"Continuous Learning","createdAt":"2026-01-17T08:45:08.623Z","updatedAt":"2026-01-17T08:45:08.623Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":151,"question":"Can you provide an example of a successful tax planning strategy you implemented for a client?","type":"reasoning","difficulty":"medium","duration":180,"category":"Tax Planning","createdAt":"2026-01-17T08:45:08.688Z","updatedAt":"2026-01-17T08:45:08.688Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":152,"question":"What challenges do you foresee in managing tax compliance for clients in Saudi Arabia?","type":"reasoning","difficulty":"medium","duration":120,"category":"Risk Assessment","createdAt":"2026-01-17T08:45:08.812Z","updatedAt":"2026-01-17T08:45:08.812Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":153,"question":"How would you handle a disagreement with a client regarding their tax obligations?","type":"reasoning","difficulty":"medium","duration":150,"category":"Conflict Resolution","createdAt":"2026-01-17T08:45:08.888Z","updatedAt":"2026-01-17T08:45:08.888Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":154,"question":"What steps would you take if you discovered a significant error in a client\'s tax return just before submission?","type":"reasoning","difficulty":"medium","duration":120,"category":"Ethical Decision Making","createdAt":"2026-01-17T08:45:08.974Z","updatedAt":"2026-01-17T08:45:08.974Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":155,"question":"How do you assess the effectiveness of your tax compliance processes?","type":"reasoning","difficulty":"medium","duration":120,"category":"Process Improvement","createdAt":"2026-01-17T08:45:09.053Z","updatedAt":"2026-01-17T08:45:09.053Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":156,"question":"Can you describe a time when you had to explain complex tax regulations to a client who was unfamiliar with them?","type":"communication","difficulty":"medium","duration":150,"category":"Client Communication","createdAt":"2026-01-17T08:45:09.124Z","updatedAt":"2026-01-17T08:45:09.124Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":157,"question":"How do you ensure that your communication with ZATCA is effective and professional?","type":"communication","difficulty":"medium","duration":120,"category":"Professional Communication","createdAt":"2026-01-17T08:45:09.219Z","updatedAt":"2026-01-17T08:45:09.219Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":158,"question":"What strategies do you use to maintain clear communication with clients during the tax compliance process?","type":"communication","difficulty":"medium","duration":120,"category":"Client Management","createdAt":"2026-01-17T08:45:09.351Z","updatedAt":"2026-01-17T08:45:09.351Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":159,"question":"How would you handle a situation where a client is unhappy with your tax advice?","type":"communication","difficulty":"medium","duration":150,"category":"Conflict Management","createdAt":"2026-01-17T08:45:09.457Z","updatedAt":"2026-01-17T08:45:09.457Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":160,"question":"Describe how you would prepare for a meeting with a new client regarding their tax situation.","type":"communication","difficulty":"medium","duration":180,"category":"Preparation Skills","createdAt":"2026-01-17T08:45:09.547Z","updatedAt":"2026-01-17T08:45:09.547Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":161,"question":"How do you ensure that your written tax documentation is clear and comprehensive?","type":"communication","difficulty":"medium","duration":120,"category":"Documentation Skills","createdAt":"2026-01-17T08:45:09.642Z","updatedAt":"2026-01-17T08:45:09.642Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":162,"question":"What methods do you use to communicate tax changes to your clients effectively?","type":"communication","difficulty":"medium","duration":120,"category":"Client Updates","createdAt":"2026-01-17T08:45:09.747Z","updatedAt":"2026-01-17T08:45:09.747Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":163,"question":"How do you handle feedback from clients regarding your tax services?","type":"communication","difficulty":"medium","duration":150,"category":"Feedback Management","createdAt":"2026-01-17T08:45:09.824Z","updatedAt":"2026-01-17T08:45:09.824Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":164,"question":"What is your approach to collaborating with other departments to ensure comprehensive tax compliance?","type":"communication","difficulty":"medium","duration":120,"category":"Interdepartmental Collaboration","createdAt":"2026-01-17T08:45:09.909Z","updatedAt":"2026-01-17T08:45:09.909Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":165,"question":"How would you explain the importance of VAT compliance to a client who is skeptical about it?","type":"communication","difficulty":"medium","duration":150,"category":"Client Education","createdAt":"2026-01-17T08:45:09.990Z","updatedAt":"2026-01-17T08:45:09.990Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":166,"question":"If a client reports a discrepancy in their VAT return, how would you approach the situation?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Tax Calculation","createdAt":"2026-01-17T08:45:10.070Z","updatedAt":"2026-01-17T08:45:10.070Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":167,"question":"How would you calculate the total Zakat due for a client based on their financial statements?","type":"arithmetic","difficulty":"medium","duration":180,"category":"Zakat Calculation","createdAt":"2026-01-17T08:45:10.155Z","updatedAt":"2026-01-17T08:45:10.155Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":168,"question":"What is the formula for calculating Withholding Tax, and how would you apply it to a client\'s payment?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Withholding Tax Calculation","createdAt":"2026-01-17T08:45:10.253Z","updatedAt":"2026-01-17T08:45:10.253Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":169,"question":"If a client has a taxable income of 500,000 SR, what would be their Corporate Income Tax liability based on current rates?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Corporate Tax Calculation","createdAt":"2026-01-17T08:45:10.332Z","updatedAt":"2026-01-17T08:45:10.332Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":170,"question":"How would you assess the impact of Excise Tax on a client\'s product pricing strategy?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Excise Tax Impact","createdAt":"2026-01-17T08:45:10.408Z","updatedAt":"2026-01-17T08:45:10.408Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":171,"question":"What metrics do you use to evaluate the effectiveness of tax compliance strategies?","type":"arithmetic","difficulty":"medium","duration":120,"category":"Performance Metrics","createdAt":"2026-01-17T08:45:10.488Z","updatedAt":"2026-01-17T08:45:10.488Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":172,"question":"How do you calculate the total tax liability for a client with multiple income sources?","type":"arithmetic","difficulty":"medium","duration":150,"category":"Tax Liability Calculation","createdAt":"2026-01-17T08:45:10.577Z","updatedAt":"2026-01-17T08:45:10.577Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":173,"question":"If a client has a VAT-exempt product, how would you determine the implications for their overall tax strategy?","type":"arithmetic","difficulty":"medium","duration":150,"category":"VAT Strategy Assessment","createdAt":"2026-01-17T08:45:10.672Z","updatedAt":"2026-01-17T08:45:10.672Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":174,"question":"How would you approach a situation where a client’s tax documentation is incomplete?","type":"subjective","difficulty":"medium","duration":150,"category":"Documentation Management","createdAt":"2026-01-17T08:45:10.735Z","updatedAt":"2026-01-17T08:45:10.735Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":175,"question":"What do you believe is the most important quality for a Tax Consultant to possess?","type":"subjective","difficulty":"medium","duration":120,"category":"Personal Qualities","createdAt":"2026-01-17T08:45:10.836Z","updatedAt":"2026-01-17T08:45:10.836Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":176,"question":"How do you ensure that your tax planning strategies align with a client’s overall business goals?","type":"subjective","difficulty":"medium","duration":150,"category":"Strategic Alignment","createdAt":"2026-01-17T08:45:10.925Z","updatedAt":"2026-01-17T08:45:10.925Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":177,"question":"Describe a time when you had to advocate for a client\'s tax position. What was the outcome?","type":"subjective","difficulty":"medium","duration":180,"category":"Advocacy Skills","createdAt":"2026-01-17T08:45:11.013Z","updatedAt":"2026-01-17T08:45:11.013Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":178,"question":"What ethical considerations do you take into account when advising clients on tax matters?","type":"subjective","difficulty":"medium","duration":150,"category":"Ethical Standards","createdAt":"2026-01-17T08:45:11.090Z","updatedAt":"2026-01-17T08:45:11.090Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":179,"question":"How do you handle pressure when facing tight deadlines for tax compliance?","type":"subjective","difficulty":"medium","duration":120,"category":"Stress Management","createdAt":"2026-01-17T08:45:11.187Z","updatedAt":"2026-01-17T08:45:11.187Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":180,"question":"What role do you believe technology plays in modern tax consulting?","type":"subjective","difficulty":"medium","duration":120,"category":"Technological Awareness","createdAt":"2026-01-17T08:45:11.273Z","updatedAt":"2026-01-17T08:45:11.273Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":181,"question":"How do you approach continuous professional development in the field of tax consulting?","type":"subjective","difficulty":"medium","duration":150,"category":"Professional Growth","createdAt":"2026-01-17T08:45:11.346Z","updatedAt":"2026-01-17T08:45:11.346Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":182,"question":"What is your experience with handling tax audits, and what strategies do you employ to prepare for them?","type":"subjective","difficulty":"medium","duration":180,"category":"Audit Experience","createdAt":"2026-01-17T08:45:11.453Z","updatedAt":"2026-01-17T08:45:11.453Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":183,"question":"How do you ensure compliance with tax regulations while also maximizing client benefits?","type":"subjective","difficulty":"medium","duration":150,"category":"Compliance and Benefits","createdAt":"2026-01-17T08:45:11.563Z","updatedAt":"2026-01-17T08:45:11.563Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":184,"question":"What do you consider the biggest challenge in the field of tax consulting today?","type":"subjective","difficulty":"medium","duration":120,"category":"Industry Challenges","createdAt":"2026-01-17T08:45:11.641Z","updatedAt":"2026-01-17T08:45:11.641Z","jobPostId":7,"suggestedAnswerPoints":[]},{"id":185,"question":"How do you approach building long-term relationships with clients in tax consulting?","type":"subjective","difficulty":"medium","duration":150,"category":"Client Relationship Management","createdAt":"2026-01-17T08:45:11.753Z","updatedAt":"2026-01-17T08:45:11.753Z","jobPostId":7,"suggestedAnswerPoints":[]}]}}',
                        //   //     method: 'POST',
                        //   //   }
                        //   // )
                        //   //   .then((res) => res.json())
                        //   //   .then((data) => {
                        //   //     console.log('-=-=-=--=---=-=--=--=--=', data);
                        //   //   })
                        //   //   .catch((err) => {
                        //   //     console.log(err);
                        //   //   });
                        // }}
                        disabled={isRequestingPermissions || !jobData}
                        className='w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2'
                    >
                        {isRequestingPermissions ? (
                            <>
                                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                                <span>Requesting Permissions...</span>
                            </>
                        ) : (
                            <>
                                <Camera className='w-5 h-5' />
                                <span>
                                    Request{' '}
                                    {jobData?.enableVideoRecording ? 'Camera & ' : ''}
                                    Microphone Permission
                                </span>
                            </>
                        )}
                    </button>

                    {!jobData && (
                        <p className='text-red-600 text-xs sm:text-sm mt-4'>
                            ⚠️ Job data is loading. Please wait...
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RequestPermission
