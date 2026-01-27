import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Brain, Camera, Plus, Trash2, Upload, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { JobPost } from '../types';

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
  ) => void;
  jobData: JobPost | null;
  token?: string;
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
  const [fileName, setFileName] = useState('');
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [cvMatch, setCvMatch] = useState<number>(-1);

  // Email verification states
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [actualToken, setActualToken] = useState<string>('');

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
      firstName: '',
      lastName: '',
      email: '',
      resumeUrl: '',
      mobile: '',
      dob: '',
      highestQualification: '',
      degreeEducation: {
        stream: '',
        percentage: '',
        yearOfPassing: '',
      },
      plusTwoEducation: {
        stream: '',
        percentage: '',
        yearOfPassing: '',
      },
      tenthEducation: {
        stream: '',
        percentage: '',
        yearOfPassing: '',
      },
      location: '',
      skills: [''],
      region: '',
      residenceLocation: '',
    },
    validationSchema: Yup.object({
      firstName: Yup.string()
        .min(2, 'First name must be at least 2 characters')
        .matches(/^[a-zA-Z\s]+$/, 'First name should only contain letters')
        .required('Please enter your first name'),
      lastName: Yup.string()
        .min(2, 'Last name must be at least 2 characters')
        .matches(/^[a-zA-Z\s]+$/, 'Last name should only contain letters')
        .required('Please enter your last name'),
      email: Yup.string()
        .email('Please enter a valid email address (e.g., name@example.com)')
        .required('Please enter your email address'),
      resumeUrl: Yup.string().required('Please upload your resume'),
      mobile: Yup.string()
        .matches(/^[+]?[\d\s\-()]+$/, 'Please enter a valid phone number')
        .min(10, 'Phone number must be at least 10 digits')
        .required('Please enter your phone number'),
      dob: Yup.string().required('Please enter your date of birth (DD/MM/YYYY)'),
      highestQualification: Yup.string().required('Please select your highest qualification'),
      degreeEducation: Yup.object({
        stream: Yup.string(),
        percentage: Yup.string().matches(
          /^([0-9]{1,2}(\.[0-9]{1,2})?|100)$/,
          'Please enter a valid percentage (0-100)'
        ),
        yearOfPassing: Yup.string().matches(
          /^(19|20)\d{2}$/,
          'Please enter a valid year (e.g., 2020)'
        ),
      }),
      plusTwoEducation: Yup.object({
        stream: Yup.string(),
        percentage: Yup.string().matches(
          /^([0-9]{1,2}(\.[0-9]{1,2})?|100)$/,
          'Please enter a valid percentage (0-100)'
        ),
        yearOfPassing: Yup.string().matches(
          /^(19|20)\d{2}$/,
          'Please enter a valid year (e.g., 2020)'
        ),
      }),
      tenthEducation: Yup.object({
        stream: Yup.string(),
        percentage: Yup.string().matches(
          /^([0-9]{1,2}(\.[0-9]{1,2})?|100)$/,
          'Please enter a valid percentage (0-100)'
        ),
        yearOfPassing: Yup.string().matches(
          /^(19|20)\d{2}$/,
          'Please enter a valid year (e.g., 2020)'
        ),
      }),
      location: Yup.string()
        .min(2, 'Location must be at least 2 characters')
        .required('Please enter your current location'),
      skills: Yup.array().of(Yup.string().min(1, 'Skill cannot be empty')),
      region: Yup.string()
        .min(2, 'Region must be at least 2 characters')
        .required('Please enter your region'),
      residenceLocation: Yup.string()
        .min(2, 'Residence location must be at least 2 characters')
        .required('Please enter your residence location'),
    }),
    onSubmit: async (formValues) => {
      if (!actualToken) {
        setEmailVerificationError(
          'Assessment link token is missing. Please use the link from your email.'
        );
        return;
      }

      // Verify email before submission
      const isAuthorized = await verifyEmailAccess(formValues.email?.trim() || '');

      if (!isAuthorized) {
        return;
      }

      // Build educations array based on highest qualification
      const educations: Array<{
        type: 'degree' | 'plusTwo' | 'tenth';
        stream?: string;
        percentage?: string;
        yearOfPassing?: string;
      }> = [];

      // Always include 10th if highest qualification is at least 10th
      if (
        ['10th', '12th', 'diploma', 'bachelor', 'master', 'phd', 'other'].includes(
          formValues.highestQualification
        )
      ) {
        if (
          formValues.tenthEducation.stream ||
          formValues.tenthEducation.percentage ||
          formValues.tenthEducation.yearOfPassing
        ) {
          educations.push({
            type: 'tenth',
            ...formValues.tenthEducation,
          });
        }
      }

      // Include +2 if highest qualification is 12th or higher
      if (
        ['12th', 'diploma', 'bachelor', 'master', 'phd', 'other'].includes(
          formValues.highestQualification
        )
      ) {
        if (
          formValues.plusTwoEducation.stream ||
          formValues.plusTwoEducation.percentage ||
          formValues.plusTwoEducation.yearOfPassing
        ) {
          educations.push({
            type: 'plusTwo',
            ...formValues.plusTwoEducation,
          });
        }
      }

      // Include degree if highest qualification is diploma, bachelor, master, phd, or other
      if (
        ['diploma', 'bachelor', 'master', 'phd', 'other'].includes(formValues.highestQualification)
      ) {
        if (
          formValues.degreeEducation.stream ||
          formValues.degreeEducation.percentage ||
          formValues.degreeEducation.yearOfPassing
        ) {
          educations.push({
            type: 'degree',
            ...formValues.degreeEducation,
          });
        }
      }

      // If authorized, proceed with submission
      onSubmitPopup(
        formValues.firstName?.trim() + ' ' + formValues.lastName?.trim(),
        formValues.email?.trim() || '',
        formValues.resumeUrl?.trim() || '',
        formValues.mobile?.trim() || '',
        formValues.dob?.trim() || '',
        formValues.highestQualification?.trim() || '',
        educations,
        formValues.location?.trim() || '',
        formValues.skills?.map((skill) => skill.trim()) || [],
        formValues.region?.trim() || '',
        formValues.residenceLocation?.trim() || ''
      );
    },
  });

  /**
   * Verify email access against candidate list
   */
  const verifyEmailAccess = async (email: string): Promise<boolean> => {
    if (!email) {
      setEmailVerificationError('Please enter your email address');
      return false;
    }

    if (!actualToken) {
      setEmailVerificationError(
        'Assessment link token is missing. Please use the link from your email.'
      );
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
        setEmailVerificationError(response.data.error || 'Email verification failed');
        setShowAccessDenied(true);
        return false;
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Unable to verify email. Please try again.';

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
      setFieldError('resumeUrl', undefined);

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setFieldError('resumeUrl', 'File size must be less than 10MB');
        setIsResumeUploading(false);
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        setFieldError('resumeUrl', 'Please upload a PDF or DOCX file only');
        setIsResumeUploading(false);
        return;
      }

      if (jobData) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', `${values.firstName || values.lastName || 'resume'}`);

        const res = await axios.post(
          `${import.meta.env.VITE_AIINTERVIEW_API_KEY}/jobposts/upload-resume`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        if (res.data) {
          if (res.data?.file_url?.length > 0) {
            setFieldValue('resumeUrl', res?.data?.file_url);
            setCvMatch(60);
            setFieldError('resumeUrl', undefined);
          } else {
            setFieldError('resumeUrl', 'Failed to upload resume. Please try again.');
          }
        }
      }
    } catch (error: any) {
      console.error('Resume upload error:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to upload resume. Please check your connection and try again.';
      setFieldError('resumeUrl', errorMessage);
    } finally {
      setIsResumeUploading(false);
    }
  };

  if (!isOpen) return null;

  // Access Denied Modal
  if (showAccessDenied) {
    return (
      <div className='fixed inset-0 flex items-center justify-center bg-white bg-opacity-50 z-50 p-4'>
        <div className='bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-red-200'>
          <div className='flex flex-col items-center text-center'>
            <div className='w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6'>
              <XCircle className='w-12 h-12 text-red-600' />
            </div>

            <h2 className='text-2xl font-bold text-gray-800 mb-4'>Access Denied</h2>

            <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6 w-full'>
              <p className='text-red-700 text-sm leading-relaxed'>
                {emailVerificationError || 'Your email is not authorized for this assessment.'}
              </p>
            </div>

            <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 w-full'>
              <p className='text-gray-700 text-sm break-all'>
                <strong className='text-gray-800'>Email entered:</strong>
                <br />
                {values.email || 'No email provided'}
              </p>
            </div>

            <button
              onClick={() => {
                setShowAccessDenied(false);
                setEmailVerificationError(null);
                setFieldValue('email', '');
                setIsEmailVerified(false);
              }}
              className='w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg'
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100 p-4'>
      {readyForInterview ? (
        <>
          {cvMatch >= 0 && cvMatch < 60 ? (
            <div className='fixed inset-0 flex overflow-y-auto flex-grow items-center justify-center bg-white bg-opacity-50 z-50'>
              <div className='max-h-[90vh] w-full max-w-md p-4'>
                <div className='bg-white/95 backdrop-blur-sm p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full border border-red-200 text-center'>
                  <div className='mb-6'>
                    <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                      <svg
                        className='w-8 h-8 text-red-600'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                    </div>
                    <h2 className='text-xl font-bold text-gray-800 mb-2'>
                      Unfortunately, you are not eligible for the {jobData?.jobTitle} assessment at
                      this time.
                    </h2>
                    <p className='text-gray-600 text-lg leading-relaxed'>
                      Your resume matches only {cvMatch ?? 40}% of the job requirements at this
                      time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className='w-full max-w-3xl text-center my-10'>
            <form onSubmit={handleSubmit}>
              <div className='p-6 sm:p-8 bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 flex flex-col'>
                <h2 className='text-xl sm:text-2xl font-extrabold text-gray-800 text-center tracking-wide mb-2'>
                  Pre-Registration Form
                </h2>
                <p className='text-gray-600 text-sm text-center mb-6'>
                  Please fill in all required fields to continue with your assessment
                </p>

                {/* Token Missing Warning */}
                {!actualToken && (
                  <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2'>
                    <AlertCircle className='h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5' />
                    <p className='text-sm text-yellow-800'>
                      Assessment link token is missing. Please use the link from your email.
                    </p>
                  </div>
                )}

                {/* Email Verification Error */}
                {emailVerificationError && !showAccessDenied && (
                  <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2'>
                    <AlertCircle className='h-5 w-5 text-red-600 flex-shrink-0 mt-0.5' />
                    <p className='text-sm text-red-700'>{emailVerificationError}</p>
                  </div>
                )}

                {/* Email Verified Success */}
                {isEmailVerified && (
                  <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2'>
                    <AlertCircle className='h-5 w-5 text-green-600 flex-shrink-0 mt-0.5' />
                    <p className='text-sm text-green-700'>
                      ✓ Email verified successfully! You are authorized for this assessment.
                    </p>
                  </div>
                )}

                <div className='space-y-4'>
                  {/* Basic Information */}
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5'>
                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        First Name <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.firstName && touched.firstName
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='text'
                        placeholder='Enter your first name'
                        name='firstName'
                        value={values.firstName}
                        onChange={handleChange}
                      />
                      {errors.firstName && touched.firstName && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        Last Name <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.lastName && touched.lastName
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='text'
                        placeholder='Enter your last name'
                        name='lastName'
                        value={values.lastName}
                        onChange={handleChange}
                      />
                      {errors.lastName && touched.lastName && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className='relative'>
                    <label className='block text-gray-700 text-sm mb-2 text-left'>
                      Email Address <span className='text-red-600'>*</span>
                    </label>
                    <input
                      className={`border ${isEmailVerified
                        ? 'border-green-500 bg-green-50'
                        : errors.email && touched.email
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                        } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                      type='email'
                      name='email'
                      placeholder='your.email@example.com'
                      value={values.email}
                      onChange={(e) => {
                        handleChange(e);
                        setIsEmailVerified(false);
                        setEmailVerificationError(null);
                      }}
                      disabled={isVerifyingEmail}
                    />
                    {isEmailVerified && (
                      <div className='absolute right-3 top-10 transform -translate-y-1/2'>
                        <span className='text-green-600 text-xl'>✓</span>
                      </div>
                    )}
                    {errors.email && touched.email && !isEmailVerified && (
                      <p className='text-red-600 text-xs mt-1 text-left'>{errors.email}</p>
                    )}
                    <p className='text-gray-600 text-xs mt-1 text-left'>
                      Your email will be verified against the authorized candidate list
                    </p>
                  </div>

                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5'>
                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        Phone Number <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.mobile && touched.mobile
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='tel'
                        name='mobile'
                        placeholder='e.g., +1 234-567-8900 or 1234567890'
                        value={values.mobile}
                        onChange={handleChange}
                      />
                      {errors.mobile && touched.mobile && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.mobile}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        Date of Birth <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.dob && touched.dob
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='date'
                        name='dob'
                        value={values.dob}
                        onChange={handleChange}
                      />
                      {errors.dob && touched.dob && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.dob}</p>
                      )}
                    </div>
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className='block text-gray-700 text-sm mb-2 text-left'>
                      Resume / CV <span className='text-red-600'>*</span>
                    </label>
                    <div className='w-full flex flex-col justify-start'>
                      <label
                        htmlFor='file-upload'
                        className='w-max flex items-center space-x-2 cursor-pointer text-indigo-600 hover:text-indigo-600 text-sm font-medium transition-colors'
                      >
                        <Upload className='h-4 w-4' />
                        <span>Upload Resume (PDF or DOCX)</span>
                      </label>
                      {isResumeUploading ? (
                        <div className='mt-2'>
                          <span className='text-blue-400 text-sm text-left flex items-center'>
                            <div className='h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2'></div>
                            Uploading resume...
                          </span>
                        </div>
                      ) : fileName?.length > 0 ? (
                        <div className='mt-2'>
                          <span className='text-green-400 text-sm text-left break-all flex items-center'>
                            <span className='mr-2'>✓</span>
                            {fileName}
                          </span>
                          {cvMatch > 0 && (
                            <p className='text-green-400 text-sm font-medium text-left mt-2'>
                              🎉 Great! Your resume matches {cvMatch}% with the job requirements.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className='text-gray-600 text-xs mt-2 text-left'>
                          Accepted formats: PDF, DOCX (Max size: 10MB)
                        </p>
                      )}
                      {errors.resumeUrl && touched.resumeUrl && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.resumeUrl}</p>
                      )}
                      <input
                        id='file-upload'
                        type='file'
                        accept='.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        className='hidden'
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

                  {/* Highest Qualification */}
                  <div>
                    <label className='block text-gray-700 text-sm mb-2 text-left'>
                      Highest Qualification <span className='text-red-600'>*</span>
                    </label>
                    <select
                      value={values.highestQualification}
                      onChange={(e) => setFieldValue('highestQualification', e.target.value)}
                      className={`w-full px-4 py-3 border ${errors.highestQualification && touched.highestQualification
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white'
                        } text-gray-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base`}
                    >
                      <option value=''>Choose your highest qualification</option>
                      <option value='10th'>10th Standard / SSC</option>
                      <option value='12th'>12th Standard / HSC (+2)</option>
                      <option value='diploma'>Diploma</option>
                      <option value='bachelor'>Bachelor's Degree</option>
                      <option value='master'>Master's Degree</option>
                      <option value='phd'>PhD / Doctorate</option>
                      <option value='other'>Other</option>
                    </select>
                    {errors.highestQualification && touched.highestQualification && (
                      <p className='text-red-600 text-xs mt-1 text-left'>
                        {errors.highestQualification}
                      </p>
                    )}
                  </div>

                  {/* Degree Education - Show if highest qualification is diploma, bachelor, master, phd, or other */}
                  {values.highestQualification &&
                    ['diploma', 'bachelor', 'master', 'phd', 'other'].includes(
                      values.highestQualification
                    ) && (
                      <div className='border-t border-gray-200 pt-4'>
                        <h3 className='text-gray-800 font-semibold mb-3 text-left text-sm sm:text-base'>
                          Degree / Bachelor's Education
                        </h3>
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Stream / Branch
                            </label>
                            <input
                              className='border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base'
                              type='text'
                              placeholder='e.g., Computer Science, BBA'
                              value={values.degreeEducation.stream}
                              onChange={(e) =>
                                setFieldValue('degreeEducation', {
                                  ...values.degreeEducation,
                                  stream: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Percentage (%)
                            </label>
                            <input
                              className={`border ${errors.degreeEducation?.percentage
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 85.5'
                              value={values.degreeEducation.percentage}
                              onChange={(e) =>
                                setFieldValue('degreeEducation', {
                                  ...values.degreeEducation,
                                  percentage: e.target.value,
                                })
                              }
                            />
                            {errors.degreeEducation?.percentage && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.degreeEducation.percentage}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Year of Passing
                            </label>
                            <input
                              className={`border ${errors.degreeEducation?.yearOfPassing
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 2020'
                              value={values.degreeEducation.yearOfPassing}
                              onChange={(e) =>
                                setFieldValue('degreeEducation', {
                                  ...values.degreeEducation,
                                  yearOfPassing: e.target.value,
                                })
                              }
                            />
                            {errors.degreeEducation?.yearOfPassing && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.degreeEducation.yearOfPassing}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* +2 Education - Show if highest qualification is 12th or higher */}
                  {values.highestQualification &&
                    ['12th', 'diploma', 'bachelor', 'master', 'phd', 'other'].includes(
                      values.highestQualification
                    ) && (
                      <div className='border-t border-gray-200 pt-4'>
                        <h3 className='text-gray-800 font-semibold mb-3 text-left text-sm sm:text-base'>
                          +2 / 12th Standard Education
                        </h3>
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Stream / Branch
                            </label>
                            <input
                              className='border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base'
                              type='text'
                              placeholder='e.g., Science, Commerce, Arts'
                              value={values.plusTwoEducation.stream}
                              onChange={(e) =>
                                setFieldValue('plusTwoEducation', {
                                  ...values.plusTwoEducation,
                                  stream: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Percentage (%)
                            </label>
                            <input
                              className={`border ${errors.plusTwoEducation?.percentage
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 85.5'
                              value={values.plusTwoEducation.percentage}
                              onChange={(e) =>
                                setFieldValue('plusTwoEducation', {
                                  ...values.plusTwoEducation,
                                  percentage: e.target.value,
                                })
                              }
                            />
                            {errors.plusTwoEducation?.percentage && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.plusTwoEducation.percentage}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Year of Passing
                            </label>
                            <input
                              className={`border ${errors.plusTwoEducation?.yearOfPassing
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 2018'
                              value={values.plusTwoEducation.yearOfPassing}
                              onChange={(e) =>
                                setFieldValue('plusTwoEducation', {
                                  ...values.plusTwoEducation,
                                  yearOfPassing: e.target.value,
                                })
                              }
                            />
                            {errors.plusTwoEducation?.yearOfPassing && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.plusTwoEducation.yearOfPassing}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* 10th Education - Show if highest qualification is at least 10th */}
                  {values.highestQualification &&
                    ['10th', '12th', 'diploma', 'bachelor', 'master', 'phd', 'other'].includes(
                      values.highestQualification
                    ) && (
                      <div className='border-t border-gray-200 pt-4'>
                        <h3 className='text-gray-800 font-semibold mb-3 text-left text-sm sm:text-base'>
                          10th Standard / SSC Education
                        </h3>
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Board / Stream
                            </label>
                            <input
                              className='border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base'
                              type='text'
                              placeholder='e.g., CBSE, State Board'
                              value={values.tenthEducation.stream}
                              onChange={(e) =>
                                setFieldValue('tenthEducation', {
                                  ...values.tenthEducation,
                                  stream: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Percentage (%)
                            </label>
                            <input
                              className={`border ${errors.tenthEducation?.percentage
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 90.2'
                              value={values.tenthEducation.percentage}
                              onChange={(e) =>
                                setFieldValue('tenthEducation', {
                                  ...values.tenthEducation,
                                  percentage: e.target.value,
                                })
                              }
                            />
                            {errors.tenthEducation?.percentage && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.tenthEducation.percentage}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className='block text-gray-600 text-xs mb-1 text-left'>
                              Year of Passing
                            </label>
                            <input
                              className={`border ${errors.tenthEducation?.yearOfPassing
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                                } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                              type='text'
                              placeholder='e.g., 2016'
                              value={values.tenthEducation.yearOfPassing}
                              onChange={(e) =>
                                setFieldValue('tenthEducation', {
                                  ...values.tenthEducation,
                                  yearOfPassing: e.target.value,
                                })
                              }
                            />
                            {errors.tenthEducation?.yearOfPassing && (
                              <p className='text-red-600 text-xs mt-1 text-left'>
                                {errors.tenthEducation.yearOfPassing}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Current Location */}
                  <div>
                    <label className='block text-gray-700 text-sm mb-2 text-left'>
                      Current Location <span className='text-red-600'>*</span>
                    </label>
                    <input
                      className={`border ${errors.location && touched.location
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white'
                        } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                      type='text'
                      name='location'
                      placeholder='e.g., New York, USA or Bangalore, India'
                      value={values.location}
                      onChange={handleChange}
                    />
                    {errors.location && touched.location && (
                      <p className='text-red-600 text-xs mt-1 text-left'>{errors.location}</p>
                    )}
                  </div>

                  {/* Region and Residence Location */}
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5'>
                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        Region <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.region && touched.region
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='text'
                        name='region'
                        placeholder='e.g., North America, Asia, Europe'
                        value={values.region}
                        onChange={handleChange}
                      />
                      {errors.region && touched.region && (
                        <p className='text-red-600 text-xs mt-1 text-left'>{errors.region}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 text-sm mb-2 text-left'>
                        Residence Location <span className='text-red-600'>*</span>
                      </label>
                      <input
                        className={`border ${errors.residenceLocation && touched.residenceLocation
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                          } text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg p-3 w-full transition-all duration-200 outline-none text-sm sm:text-base`}
                        type='text'
                        name='residenceLocation'
                        placeholder='e.g., California, USA or Karnataka, India'
                        value={values.residenceLocation}
                        onChange={handleChange}
                      />
                      {errors.residenceLocation && touched.residenceLocation && (
                        <p className='text-red-600 text-xs mt-1 text-left'>
                          {errors.residenceLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Additional Skills */}
                  <div className='border-t border-gray-300 pt-4'>
                    <label className='block font-medium text-gray-700 mb-4 text-left text-sm sm:text-base'>
                      Additional Skills{' '}
                      <span className='text-gray-600 font-normal text-xs'>(Optional)</span>
                    </label>
                    <p className='text-gray-600 text-xs mb-3 text-left'>
                      Add your technical and soft skills (e.g., JavaScript, Communication,
                      Leadership)
                    </p>
                    {values.skills.map((skill, index) => (
                      <div key={index} className='flex items-center space-x-2 mb-2'>
                        <input
                          type='text'
                          value={skill}
                          onChange={(e) => {
                            let damiskills = [...(values.skills ?? [])];
                            damiskills[index] = e.target.value;
                            setValues({
                              ...values,
                              skills: damiskills,
                            });
                          }}
                          className='flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base'
                          placeholder='Type a skill and press Enter'
                        />
                        <button
                          type='button'
                          onClick={() => {
                            let damiskills = values.skills.filter((_, i) => i !== index);
                            setValues({
                              ...values,
                              skills: damiskills,
                            });
                          }}
                          className='text-red-600 hover:text-red-700'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    ))}
                    <button
                      type='button'
                      onClick={() => {
                        setValues({
                          ...values,
                          skills: [...(values.skills ?? []), ''],
                        });
                      }}
                      className='flex items-center space-x-2 text-indigo-600 hover:text-indigo-600 text-sm font-medium transition-colors'
                    >
                      <Plus className='h-4 w-4' />
                      <span>Add Another Skill</span>
                    </button>
                  </div>
                </div>

                {/* General Form Errors */}
                {modalError && (
                  <div className='mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg'>
                    <p className='text-red-300 text-sm'>{modalError}</p>
                  </div>
                )}

                {/* Submit Button */}
                {isLoading || isVerifyingEmail ? (
                  <div className='flex justify-center items-center mt-4 space-x-2'>
                    <div className='h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
                    <span className='text-gray-600 text-sm'>
                      {isVerifyingEmail ? 'Verifying email...' : 'Submitting...'}
                    </span>
                  </div>
                ) : (
                  <button
                    type='submit'
                    disabled={isResumeUploading || isVerifyingEmail || !actualToken}
                    className='mt-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm sm:text-base'
                  >
                    Submit & Verify Access
                  </button>
                )}

                <p className='text-gray-600 text-xs mt-3 text-center'>
                  Your email will be verified against the authorized candidate list.
                </p>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className='w-full max-w-2xl my-10 bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-white/50'>
          <div className='mb-6'>
            <div className='flex items-center justify-center gap-3 mb-4 flex-wrap'>
              <div className='p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white'>
                <Brain className='w-6 h-6 sm:w-8 sm:h-8' />
              </div>
              <h1 className='text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center'>
                {jobData?.jobTitle ?? 'Physics'} Assessment
              </h1>
              <div className='p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white'>
                <Camera className='w-6 h-6 sm:w-8 sm:h-8' />
              </div>
            </div>
            <p className='text-gray-700 leading-relaxed text-sm sm:text-base'>
              {jobData?.jobDescription}
            </p>
            <h2 className='text-lg sm:text-xl font-bold text-gray-800 mt-4 mb-2'>Requirements</h2>
            <ul className='text-gray-700 list-disc ml-4 text-sm sm:text-base'>
              {jobData?.requirements.map((item: any, i) => (
                <li key={i}>{item?.requirement ?? ''}</li>
              ))}
            </ul>
            <h2 className='text-lg sm:text-xl font-bold text-gray-800 mt-4 mb-2'>Responsibility</h2>
            <ul className='text-gray-700 list-disc ml-4 text-sm sm:text-base'>
              {jobData?.responsibilities.map((item: any, i) => (
                <li key={i}>{item?.responsibility ?? ''}</li>
              ))}
            </ul>
            <h2 className='text-lg sm:text-xl font-bold text-gray-800 mt-4 mb-2'>
              Required Skills
            </h2>
            <div className='flex flex-wrap gap-2 mt-1'>
              {jobData?.skills.map((item: any, index: number) => (
                <span
                  key={index}
                  className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm'
                >
                  {item?.skill}
                </span>
              ))}
            </div>
            <div className='flex items-center justify-center gap-3 mb-4'>
              <button
                onClick={() => setReadyForInterview(true)}
                className='mt-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm sm:text-base'
              >
                Ready For Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NameEmailModal;
