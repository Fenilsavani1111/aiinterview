import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Plus, Trash2, Upload } from "lucide-react";
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
}) => {
  const [fileName, setFileName] = useState("");
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [cvMatch, setCvMatch] = useState<number>(-1);

  // Validation schema using Yup and formik
  const {
    values,
    touched,
    errors,
    handleChange,
    setFieldValue,
    setValues,
    handleSubmit,
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
      skills: Yup.array().of(
        Yup.string()
        // .required("Skill cannot be empty")
      ),
    }),
    onSubmit: (values) => {
      onSubmitPopup(
        values.name,
        values.email,
        values.resumeUrl,
        values.mobile,
        values.experienceLevel,
        values.designation,
        values.location,
        values.skills
      );
    },
  });

  const uploadResumeFile = async (file: any) => {
    try {
      setIsResumeUploading(true);
      if (jobData) {
        let fileContent = "";
        const arrayBuffer = await file.arrayBuffer();
        if (file.type.includes("pdf")) {
          const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText +=
              content.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" ") + "\n";
          }
          fileContent = fullText;
        } else if (
          file.type.includes("word") ||
          file.type.includes("document") ||
          file.type.includes("docx") ||
          file.type.includes("doc")
        ) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          fileContent = `📋 Extracted Information:\n${result.value}`;
        } else {
          fileContent = `Unsupported file type`;
        }
        // check resume parser (compare jobpost and resume) and get popup fields form resume
        let cvparserdata = await getCvMatchWithJD(
          {
            jobTitle: jobData?.jobTitle,
            company: jobData?.company,
            department: jobData?.department,
            location: jobData?.location,
            jobType: jobData?.jobType,
            experienceLevel: jobData?.experienceLevel,
            jobDescription: jobData?.jobDescription,
            salaryMin: jobData?.salaryMin,
            salaryMax: jobData?.salaryMax,
            salaryCurrency: jobData?.salaryCurrency,
            requirements: jobData?.requirements ?? [],
            responsibilities: jobData?.responsibilities ?? [],
            skills: jobData?.skills ?? [],
            questions: [],
          },
          fileContent
        );
        let resumedata = cvparserdata?.job_data;
        let matchData = cvparserdata?.match;
        console.log("matchData", matchData);
        if (matchData?.overallMatchPercentage >= 0) {
          setCvMatch(matchData?.overallMatchPercentage ?? 0);
          if (matchData?.overallMatchPercentage < 60)
            setIsResumeUploading(false);
          else {
            let newskills = [];
            if (values.skills?.length === 0) {
              newskills = resumedata?.skills ?? [];
            } else if (values.skills?.length === 1) {
              newskills =
                values.skills?.[0]?.length > 0
                  ? [...values.skills]
                  : resumedata?.skills ?? [];
            } else if (values.skills?.length >= 2) {
              newskills = resumedata?.skills ?? [];
            }
            setValues({
              ...values,
              name:
                values.name?.length > 0 ? values.name : resumedata?.name ?? "",
              email:
                values.email?.length > 0
                  ? values.email
                  : resumedata?.email ?? "",
              mobile:
                values.mobile?.length > 0
                  ? values.mobile
                  : resumedata?.phone ?? "",
              designation:
                values.designation?.length > 0
                  ? values.designation
                  : resumedata?.designation ?? "",
              experienceLevel:
                values.experienceLevel?.length > 0
                  ? values.experienceLevel
                  : resumedata?.experienceLevel ?? "",
              location:
                values.location?.length > 0
                  ? values.location
                  : resumedata?.location ?? "",
              skills: newskills,
            });
            //upload resume to cloud
            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileName", `${values.name}`);
            const res = await axios.post(
              `${
                import.meta.env.VITE_AIINTERVIEW_API_KEY
              }/jobposts/upload-resume`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              }
            );
            if (res.data) {
              if (res.data?.file_url?.length > 0)
                setFieldValue("resumeUrl", res?.data?.file_url);
              setIsResumeUploading(false);
            }
          }
        } else {
          setCvMatch(-1);
          setIsResumeUploading(false);
        }
      }
    } catch (error) {
      setIsResumeUploading(false);
      console.error("Error uploading resume file:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-opacity-95">
      {cvMatch >= 0 && cvMatch < 60 ? (
        <div className="fixed inset-0 flex overflow-y-auto flex-grow items-center justify-center bg-gray-900 z-50">
          <div className="max-h-[90vh] w-full max-w-md">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-11/12 max-w-md border border-gray-700 text-center">
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
      ) : (
        <></>
      )}
      <div className="w-full max-w-md text-center my-10">
        <form onSubmit={handleSubmit}>
          <div className="p-8 bg-gray-900 rounded-2xl shadow-sm shadow-gray-700 flex flex-col">
            <h2 className="text-2xl font-extrabold text-white text-center tracking-wide mb-6">
              Enter Your Details
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <input
                className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none"
                type="text"
                placeholder="Name"
                name="name"
                value={values.name}
                onChange={handleChange}
              />
              <input
                className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none"
                type="email"
                name="email"
                placeholder="Email"
                value={values.email}
                onChange={handleChange}
              />
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
                      <span className="text-gray-400 mt-2 text-sm text-left">
                        {fileName}
                      </span>
                      <p className="text-green-700 text-base font-semibold text-center mt-2">
                        🎉 Congratulations! You’ve achieved a {cvMatch}% match
                        with the job posting.
                      </p>
                    </>
                  ) : (
                    <></>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={async (e) => {
                      const file: any = e.target.files?.[0];
                      setFileName(file?.name ?? "");
                      uploadResumeFile(file);
                    }}
                  />
                </div>
              </div>
              <input
                className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none"
                type="text"
                name="mobile"
                placeholder="Phone Number"
                value={values.mobile}
                onChange={handleChange}
              />
              <div className="">
                <select
                  value={values.experienceLevel}
                  onChange={(e) =>
                    setFieldValue("experienceLevel", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none"
                type="text"
                name="designation"
                placeholder="Designation"
                value={values.designation}
                onChange={handleChange}
              />
              <input
                className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 w-full transition-all duration-200 outline-none"
                type="text"
                name="location"
                placeholder="Location"
                value={values.location}
                onChange={handleChange}
              />
              <div className="mb-4 lg:col-span-2">
                <label className="block font-medium text-gray-400 mb-4">
                  Skills
                </label>
                {values.skills.map((skill, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
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
                      className="flex-1 px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {Object.values(touched)?.length > 0 &&
            Object.values(errors)?.length > 0 ? (
              <p className="text-red-600 mb-2">{Object.values(errors)[0]}</p>
            ) : modalError ? (
              <p className="text-red-600 mb-2">{modalError}</p>
            ) : (
              <></>
            )}
            {isLoading ? (
              <div className="flex justify-center mt-4">
                <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isResumeUploading}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/30"
              >
                Submit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NameEmailModal;
