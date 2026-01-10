import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Brain, Camera, Plus, Trash2, Upload, AlertCircle, XCircle } from "lucide-react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { getCvMatchWithJD, getDataFromResumePdf } from "../services/apiService";
import { InterviewQuestion } from "./InterviewInterface";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  modalError: string | null;
  onSubmitPopup: (
    name: string,
    email: string,
    resumeUrl: string,
    mobile: string,
    experienceLevel: string,
    designation: string,
    location: string,
    skills: string[]
  ) => void;
  jobData: JobPost | null;
  token?: string;
}

export interface JobPost {
  id?: string;
  jobTitle: string;
  company: string;
  department: string;
  location: string;
  jobType: "full-time" | "part-time" | "contract" | "internship";
  experienceLevel: string;
  jobDescription: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  questions: InterviewQuestion[];
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  candidates?: [];
}

const NameEmailModal: React.FC<Props> = ({
  isOpen,
  onSubmitPopup,
  isLoading,
  modalError,
  jobData,
  token: tokenProp,
}) => {
  const [readyForInterview, setReadyForInterview] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [cvMatch, setCvMatch] = useState<number>(-1);
  
  // Email verification states
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [actualToken, setActualToken] = useState<string>("");

  // Extract token from URL or use prop
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const finalToken = tokenProp || tokenFromUrl || '';
    setActualToken(finalToken);
  }, [tokenProp]);

  // Validation schema
  const {
    values,
    touched,
    errors,
    handleChange,
    setFieldValue,
    setValues,
    handleSubmit,
    setFieldError,
  } = useFormik({
    initialValues: {
      name: "",
      email: "",
      resumeUrl: "",
      mobile: "",
      experienceLevel: "",
      designation: "",
      location: "",
      skills: [""],
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      resumeUrl: Yup.string().required("Resume is required"),
      mobile: Yup.string().required("Mobile is required"),
      experienceLevel: Yup.string().required("Experience Level is required"),
      designation: Yup.string().required("Designation is required"),
      location: Yup.string().required("Location is required"),
      skills: Yup.array().of(Yup.string()),
    }),
    onSubmit: async (formValues) => {
      if (!actualToken) {
        setEmailVerificationError("Interview link token is missing. Please use the link from your email.");
        return;
      }

      // Verify email before submission
      const isAuthorized = await verifyEmailAccess(formValues.email);
      
      if (!isAuthorized) {
        return;
      }
      
      // If authorized, proceed with submission
      onSubmitPopup(
        formValues.name,
        formValues.email,
        formValues.resumeUrl,
        formValues.mobile,
        formValues.experienceLevel,
        formValues.designation,
        formValues.location,
        formValues.skills
      );
    },
  });

  /**
   * Verify email access against candidate list
   */
  const verifyEmailAccess = async (email: string): Promise<boolean> => {
    if (!email) {
      setEmailVerificationError("Please enter your email address");
      return false;
    }

    if (!actualToken) {
      setEmailVerificationError("Interview link token is missing. Please use the link from your email.");
      return false;
    }

    try {
      setIsVerifyingEmail(true);
      setEmailVerificationError(null);

      const response = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/verify-email-for-interview`,
        {
          token: actualToken,
          email: email.toLowerCase().trim(),
        }
      );

      if (response.data.success) {
        setIsEmailVerified(true);
        setEmailVerificationError(null);
        setShowAccessDenied(false);
        return true;
      } else {
        setIsEmailVerified(false);
        setEmailVerificationError(
          response.data.error || "Email verification failed"
        );
        setShowAccessDenied(true);
        return false;
      }
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message ||
        "Unable to verify email. Please try again.";
      
      setIsEmailVerified(false);
      setEmailVerificationError(errorMessage);
      setShowAccessDenied(true);
      return false;
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const uploadResumeFile = async (file: any) => {
    try {
      setIsResumeUploading(true);
      
      if (jobData) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", `${values.name || 'resume'}`);
        
        const res = await axios.post(
          `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-resume`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        
        if (res.data) {
          if (res.data?.file_url?.length > 0) {
            setFieldValue("resumeUrl", res?.data?.file_url);
            setCvMatch(60);
          }
          setIsResumeUploading(false);
        }
      }
    } catch (error) {
      console.error("Resume upload error:", error);
      setIsResumeUploading(false);
    }
  };

  if (!isOpen) return null;

  // Access Denied Modal
  if (showAccessDenied) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50 p-4">
        <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-red-700">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Access Denied
            </h2>
            
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 w-full">
              <p className="text-red-300 text-sm leading-relaxed">
                {emailVerificationError || 
                  "Your email is not authorized for this interview."}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-6 w-full">
              <p className="text-gray-300 text-sm break-all">
                <strong className="text-white">Email entered:</strong>
                <br />
                {values.email || "No email provided"}
              </p>
            </div>

            <button
              onClick={() => {
                setShowAccessDenied(false);
                setEmailVerificationError(null);
                setFieldValue("email", "");
                setIsEmailVerified(false);
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-opacity-95 p-4">
      {readyForInterview ? (
        <>
          {cvMatch >= 0 && cvMatch < 60 ? (
            <div className="fixed inset-0 flex overflow-y-auto flex-grow items-center justify-center bg-gray-900 z-50">
              <div className="max-h-[90vh] w-full max-w-md p-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full border border-gray-700 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Unfortunately, you are not eligible for the{" "}
                      {jobData?.jobTitle} interview at this time.
                    </h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Your resume matches only {cvMatch ?? 40}% of the job
                      requirements at this time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="w-full max-w-md text-center my-10">
            <form onSubmit={handleSubmit}>
              <div className="p-6 sm:p-8 bg-gray-900 rounded-2xl shadow-sm shadow-gray-700 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center tracking-wide mb-6">
                  Enter Your Details
                </h2>

                {/* Token Missing Warning */}
                {!actualToken && (
                  <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-300">
                      Interview link token is missing. Please use the link from your email.
                    </p>
                  </div>
                )}

                {/* Email Verification Error */}
                {emailVerificationError && !showAccessDenied && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{emailVerificationError}</p>
                  </div>
                )}

                {/* Email Verified Success */}
                {isEmailVerified && (
                  <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-300">
                      ✓ Email verified successfully! You are authorized for this interview.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                  <input
                    className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base"
                    type="text"
                    placeholder="Name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                  />
                  
                  <div className="relative">
                    <input
                      className={`border ${
                        isEmailVerified 
                          ? 'border-green-600 bg-green-900/20' 
                          : 'border-gray-700 bg-gray-800'
                      } text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                      type="email"
                      name="email"
                      placeholder="Email (will be verified)"
                      value={values.email}
                      onChange={(e) => {
                        handleChange(e);
                        setIsEmailVerified(false);
                        setEmailVerificationError(null);
                      }}
                      disabled={isVerifyingEmail}
                    />
                    {isEmailVerified && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-green-400 text-xl">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="w-full flex flex-col justify-start">
                      <label
                        htmlFor="file-upload"
                        className="w-max flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Resume</span>
                      </label>
                      {isResumeUploading ? (
                        <span className="text-gray-400 mt-2 text-sm text-left">
                          Resume Uploading...
                        </span>
                      ) : fileName?.length > 0 ? (
                        <>
                          <span className="text-gray-400 mt-2 text-sm text-left break-all">
                            {fileName}
                          </span>
                          <p className="text-green-700 text-sm sm:text-base font-semibold text-center mt-2">
                            🎉 Congratulations! You've achieved a {cvMatch}%
                            match with the job posting.
                          </p>
                        </>
                      ) : null}
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        disabled={isResumeUploading || isLoading}
                        onChange={async (e) => {
                          const file: any = e.target.files?.[0];
                          if (file) {
                            setFileName(file.name);
                            uploadResumeFile(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <input
                    className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base"
                    type="text"
                    name="mobile"
                    placeholder="Phone Number"
                    value={values.mobile}
                    onChange={handleChange}
                  />
                  
                  <div>
                    <select
                      value={values.experienceLevel}
                      onChange={(e) =>
                        setFieldValue("experienceLevel", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="">Select experience level</option>
                      <option value="entry">Entry Level (0-1 years)</option>
                      <option value="junior">Junior (2-3 years)</option>
                      <option value="mid">Mid Level (4-6 years)</option>
                      <option value="senior">Senior (7-10 years)</option>
                      <option value="lead">Lead/Manager (10+ years)</option>
                    </select>
                  </div>
                  
                  <input
                    className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base"
                    type="text"
                    name="designation"
                    placeholder="Designation"
                    value={values.designation}
                    onChange={handleChange}
                  />
                  
                  <input
                    className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base"
                    type="text"
                    name="location"
                    placeholder="Location"
                    value={values.location}
                    onChange={handleChange}
                  />
                  
                  <div className="mb-4 lg:col-span-2">
                    <label className="block font-medium text-gray-400 mb-4 text-left text-sm sm:text-base">
                      Skills
                    </label>
                    {values.skills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <input
                          type="text"
                          value={skill}
                          onChange={(e) => {
                            let damiskills = [...(values.skills ?? [])];
                            damiskills[index] = e.target.value;
                            setValues({
                              ...values,
                              skills: damiskills,
                            });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="Enter skill"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            let damiskills = values.skills.filter(
                              (_, i) => i !== index
                            );
                            setValues({
                              ...values,
                              skills: damiskills,
                            });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setValues({
                          ...values,
                          skills: [...(values.skills ?? []), ""],
                        });
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Skill</span>
                    </button>
                  </div>
                </div>

                {/* Form Errors */}
                {Object.values(touched)?.length > 0 &&
                Object.values(errors)?.length > 0 ? (
                  <p className="text-red-600 mb-2 text-sm">
                    {Object.values(errors)[0]}
                  </p>
                ) : modalError ? (
                  <p className="text-red-600 mb-2 text-sm">{modalError}</p>
                ) : null}

                {/* Submit Button */}
                {isLoading || isVerifyingEmail ? (
                  <div className="flex justify-center items-center mt-4 space-x-2">
                    <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400 text-sm">
                      {isVerifyingEmail ? "Verifying email..." : "Submitting..."}
                    </span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isResumeUploading || isVerifyingEmail || !actualToken}
                    className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/30 text-sm sm:text-base"
                  >
                    Submit & Verify Access
                  </button>
                )}

                <p className="text-gray-500 text-xs mt-3 text-center">
                  Your email will be verified against the authorized candidate list.
                </p>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="w-full max-w-2xl my-10 bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white">
                <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center">
                {jobData?.jobTitle ?? "Physics"} Interview AI
              </h1>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white">
                <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              {jobData?.jobDescription}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-4 mb-2">
              Requirements
            </h2>
            <ul className="text-gray-300 list-disc ml-4 text-sm sm:text-base">
              {jobData?.requirements.map((item: any, i) => (
                <li key={i}>{item?.requirement ?? ""}</li>
              ))}
            </ul>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-4 mb-2">
              Responsibility
            </h2>
            <ul className="text-gray-300 list-disc ml-4 text-sm sm:text-base">
              {jobData?.responsibilities.map((item: any, i) => (
                <li key={i}>{item?.responsibility ?? ""}</li>
              ))}
            </ul>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-4 mb-2">
              Required Skills
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {jobData?.skills.map((item: any, index: number) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm"
                >
                  {item?.skill}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setReadyForInterview(true)}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/30 text-sm sm:text-base"
              >
                Ready For Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NameEmailModal;