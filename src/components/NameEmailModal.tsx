import React, { useState } from "react";

interface Props {
  isOpen: boolean;
  onSubmit: (name: string, email: string) => void;
}

const NameEmailModal: React.FC<Props> = ({ isOpen, onSubmit }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-11/12 max-w-md border border-gray-700">
        <h2 className="text-2xl font-extrabold mb-6 text-white text-center tracking-wide">Enter Your Details</h2>
        <input
          className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 mb-4 w-full transition-all duration-200 outline-none"
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 mb-6 w-full transition-all duration-200 outline-none"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/30"
          onClick={() => onSubmit(name, email)}
          disabled={!name || !email}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default NameEmailModal; 