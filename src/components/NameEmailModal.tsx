import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Plus, Trash2, Upload } from "lucide-react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { getDataFromPdf } from "../services/apiService";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Props {
  isOpen: boolean;
  isLoading: boolean;
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
}

const NameEmailModal: React.FC<Props> = ({
  isOpen,
  onSubmitPopup,
  isLoading,
}) => {
  const [fileName, setFileName] = useState("");
  const [isResumeUploading, setIsResumeUploading] = useState(false);
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
      resumeUrl: Yup.string().url("Enter a valid URL"),
      mobile: Yup.string().required("Mobile is required"),
      experienceLevel: Yup.string(),
      designation: Yup.string(),
      location: Yup.string(),
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
      const arrayBuffer = await file.arrayBuffer();
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
      let jobData:
        | {
            name: string;
            email: string;
            phone: string;
            experienceLevel: string;
            designation: string;
            location: string;
            skills: string[];
          }
        | undefined = await getDataFromPdf(fullText);
      setValues({
        ...values,
        name: jobData?.name ?? "",
        email: jobData?.email ?? "",
        mobile: jobData?.phone ?? "",
        designation: jobData?.designation ?? "",
        experienceLevel: jobData?.experienceLevel ?? "",
        location: jobData?.location ?? "",
        skills: jobData?.skills ?? [],
      });
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-resume`,
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
    } catch (error) {
      setIsResumeUploading(false);
      console.error("Error uploading resume file:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex overflow-y-auto flex-grow items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="max-h-[90vh] w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="p-8 bg-gray-900 rounded-2xl shadow-2xl flex flex-col"
        >
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
              <div className="w-max">
                <label
                  htmlFor="file-upload"
                  className="flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Resume</span>
                </label>
                {isResumeUploading ? (
                  <span className="text-gray-400 mt-5 text-sm">
                    Resume Uploading...
                  </span>
                ) : fileName?.length > 0 ? (
                  <span className="text-gray-400 mt-5 text-sm">{fileName}</span>
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
        </form>
      </div>
    </div>
  );
};

export default NameEmailModal;
