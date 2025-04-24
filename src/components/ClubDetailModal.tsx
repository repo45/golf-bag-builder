import { useEffect, useState } from "react";
import { Club, ClubModel } from "../types/club";

interface ClubDetailModalProps {
  clubModel: ClubModel | null;
  variant: Club | null;
  selectedClubs: Club[];
  imageSrc: string;
  onClose: () => void;
  onAddToBag: (club: Club) => void;
  onRemove: (clubId: number) => void;
  onSelectVariant: (club: Club) => void;
  isSelected: boolean;
  isBagFull: boolean;
}

const ClubDetailModal: React.FC<ClubDetailModalProps> = ({
  clubModel,
  variant,
  selectedClubs,
  imageSrc,
  onClose,
  onAddToBag,
  onRemove,
  onSelectVariant,
  isSelected,
  isBagFull,
}) => {
  console.log("ClubDetailModal rendering, clubModel:", clubModel, "variant:", variant);

  const [isImageLoading, setIsImageLoading] = useState(true);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!clubModel || !variant) return null;

  // Find the cheapest price for the selected variant
  const cheapestPrice = Math.min(...variant.prices.map(p => p.price));

  const handleAddToBag = () => {
    if (!isBagFull && !isSelected) {
      onAddToBag(variant);
    }
  };

  const handleRemoveFromBag = () => {
    onRemove(variant.id);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-md max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
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

        {/* Selected Variant Details */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {variant.brand} {variant.model}
        </h2>
        <p className="text-gray-600 mb-4">
          {variant.type}{" "}
          {variant.subType ? `(${variant.subType})` : ""}{" "}
          {variant.specificType ? `- ${variant.specificType}` : ""}
        </p>
        <div className="relative w-[18rem] h-[12rem] mx-auto">
          {isImageLoading && (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-200 animate-pulse rounded-lg" />
          )}
          <img
            src={imageSrc}
            alt={`${variant.brand} ${variant.model}`}
            className="absolute top-0 left-0 w-full h-full object-cover object-center rounded-lg"
            loading="lazy"
            onLoad={() => setIsImageLoading(false)}
            onError={(e) => {
              console.error(`Failed to load image: ${imageSrc}`);
              e.currentTarget.src = "https://via.placeholder.com/300x200?text=Image+Not+Found";
              setIsImageLoading(false);
            }}
          />
        </div>
        <div className="mb-4 mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Price Comparisons
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Retailer</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {variant.prices.map((price, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">
                      {price.retailer}
                    </td>
                    <td
                      className={`px-4 py-2 ${
                        price.price === cheapestPrice
                          ? "text-green-600 font-semibold"
                          : ""
                      }`}
                    >
                      £{price.price.toFixed(2)}
                      {price.price === cheapestPrice && (
                        <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Cheapest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={price.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Buy Now
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Loft: {variant.loft || "N/A"}
        </p>
        {variant.shaftMaterial && (
          <p className="text-sm text-gray-600">
            Shaft Material: {variant.shaftMaterial}
          </p>
        )}
        {variant.setMakeup && (
          <p className="text-sm text-gray-600">
            Set Makeup: {variant.setMakeup}
          </p>
        )}
        {variant.length && (
          <p className="text-sm text-gray-600">
            Length: {variant.length}
          </p>
        )}
        {variant.bounce && (
          <p className="text-sm text-gray-600">
            Bounce: {variant.bounce}
          </p>
        )}
        <p className="text-lg font-semibold text-green-600 mt-2">
          £{variant.price.toFixed(2)}
        </p>
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            Forgiveness: {variant.forgivenessRating}/10
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${variant.forgivenessRating * 10}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            Difficulty: {variant.difficultyRating}/10
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-red-600 h-2.5 rounded-full"
              style={{ width: `${variant.difficultyRating * 10}%` }}
            ></div>
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          {variant.description}
        </p>

        {/* Add/Remove Button for Selected Variant */}
        <div className="mt-6 flex space-x-4">
          {isSelected ? (
            <button
              className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              onClick={handleRemoveFromBag}
            >
              Remove from Bag
            </button>
          ) : (
            <button
              className={`flex-1 py-2 rounded-lg text-white transition ${
                isBagFull
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={handleAddToBag}
              disabled={isBagFull}
            >
              {isBagFull ? "Bag Full" : "Add to Bag"}
            </button>
          )}
          <button
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Variants Table */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Other Variants
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Loft</th>
                  <th className="px-4 py-2">Handedness</th>
                  <th className="px-4 py-2">Flex</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Shaft Material</th>
                  <th className="px-4 py-2">Set Makeup</th>
                  <th className="px-4 py-2">Length</th>
                  <th className="px-4 py-2">Bounce</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {clubModel.variants.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b hover:bg-gray-50 ${
                      v.id === variant.id ? "bg-gray-200" : ""
                    }`}
                  >
                    <td className="px-4 py-2">{v.loft || "N/A"}</td>
                    <td className="px-2 py-2">{v.description.match(/Handedness: ([^\s,]+)/)?.[1] || "N/A"}</td>
                    <td className="px-2 py-2">{v.description.match(/Flex: ([^\s,]+)/)?.[1] || "N/A"}</td>
                    <td className="px-2 py-2">{v.description.match(/Condition: ([^\s,]+)/)?.[1] || "N/A"}</td>
                    <td className="px-2 py-2">{v.shaftMaterial || "N/A"}</td>
                    <td className="px-2 py-2">{v.setMakeup || "N/A"}</td>
                    <td className="px-2 py-2">{v.length || "N/A"}</td>
                    <td className="px-2 py-2">{v.bounce || "N/A"}</td>
                    <td className="px-2 py-2">£{v.price.toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 transform hover:scale-110 transition"
                          onClick={() => onSelectVariant(v)}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          className={`text-green-600 hover:text-green-800 transform hover:scale-110 transition ${
                            isBagFull || selectedClubs.some(c => c.id === v.id)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => onAddToBag(v)}
                          disabled={isBagFull || selectedClubs.some(c => c.id === v.id)}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubDetailModal;