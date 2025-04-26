import React, { useState, useEffect } from 'react';
import { Club, ClubModel } from '../types/club';

interface SelectedClubsSidebarProps {
  selectedClubs: (Club & { image_path: string; handicapperLevel: string })[];
  onRemove: (clubId: number) => void;
  onAdd: (club: Club & { image_path: string; handicapperLevel: string }) => void;
  isPinned: boolean;
  onPinToggle: () => void;
  defaultOpen: boolean;
  clubsData: ClubModel[];
}

const SelectedClubsSidebar: React.FC<SelectedClubsSidebarProps> = ({
  selectedClubs,
  onRemove,
  onAdd,
  isPinned,
  onPinToggle,
  defaultOpen,
  clubsData,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [recommendationImageLoadingStates, setRecommendationImageLoadingStates] = useState<{ [key: string]: boolean }>({});

  // Update isOpen based on defaultOpen prop changes
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    console.log('Selected Clubs in Sidebar:', selectedClubs);
    selectedClubs.forEach(club => {
      console.log(`Club ID: ${club.id}, Image Path: /${club.image_path}, Name: ${club.brand} ${club.model}, Loft: ${club.loft || 'N/A'}, Handicapper Level: ${club.handicapperLevel}`);
    });
  }, [selectedClubs]);

  const totalPrice = selectedClubs.reduce((sum, club) => sum + club.price, 0);

  const getLoftValue = (loft: string | null): number => {
    if (!loft || loft === 'N/A') {
      console.log(`Invalid loft value: ${loft}`);
      return Infinity;
    }
    // Extract numeric part (e.g., "10.0 degrees" -> "10.0")
    const numericMatch = loft.match(/\d+(\.\d+)?/);
    if (!numericMatch) {
      console.log(`Failed to extract numeric loft from: ${loft}`);
      return Infinity;
    }
    const numericLoft = numericMatch[0]; // e.g., "10.0"
    const cleanedLoft = numericLoft.trim();
    const loftValue = parseFloat(cleanedLoft);
    if (isNaN(loftValue)) {
      console.log(`Failed to parse loft: ${loft}, Extracted: ${cleanedLoft}`);
      return Infinity;
    }
    return loftValue;
  };

  const sortedClubs = [...selectedClubs].sort((a: Club & { image_path: string; handicapperLevel: string }, b: Club & { image_path: string; handicapperLevel: string }) => {
    const order = ['Driver', 'Fairway Wood', 'Hybrid', 'Iron Set', 'Wedge', 'Putter'];
    const typeDiff = order.indexOf(a.type) - order.indexOf(b.type);
    if (typeDiff !== 0) return typeDiff;

    if (a.type === 'Fairway Wood' && b.type === 'Fairway Wood') {
      const fairwayOrder = ['3 Wood', '5 Wood', '7 Wood', '9 Wood', '11 Wood'];
      const aFairwayType = a.specificType ?? '';
      const bFairwayType = b.specificType ?? '';
      const aIndex = fairwayOrder.indexOf(aFairwayType);
      const bIndex = fairwayOrder.indexOf(bFairwayType);
      if (aIndex !== bIndex) return aIndex - bIndex;
    }

    if (a.type === 'Iron Set' && b.type === 'Iron Set') {
      const aSpecific = a.specificType ?? '';
      const bSpecific = b.specificType ?? '';
      const aNum = aSpecific.match(/\d+/) ? parseInt(aSpecific.match(/\d+/)![0]) : Infinity;
      const bNum = bSpecific.match(/\d+/) ? parseInt(bSpecific.match(/\d+/)![0]) : Infinity;
      if (aNum !== bNum) return aNum - bNum;
    }

    if (a.type === 'Wedge' && b.type === 'Wedge') {
      const wedgeOrder = ['Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge'];
      const aWedgeType = a.specificType ?? '';
      const bWedgeType = b.specificType ?? '';
      const aIndex = wedgeOrder.indexOf(aWedgeType);
      const bIndex = wedgeOrder.indexOf(bWedgeType);
      if (aIndex !== bIndex) return aIndex - bIndex;
    }

    return getLoftValue(a.loft) - getLoftValue(b.loft);
  });

  console.log('Sorted Clubs for Gapping Analysis:', sortedClubs.map(club => ({
    type: club.type,
    specificType: club.specificType ?? 'N/A',
    loft: club.loft ?? 'N/A',
    brand: club.brand,
    model: club.model,
    handicapperLevel: club.handicapperLevel,
  })));

  const gaps: { index: number; gap: number; recommendedLoft: number }[] = [];
  for (let i = 0; i < sortedClubs.length - 1; i++) {
    const currentClub = sortedClubs[i];
    const nextClub = sortedClubs[i + 1];

    if (currentClub.subType === 'Set' || nextClub.subType === 'Set') {
      console.log(`Skipping gap analysis between ${currentClub.type} and ${nextClub.type} due to Set`);
      continue;
    }

    const currentLoft = getLoftValue(currentClub.loft);
    const nextLoft = getLoftValue(nextClub.loft);
    console.log(
      `Analyzing gap between ${currentClub.type} (${currentClub.specificType ?? ''}) (Loft: ${currentClub.loft ?? 'N/A'}, Value: ${currentLoft}) and ${nextClub.type} (${nextClub.specificType ?? ''}) (Loft: ${nextClub.loft ?? 'N/A'}, Value: ${nextLoft})`
    );

    if (currentLoft === Infinity || nextLoft === Infinity) {
      console.log(`Skipping gap due to invalid loft values: ${currentLoft} or ${nextLoft}`);
      continue;
    }

    const gap = nextLoft - currentLoft;
    if (gap > 5) {
      console.log(`Found gap of ${gap.toFixed(1)}° between ${currentClub.type} and ${nextClub.type}`);
      gaps.push({
        index: i,
        gap,
        recommendedLoft: currentLoft + (gap / 2),
      });
    }
  }

  const existingLofts = sortedClubs
    .map(club => getLoftValue(club.loft))
    .filter(loft => loft !== Infinity);
  console.log('Existing Lofts in Bag:', existingLofts);

  const recommendations = gaps
    .map(gap => {
      const targetLoft = gap.recommendedLoft;
      console.log(`Looking for club to fill loft gap at ${targetLoft.toFixed(1)}°`);

      let potentialClubs = clubsData
        .flatMap((clubModel: ClubModel) => 
          clubModel.variants.map((variant: Club) => ({
            ...variant,
            type: clubModel.type,
            subType: clubModel.subType,
            specificType: clubModel.specificType,
            brand: clubModel.brand,
            model: clubModel.model,
            handicapperLevel: clubModel.handicapperLevel,
            image_path: `club_images/${clubModel.image}.jpg`, // Ensure image_path is set
          }))
        )
        .filter((club: Club & { image_path: string; handicapperLevel: string }) => {
          const currentClubType = sortedClubs[gap.index].type;
          const nextClubType = sortedClubs[gap.index + 1].type;
          if (currentClubType === 'Driver' && nextClubType === 'Fairway Wood') {
            return ['Fairway Wood', 'Hybrid'].includes(club.type);
          } else if (currentClubType === 'Fairway Wood' && nextClubType === 'Hybrid') {
            return ['Fairway Wood', 'Hybrid'].includes(club.type);
          } else if (currentClubType === 'Hybrid' && nextClubType === 'Iron Set') {
            return ['Hybrid', 'Iron Set'].includes(club.type);
          } else if (currentClubType === 'Iron Set' && nextClubType === 'Wedge') {
            return ['Iron Set', 'Wedge'].includes(club.type);
          } else if (currentClubType === 'Wedge' && nextClubType === 'Putter') {
            return ['Wedge'].includes(club.type);
          }
          return false;
        })
        .filter((club: Club & { image_path: string; handicapperLevel: string }) => {
          const loft = getLoftValue(club.loft);
          const withinNarrowRange = loft >= targetLoft - 2 && loft <= targetLoft + 2;
          const isDuplicateLoft = existingLofts.includes(loft);
          console.log(
            `Checking ${club.type} (${club.specificType ?? ''}) (${club.brand} ${club.model}, Loft: ${club.loft ?? 'N/A'}, Value: ${loft}) - Within Narrow Range (±2°): ${withinNarrowRange}, Is Duplicate Loft: ${isDuplicateLoft}`
          );
          return withinNarrowRange && !isDuplicateLoft;
        })
        .sort((a: Club & { image_path: string; handicapperLevel: string }, b: Club & { image_path: string; handicapperLevel: string }) => {
          const loftDiffA = Math.abs(getLoftValue(a.loft) - targetLoft);
          const loftDiffB = Math.abs(getLoftValue(b.loft) - targetLoft);
          return loftDiffA - loftDiffB;
        });

      let recommendedClub = potentialClubs[0];

      if (!recommendedClub) {
        console.log(`No club found within ±2° of ${targetLoft.toFixed(1)}°, expanding search to ±7°`);
        potentialClubs = clubsData
          .flatMap((clubModel: ClubModel) => 
            clubModel.variants.map((variant: Club) => ({
              ...variant,
              type: clubModel.type,
              subType: clubModel.subType,
              specificType: clubModel.specificType,
              brand: clubModel.brand,
              model: clubModel.model,
              handicapperLevel: clubModel.handicapperLevel,
              image_path: `club_images/${clubModel.image}.jpg`, // Ensure image_path is set
            }))
          )
          .filter((club: Club & { image_path: string; handicapperLevel: string }) => {
            const currentClubType = sortedClubs[gap.index].type;
            const nextClubType = sortedClubs[gap.index + 1].type;
            if (currentClubType === 'Driver' && nextClubType === 'Fairway Wood') {
              return ['Fairway Wood', 'Hybrid'].includes(club.type);
            } else if (currentClubType === 'Fairway Wood' && nextClubType === 'Hybrid') {
              return ['Fairway Wood', 'Hybrid'].includes(club.type);
            } else if (currentClubType === 'Hybrid' && nextClubType === 'Iron Set') {
              return ['Hybrid', 'Iron Set'].includes(club.type);
            } else if (currentClubType === 'Iron Set' && nextClubType === 'Wedge') {
              return ['Iron Set', 'Wedge'].includes(club.type);
            } else if (currentClubType === 'Wedge' && nextClubType === 'Putter') {
              return ['Wedge'].includes(club.type);
            }
            return false;
          })
          .filter((club: Club & { image_path: string; handicapperLevel: string }) => {
            const loft = getLoftValue(club.loft);
            const withinBroaderRange = loft >= targetLoft - 7 && loft <= targetLoft + 7;
            const isDuplicateLoft = existingLofts.includes(loft);
            console.log(
              `Checking ${club.type} (${club.specificType ?? ''}) (${club.brand} ${club.model}, Loft: ${club.loft ?? 'N/A'}, Value: ${loft}) - Within Broader Range (±7°): ${withinBroaderRange}, Is Duplicate Loft: ${isDuplicateLoft}`
            );
            return withinBroaderRange && !isDuplicateLoft;
          })
          .sort((a: Club & { image_path: string; handicapperLevel: string }, b: Club & { image_path: string; handicapperLevel: string }) => {
            const loftDiffA = Math.abs(getLoftValue(a.loft) - targetLoft);
            const loftDiffB = Math.abs(getLoftValue(b.loft) - targetLoft);
            return loftDiffA - loftDiffB;
          });

        recommendedClub = potentialClubs[0];
      }

      if (recommendedClub) {
        console.log(
          `Recommended: ${recommendedClub.type} (${recommendedClub.specificType ?? ''}) (${recommendedClub.brand} ${recommendedClub.model}, Loft: ${recommendedClub.loft ?? 'N/A'})`
        );
      } else {
        console.log(`No club found to fill loft gap at ${targetLoft.toFixed(1)}°, even within ±7°`);
      }
      return recommendedClub;
    })
    .filter((club): club is Club & { image_path: string; handicapperLevel: string } => 
      club != null && !selectedClubs.some(c => c.id === club.id));

  return (
    <div>
      {/* Ribbon on all screens */}
      <div
        className={`fixed top-1/2 right-0 transform -translate-y-1/2 w-10 h-32 bg-gray-200 text-gray-800 flex items-center justify-center cursor-pointer z-50 rounded-l-md shadow-md hover:scale-105 transition-all duration-300 ${
          isOpen ? "bg-green-600 text-white hover:bg-green-700" : "hover:bg-gray-300"
        } ${isPinned ? "right-[320px]" : ""}`}
        onClick={() => !isPinned && setIsOpen(!isOpen)}
      >
        <div className="transform -rotate-90 flex items-center space-x-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 3h2l1 2h13l-2 9H6L3 3zm3 12a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z"
            />
          </svg>
          <span className="text-sm font-medium whitespace-nowrap">
            Your Bag ({selectedClubs.length})
          </span>
        </div>
      </div>

      {/* Sidebar content */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-md transition-all duration-500 ease-in-out z-50 ${
          isOpen || isPinned
            ? "w-4/5 md:w-80 right-0 visibility-visible overflow-y-auto opacity-100"
            : "w-0 right-[-100%] visibility-hidden overflow-hidden opacity-0"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              className="text-gray-600 hover:text-gray-800"
              onClick={() => !isPinned && setIsOpen(false)}
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
            <button
              className="text-gray-600 hover:text-gray-800"
              onClick={onPinToggle}
            >
              {isPinned ? (
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 2a2 2 0 110 4 2 2 0 010-4zm0 4v14m-8-8h16"
                  />
                </svg>
              ) : (
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
                    d="M12 2a2 2 0 110 4 2 2 0 010-4zm0 4v14m-8-8h16"
                    transform="rotate(45 12 12)"
                  />
                </svg>
              )}
            </button>
          </div>
          {(isOpen || isPinned) && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Your Bag
                </h2>
                <div className="flex items-center">
                  <span className="text-gray-600">
                    {selectedClubs.length} Clubs
                  </span>
                  <span className="ml-2 text-green-600 font-semibold">
                    £{totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              {selectedClubs.length === 0 ? (
                <p className="text-gray-600 italic">
                  No clubs selected. Start building your bag!
                </p>
              ) : (
                <>
                  <ul className="space-y-4">
                    {sortedClubs.map((club) => (
                      <li
                        key={club.id}
                        className="flex items-center bg-gray-50 p-3 rounded-lg shadow-sm"
                      >
                        <div className="relative w-16 h-[2.67rem] mr-3">
                          {imageLoadingStates[club.id] !== false && (
                            <div className="absolute top-0 left-0 w-full h-full bg-gray-200 animate-pulse rounded-lg" />
                          )}
                          <img
                            src={`/${club.image_path}`}
                            alt={`${club.brand} ${club.model}`}
                            className="absolute top-0 left-0 w-full h-full object-cover rounded-lg max-w-[4rem] max-h-[2.67rem]"
                            onLoad={() =>
                              setImageLoadingStates(prev => ({
                                ...prev,
                                [club.id]: false,
                              }))
                            }
                            onError={(e) => {
                              console.error(`Failed to load image: /${club.image_path}`);
                              e.currentTarget.src = "https://via.placeholder.com/64x43?text=Image+Not+Found";
                              setImageLoadingStates(prev => ({
                                ...prev,
                                [club.id]: false,
                              }));
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {club.type}{' '}
                            {club.subType ? `(${club.subType})` : ''}{' '}
                            {club.specificType ? `- ${club.specificType}` : ''}:{' '}
                            {club.brand} {club.model}
                          </p>
                          <p className="text-sm text-gray-600">
                            Loft: {club.loft ?? 'N/A'}
                          </p>
                          {club.shaftMaterial && (
                            <p className="text-sm text-gray-600">
                              Shaft Material: {club.shaftMaterial}
                            </p>
                          )}
                          {club.setMakeup && (
                            <p className="text-sm text-gray-600">
                              Set Makeup: {club.setMakeup}
                            </p>
                          )}
                          {club.length && (
                            <p className="text-sm text-gray-600">
                              Length: {club.length}
                            </p>
                          )}
                          {club.bounce && (
                            <p className="text-sm text-gray-600">
                              Bounce: {club.bounce}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            Handicapper Level: {club.handicapperLevel}
                          </p>
                          <p className="text-sm text-green-600">
                            £{club.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          className="text-red-600 hover:text-red-800 transform hover:scale-110 transition"
                          onClick={() => onRemove(club.id)}
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      className="flex items-center justify-between w-full text-lg font-semibold text-gray-800"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                    >
                      <span>Gapping Suggestions</span>
                      <svg
                        className={`w-5 h-5 transform transition-transform ${
                          showSuggestions ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showSuggestions && (
                      <>
                        {gaps.length > 0 ? (
                          <>
                            <p className="text-base font-semibold text-red-600 flex items-center mt-2">
                              <svg
                                className="w-6 h-6 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Loft Gapping Issues:
                            </p>
                            {gaps.map((gap, i) => (
                              <p
                                key={i}
                                className="text-sm text-gray-600 mt-2"
                              >
                                Large gap ({gap.gap.toFixed(1)}°) between{' '}
                                {sortedClubs[gap.index].type}{' '}
                                {sortedClubs[gap.index].specificType
                                  ? `(${sortedClubs[gap.index].specificType})`
                                  : ''}{' '}
                                ({sortedClubs[gap.index].loft ?? 'N/A'}) and{' '}
                                {sortedClubs[gap.index + 1].type}{' '}
                                {sortedClubs[gap.index + 1].specificType
                                  ? `(${sortedClubs[gap.index + 1].specificType})`
                                  : ''}{' '}
                                ({sortedClubs[gap.index + 1].loft ?? 'N/A'}). Suggested loft to fill gap: {gap.recommendedLoft.toFixed(1)}°
                              </p>
                            ))}
                            {recommendations.length > 0 ? (
                              <>
                                <p className="text-base font-semibold text-gray-800 mt-4 flex items-center">
                                  <svg
                                    className="w-6 h-6 mr-2 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Recommendations:
                                </p>
                                {recommendations.map((club) => (
                                  <div
                                    key={club.id}
                                    className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded-lg"
                                  >
                                    <div className="flex items-center">
                                      <div className="relative w-12 h-[2rem] mr-2">
                                        {recommendationImageLoadingStates[club.id] !== false && (
                                          <div className="absolute top-0 left-0 w-full h-full bg-gray-200 animate-pulse rounded-lg" />
                                        )}
                                        <img
                                          src={`/${club.image_path}`} // Use the constructed image_path
                                          alt={`${club.brand} ${club.model}`}
                                          className="absolute top-0 left-0 w-full h-full object-cover rounded-lg max-w-[3rem] max-h-[2rem]"
                                          onLoad={() =>
                                            setRecommendationImageLoadingStates(prev => ({
                                              ...prev,
                                              [club.id]: false,
                                            }))
                                          }
                                          onError={(e) => {
                                            console.error(`Failed to load image: /${club.image_path}`);
                                            e.currentTarget.src = "https://via.placeholder.com/48x32?text=Image+Not+Found";
                                            setRecommendationImageLoadingStates(prev => ({
                                              ...prev,
                                              [club.id]: false,
                                            }));
                                          }}
                                        />
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {club.type}{' '}
                                        {club.subType ? `(${club.subType})` : ''}:{' '}
                                        {club.brand} {club.model} ({club.loft ?? 'N/A'})
                                      </p>
                                    </div>
                                    <button
                                      className="text-green-600 hover:text-green-800 transform hover:scale-110 transition"
                                      onClick={() => onAdd(club)}
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
                                ))}
                              </>
                            ) : (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                No suitable clubs found to fill the loft gap. Consider a club with a loft around {gaps[0]?.recommendedLoft.toFixed(1)}°.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            No significant loft gaps detected.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedClubsSidebar;