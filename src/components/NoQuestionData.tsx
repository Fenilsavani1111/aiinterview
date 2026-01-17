import React from 'react';

const NoQuestionData: React.FC = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100 p-4'>
      <div className='bg-white/70 backdrop-blur-sm p-8 rounded-2xl sm:rounded-3xl shadow-xl w-11/12 max-w-md border border-white/50 text-center'>
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
          <h2 className='text-2xl font-bold text-gray-800 mb-2'>
            No Questions Available
          </h2>
          <p className='text-gray-600 text-lg leading-relaxed'>
            We don't have questions and job posts for user. Please contact the
            admin.
          </p>
        </div>

        <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
          <p className='text-gray-700 text-sm'>
            <span className='font-semibold text-indigo-600'>
              Contact Admin:
            </span>
            <br />
            If you believe this is an error, please reach out to the
            administrator for assistance.
          </p>
        </div>

        <button
          className='mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl'
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default NoQuestionData;
