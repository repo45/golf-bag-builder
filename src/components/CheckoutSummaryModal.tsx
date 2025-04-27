import React from 'react';
import { Club } from '../types/club';

interface CheckoutSummaryModalProps {
  selectedClubs: (Club & { image_path: string; handicapperlevel: string })[];
  onClose: () => void;
}

const CheckoutSummaryModal: React.FC<CheckoutSummaryModalProps> = ({ selectedClubs, onClose }) => {
  const totalPrice = selectedClubs.reduce((sum, club) => sum + club.price, 0);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-[90%] mx-4 shadow-md max-h-[95vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Checkout Summary
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Review your selected clubs and click "Buy Now" to purchase from retailers.
        </p>

        {selectedClubs.length === 0 ? (
          <p className="text-gray-600 italic text-sm">Your bag is empty.</p>
        ) : (
          <div className="space-y-4">
            {selectedClubs.map((club, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-3 bg-gray-100 rounded-lg"
              >
                <img
                  src={club.image_path}
                  alt={`${club.brand} ${club.model}`}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-800">
                    {club.brand} {club.model}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {club.type} {club.specifictype ? `- ${club.specifictype}` : ''} - Loft: {club.loft || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Skill Level: {club.handicapperlevel}
                  </p>
                  <p className="text-base font-semibold text-green-600">
                    £{club.price.toFixed(2)}
                  </p>
                </div>
                <a
                  href={club.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Buy Now
                </a>
              </div>
            ))}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-base font-semibold text-gray-800">
                Total Price: £{totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSummaryModal;