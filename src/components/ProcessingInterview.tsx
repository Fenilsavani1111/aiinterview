import { motion } from "framer-motion";

interface ProcessingInterviewProps {
  currentStep: number;
}

export default function ProcessingInterview({
  currentStep,
}: ProcessingInterviewProps) {
  const steps: string[] = [
    "Uploading Video",
    "Analyzing Video",
    "Saving Analysis Data",
  ];

  // Progress based on step count
  const progress: number = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent text-gray-900">
      <motion.div
        className="bg-white p-8 rounded-2xl shadow-lg w-[90%] max-w-md text-center border border-gray-200"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <>
          <h2 className="text-2xl font-bold text-indigo-600 mb-6">
            Processing Your Interview
          </h2>

          {/* Loader */}
          <div className="w-full flex justify-center items-center">
            <motion.div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-lg h-3 mt-6 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>

          {/* Steps */}
          <div className="mt-6 text-left space-y-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center text-sm ${
                  i < currentStep
                    ? "text-green-600"
                    : i === currentStep
                    ? "text-yellow-500"
                    : "text-gray-500"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full mr-3 ${
                    i < currentStep
                      ? "bg-green-500"
                      : i === currentStep
                      ? "bg-yellow-400"
                      : "bg-gray-400"
                  }`}
                />
                {step}
              </div>
            ))}
          </div>

          <p className="mt-6 text-gray-500 text-sm">
            Please wait while we process and save your interview.
          </p>
        </>
      </motion.div>
    </div>
  );
}
