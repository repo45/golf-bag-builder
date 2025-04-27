import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface MyClubsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lofts: number[]) => void;
  initialLofts: number[];
  onStartBuilding: () => void;
}

const MyClubsModal: React.FC<MyClubsModalProps> = ({ isOpen, onClose, onSave, initialLofts, onStartBuilding }) => {
  const [lofts, setLofts] = useState<number[]>(initialLofts.length > 0 ? initialLofts : [0]);

  useEffect(() => {
    if (isOpen) {
      setLofts(initialLofts.length > 0 ? initialLofts : [0]);
    }
  }, [isOpen, initialLofts]);

  const handleLoftChange = (index: number, value: string) => {
    const newLofts = [...lofts];
    const parsedValue = parseFloat(value);
    newLofts[index] = isNaN(parsedValue) ? 0 : parsedValue;
    setLofts(newLofts);
  };

  const addLoftInput = () => {
    if (lofts.length >= 14) return;
    setLofts([...lofts, 0]);
  };

  const removeLoftInput = (index: number) => {
    if (lofts.length === 1) return;
    setLofts(lofts.filter((_, i) => i !== index));
  };

  const handleSaveAndStartBuilding = () => {
    const validLofts = lofts.filter(loft => !isNaN(loft) && loft > 0 && loft <= 70);
    if (validLofts.length === 0) {
      toast.error("Please enter at least one valid loft (0–70°).", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    onSave(validLofts);
    onStartBuilding();
  };

  const handleSave = () => {
    const validLofts = lofts.filter(loft => !isNaN(loft) && loft > 0 && loft <= 70);
    if (validLofts.length === 0) {
      toast.error("Please enter at least one valid loft (0–70°).", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    onSave(validLofts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">My Current Clubs</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Enter the lofts of your existing clubs to get recommendations for filling gaps in your bag.
        </p>
        <div className="space-y-3 mb-4">
          {lofts.map((loft, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="70"
                step="0.1"
                value={loft === 0 ? '' : loft}
                onChange={(e) => handleLoftChange(index, e.target.value)}
                placeholder="Enter Loft (e.g., 10.0°)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={() => removeLoftInput(index)}
                disabled={lofts.length === 1}
                className={`p-2 rounded-full ${
                  lofts.length === 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {index === lofts.length - 1 && (
                <button
                  onClick={addLoftInput}
                  disabled={lofts.length >= 14}
                  className={`p-2 rounded-full ${
                    lofts.length >= 14
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveAndStartBuilding}
            className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Save and Start Building
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyClubsModal;