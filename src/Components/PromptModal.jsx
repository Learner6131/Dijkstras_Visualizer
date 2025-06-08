import React, { useState, useRef, useEffect } from "react";

const PromptModal = ({ onConfirm, onClose }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onConfirm(value);
    }
  };

  return (
    <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center backdrop-blur-md backdrop-filter backdrop-brightness-75 z-50">
      <div className="rounded-xl bg-gray-900 p-6 shadow-xl w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-blue-700 text-center">
          Enter Starting Node
        </h2>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. 1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 border rounded-md"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-800 rounded-md hover:bg-red-900"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
