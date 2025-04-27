import { useState } from "react";
import { Club, ClubModel } from "../types/club";

interface ClubCardProps {
  club: Club & {
    handicapperlevel: string;
  };
  clubModel: ClubModel;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onViewDetails: () => void;
  isBagFull: boolean;
  imageSrc: string;
}

const ClubCard: React.FC<ClubCardProps> = ({
  club,
  clubModel,
  isSelected,
  onSelect,
  onDeselect,
  onViewDetails,
  isBagFull,
  imageSrc,
}) => {
  console.log(`ClubCard ImageSrc for ${club.brand} ${club.model}: ${imageSrc}, isSelected: ${isSelected}`);

  const [isImageLoading, setIsImageLoading] = useState(true);

  const handleViewDetails = () => {
    onViewDetails();
  };

  const cheapestPrice = clubModel.variants.length > 0
    ? Math.min(...clubModel.variants.map(v => v.price))
    : club.price;
  const priceDisplay = `£${cheapestPrice.toFixed(2)}`;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBagFull) {
      alert("Cannot add more than 14 clubs to the bag.");
    } else {
      onSelect();
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeselect();
  };

  const getHandicapperLevelStyles = (level: string) => {
    switch (level) {
      case "Beginner":
        return {
          bgColor: "bg-green-100 text-green-800",
          icon: "🚩",
        };
      case "Intermediate":
        return {
          bgColor: "bg-yellow-100 text-yellow-800",
          icon: "➔",
        };
      case "Advanced":
        return {
          bgColor: "bg-blue-100 text-blue-800",
          icon: "★",
        };
      default:
        return {
          bgColor: "bg-gray-100 text-gray-800",
          icon: "",
        };
    }
  };

  const { bgColor, icon } = getHandicapperLevelStyles(club.handicapperlevel);

  const typeLabel = club.specifictype || club.type;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-72">
      <div onClick={handleViewDetails} className="cursor-pointer flex flex-col flex-1">
        <div className="relative w-[9.375rem] h-[6.25rem] mx-auto mt-2">
          {isImageLoading && (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-200 animate-pulse rounded-lg" />
          )}
          <img
            src={imageSrc}
            alt={`${club.brand} ${club.model}`}
            className="absolute top-0 left-0 w-full h-full object-cover object-center rounded-lg"
            loading="lazy"
            onLoad={() => setIsImageLoading(false)}
            onError={(e) => {
              console.error(`Failed to load image: ${imageSrc}`);
              e.currentTarget.src = "https://via.placeholder.com/150x100?text=Image+Not+Found";
              setIsImageLoading(false);
            }}
          />
        </div>
        <div className="p-3 text-center flex flex-col flex-1">
          <div className="flex-1">
            <h3 className="text-sm text-gray-800 truncate">
              {club.brand} {club.model}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {typeLabel} - {club.loft || 'N/A'}
            </p>
            <div className="mt-1 flex justify-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
                {icon && <span className="mr-1">{icon}</span>}
                {club.handicapperlevel}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              {priceDisplay}
            </p>
          </div>
          <button
            className={`group flex h-7 w-full rounded bg-gray-100 items-center justify-between rounded-md text-xs text-gray-900 transition-colors hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white focus:outline-0 md:h-9 mt-2 ${
              isSelected
                ? "bg-green-600 text-white hover:bg-green-700"
                : isBagFull
                ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400 hover:text-gray-900"
                : ""
            }`}
            onClick={isSelected ? handleRemoveClick : handleAddClick}
            disabled={isBagFull && !isSelected}
            title={isSelected ? "Remove from Bag" : isBagFull ? "Bag Full" : "Add to Bag"}
          >
            <span className="flex-1">
              {isSelected ? "Remove" : isBagFull ? "Bag Full" : "Add"}
            </span>
            <span
              className={`grid h-7 w-7 place-items-center bg-gray-200 transition-colors duration-200 group-hover:bg-green-700 group-focus:bg-green-700 rounded-tr-md rounded-br-md md:h-9 md:w-9 ${
                isSelected ? "bg-green-700" : isBagFull ? "bg-gray-400 group-hover:bg-gray-400" : ""
              }`}
            >
              <svg
                className="h-4 w-4 stroke-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClubCard;