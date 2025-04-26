import { useState, useEffect, useMemo } from "react";
import axios from 'axios';
import ClubCard from "./components/ClubCard";
import ClubDetailModal from "./components/ClubDetailModal";
import SelectedClubsSidebar from "./components/SelectedClubsSidebar";
import MyClubsModal from "./components/MyClubsModal";
import { Club, ClubModel } from "./types/club";
import grassBg from "./assets/grass_bg_1920x1080_png.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import debounce from "lodash/debounce";

// Define the structure of the API response
interface ClubsData {
  clubs: ClubModel[];
}

// Define types for the categories array
interface SubSubItem {
  name: string;
  filter: string;
}

interface SubItem {
  name: string;
  filter: string;
  subSubItems?: SubSubItem[];
}

interface Category {
  name: string;
  icon: string;
  subItems?: SubItem[];
}

const categories: Category[] = [
  {
    name: "All",
    icon: "M12 2L2 22h20L12 2z",
    subItems: [],
  },
  {
    name: "Driver",
    icon: "M12 2L15 8H9L12 2Z M12 22L9 16H15L12 22Z",
    subItems: [],
  },
  {
    name: "Fairway Wood",
    icon: "M12 4C8.69 4 6 6.69 6 10C6 13.31 8.69 16 12 16C15.31 16 18 13.31 18 10C18 6.69 15.31 4 12 4Z",
    subItems: [
      { name: "3 Wood", filter: "3 Wood" },
      { name: "5 Wood", filter: "5 Wood" },
      { name: "7 Wood", filter: "7 Wood" },
      { name: "9 Wood", filter: "9 Wood" },
      { name: "11 Wood", filter: "11 Wood" },
    ],
  },
  {
    name: "Hybrid",
    icon: "M6 8H18V12H6V8Z",
    subItems: [
      { name: "2-Hybrid", filter: "17 degrees" },
      { name: "3-Hybrid", filter: "19 degrees" },
      { name: "4-Hybrid", filter: "22 degrees" },
      { name: "5-Hybrid", filter: "26 degrees" },
      { name: "6-Hybrid", filter: "30 degrees" },
      { name: "Utility Irons", filter: "Utility Iron" },
    ],
  },
  {
    name: "Iron Set",
    icon: "M6 6L18 18M6 18L18 6",
    subItems: [
      { name: "Sets", filter: "Set" },
      {
        name: "Individual Irons",
        filter: "Individual",
        subSubItems: [
          { name: "3 Iron", filter: "3 Iron" },
          { name: "4 Iron", filter: "4 Iron" },
          { name: "5 Iron", filter: "5 Iron" },
          { name: "6 Iron", filter: "6 Iron" },
          { name: "7 Iron", filter: "7 Iron" },
          { name: "8 Iron", filter: "8 Iron" },
          { name: "9 Iron", filter: "9 Iron" },
          { name: "Pitching Wedge", filter: "Pitching Wedge" },
        ],
      },
    ],
  },
  {
    name: "Wedge",
    icon: "M12 6L8 18H16L12 6Z",
    subItems: [
      { name: "Pitching Wedge", filter: "Pitching Wedge" },
      { name: "Gap Wedge", filter: "Gap Wedge" },
      { name: "Sand Wedge", filter: "Sand Wedge" },
      { name: "Lob Wedge", filter: "Lob Wedge" },
    ],
  },
  {
    name: "Putter",
    icon: "M12 6V18M10 18H14",
    subItems: [],
  },
];

const App: React.FC = () => {
  const [clubsData, setClubsData] = useState<ClubsData>({ clubs: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  const [selectedSubSubItem, setSelectedSubSubItem] = useState<string | null>(null);
  const [selectedClubModel, setSelectedClubModel] = useState<ClubModel | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Club | null>(null);
  const [selectedClubs, setSelectedClubs] = useState<(Club & { image_path: string; handicapperlevel: string })[]>([]);
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isBagPinned, setIsBagPinned] = useState<boolean>(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('default');
  const [filterHandedness, setFilterHandedness] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterHandicapperLevel, setFilterHandicapperLevel] = useState<string>('');
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  const [isSortFilterOpen, setIsSortFilterOpen] = useState<boolean>(true);
  const [showStickySearchBar, setShowStickySearchBar] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const pageSizeOptions = [25, 50, 75, 100];
  const [isMyClubsModalOpen, setIsMyClubsModalOpen] = useState<boolean>(false);
  const [myClubsLofts, setMyClubsLofts] = useState<number[]>([]);
  const [recommendedLofts, setRecommendedLofts] = useState<number[]>([]);
  const [filterByMyClubsGaps, setFilterByMyClubsGaps] = useState<boolean>(false);
  const [isBagSidebarOpen, setIsBagSidebarOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Fetch club data from API on mount
  useEffect(() => {
    const fetchClubs = async () => {
      console.log('Starting API fetch to /api/clubs...');
      try {
        const response = await axios.get('/api/clubs');
        console.log('API Response:', response.data);
        setClubsData(response.data);
        console.log('Clubs Data Set:', response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching clubs:', err);
        setError('Failed to load club data. Please try again later.');
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);
  useEffect(() => {
    console.log("clubsData after fetch:", clubsData);
  }, [clubsData]);
  // Load lofts from local storage on mount
  useEffect(() => {
    const savedLofts = localStorage.getItem('myClubsLofts');
    if (savedLofts) {
      const parsedLofts = JSON.parse(savedLofts);
      setMyClubsLofts(parsedLofts);
      calculateRecommendedLofts(parsedLofts);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const debouncedSetSearch = debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300);
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery]);

  // Detect mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll listener to show/hide sticky search bar
  useEffect(() => {
    const handleScroll = () => {
      const banner = document.getElementById('banner');
      if (banner) {
        const bannerBottom = banner.getBoundingClientRect().bottom;
        const headerHeight = document.querySelector('header')?.offsetHeight || 64;
        const shouldShow = bannerBottom <= headerHeight;
        console.log('Scroll Debug:', { bannerBottom, headerHeight, shouldShow });
        setShowStickySearchBar(shouldShow);
      } else {
        console.log('Banner element not found');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debug sidebar states
  useEffect(() => {
    console.log('Sidebar States:', { isCategorySidebarOpen, isBagSidebarOpen, isMobile });
  }, [isCategorySidebarOpen, isBagSidebarOpen, isMobile]);

  // Reset current page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubItem, selectedSubSubItem, debouncedSearchQuery, filterHandedness, filterBrand, filterHandicapperLevel, filterPriceMin, filterPriceMax, sortOption, filterByMyClubsGaps]);

  // Extract unique brands for filter dropdown
  const brandOptions = useMemo(() => {
    const brandSet = new Set<string>();
    clubsData.clubs.forEach(clubModel => {
      if (clubModel.brand) {
        brandSet.add(clubModel.brand);
      }
    });
    return Array.from(brandSet).sort();
  }, [clubsData.clubs]);

  // Extract unique handicapper levels for filter buttons
  const handicapperlevelOptions = useMemo(() => {
    const levelSet = new Set<string>();
    clubsData.clubs.forEach(clubModel => {
      if (clubModel.handicapperlevel) {
        levelSet.add(clubModel.handicapperlevel);
      }
    });
    return Array.from(levelSet).sort();
  }, [clubsData.clubs]);

  // Function to calculate recommended lofts based on user-input lofts
  const calculateRecommendedLofts = (lofts: number[]) => {
    const sortedLofts = [...lofts].sort((a, b) => a - b).filter(loft => !isNaN(loft) && loft !== Infinity);
    const loftGaps: { gap: number; recommendedLoft: number }[] = [];
    for (let i = 0; i < sortedLofts.length - 1; i++) {
      const currentLoft = sortedLofts[i];
      const nextLoft = sortedLofts[i + 1];
      const gap = nextLoft - currentLoft;
      if (gap > 5) {
        loftGaps.push({
          gap,
          recommendedLoft: currentLoft + (gap / 2),
        });
      }
    }
    setRecommendedLofts(loftGaps.map(gap => gap.recommendedLoft));
  };

  // Filter and sort club models
  const filteredClubModels: ClubModel[] = useMemo(() => {
    console.log("Filtering clubs with:", {
      selectedCategory,
      selectedSubItem,
      selectedSubSubItem,
      debouncedSearchQuery,
      filterHandedness,
      filterBrand,
      filterHandicapperLevel,
      filterPriceMin,
      filterPriceMax,
      sortOption,
      filterByMyClubsGaps,
      recommendedLofts,
    });

    if (loading || !clubsData.clubs || !Array.isArray(clubsData.clubs)) {
      console.log("Skipping filtering: Data not ready", { loading, clubs: clubsData.clubs });
      return [];
    }

    console.log("Total clubs before filtering:", clubsData.clubs.length);

    return clubsData.clubs
      .filter(clubModel => {
        // Use `type` to match `selectedCategory`
        const matchesCategory = selectedCategory === "All" || clubModel.type === selectedCategory;

        // Sub-item filtering
        const matchesSubItem = selectedSubItem
          ? selectedCategory === "Hybrid"
            ? selectedSubItem === "Utility Iron"
              ? clubModel.specifictype === "Utility Iron"
              : clubModel.variants.length > 0 && parseFloat(clubModel.variants[0].loft?.replace('°', '') || '0') === parseFloat(selectedSubItem.split(" ")[0])
            : selectedCategory === "Fairway Wood"
              ? clubModel.variants.length > 0 && clubModel.variants[0].loft === selectedSubItem // Adjust below
              : selectedCategory === "Wedge"
                ? clubModel.specifictype === selectedSubItem // e.g., "Gap Wedge"
                : selectedCategory === "Iron Set"
                  ? selectedSubSubItem
                    ? clubModel.subtype === "Individual" && clubModel.specifictype === selectedSubSubItem
                    : clubModel.subtype === selectedSubItem
                  : true
          : true;

        const matchesSubSubItem = selectedSubSubItem && selectedCategory !== "Iron Set"
          ? clubModel.specifictype === selectedSubSubItem
          : true;

        const matchesSearch = debouncedSearchQuery
          ? clubModel.brand.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          clubModel.model.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          clubModel.type.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
          : true;

        const matchesHandedness = filterHandedness
          ? clubModel.variants.length > 0 && clubModel.variants.some(variant => {
            const handednessMatch = variant.description?.match(/Handedness: (Right-Handed|Left-Handed)/i);
            return handednessMatch && handednessMatch[1] === filterHandedness;
          })
          : true;

        const matchesBrand = filterBrand
          ? clubModel.brand === filterBrand
          : true;

        const matchesHandicapperLevel = filterHandicapperLevel
          ? clubModel.handicapperlevel === filterHandicapperLevel
          : true;

        const price = clubModel.variants.length > 0 ? clubModel.variants[0].price : 0;
        const minPrice = filterPriceMin ? parseFloat(filterPriceMin) : 0;
        const maxPrice = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
        const matchesPriceRange = price >= minPrice && price <= maxPrice;

        const matchesMyClubsGaps = filterByMyClubsGaps && recommendedLofts.length > 0
          ? clubModel.variants.length > 0 && clubModel.variants.some(variant => {
            const loft = parseFloat(variant.loft?.replace('°', '') || '0');
            return recommendedLofts.some(recommendedLoft => loft >= recommendedLoft - 2 && loft <= recommendedLoft + 2);
          })
          : true;

        const result = matchesCategory && matchesSubItem && matchesSubSubItem && matchesSearch && matchesHandedness && matchesBrand && matchesHandicapperLevel && matchesPriceRange && matchesMyClubsGaps;

        return result;
      })
      .sort((a, b) => {
        const priceA = a.variants.length > 0 ? a.variants[0].price : 0;
        const priceB = b.variants.length > 0 ? b.variants[0].price : 0;
        const loftA = a.variants.length > 0 ? a.variants[0].loft : null;
        const loftB = b.variants.length > 0 ? b.variants[0].loft : null;

        if (sortOption === 'price-asc') {
          return priceA - priceB;
        } else if (sortOption === 'price-desc') {
          return priceB - priceA;
        } else if (sortOption === 'brand') {
          return a.brand.localeCompare(b.brand);
        } else if (sortOption === 'loft') {
          const getLoftValue = (loft: string | null): number => {
            if (!loft || loft === 'N/A') return Infinity;
            const cleanedLoft = loft.replace('°', '').replace(' degrees', '').replace('degree', '').trim();
            return parseFloat(cleanedLoft) || Infinity;
          };
          return getLoftValue(loftA) - getLoftValue(loftB);
        }
        return 0;
      });
  }, [selectedCategory, selectedSubItem, selectedSubSubItem, debouncedSearchQuery, filterHandedness, filterBrand, filterHandicapperLevel, filterPriceMin, filterPriceMax, sortOption, filterByMyClubsGaps, recommendedLofts, clubsData.clubs, loading]);  // Pagination logic
  const totalItems = filteredClubModels.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClubModels = filteredClubModels.slice(startIndex, endIndex);

  // Calculate the range of page numbers to display
  const maxPagesToShow = 5;
  const pageRange = [];
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  for (let i = startPage; i <= endPage; i++) {
    pageRange.push(i);
  }

  const adjustedStartPage = endPage === totalPages ? Math.max(1, endPage - maxPagesToShow + 1) : startPage;

  console.log("Filtered Clubs:", filteredClubModels);
  console.log("Paginated Clubs:", paginatedClubModels, `Page ${currentPage} of ${totalPages}`);

  const handleAddToBag = (club: Club & { image_path?: string; handicapperlevel: string }) => {
    if (selectedClubs.length >= 14) {
      toast.error("Cannot add more than 14 clubs to the bag.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    if (!selectedClubs.some(c => c.id === club.id)) {
      const clubWithImage: Club & { image_path: string; handicapperlevel: string } = {
        ...club,
        image_path: club.image_path ?? (
          filteredClubModels.find(cm =>
            cm.brand === club.brand && cm.model === club.model
          )?.image ? `club_images/${filteredClubModels.find(cm => cm.brand === club.brand && cm.model === club.model)!.image}.jpg` : "driver_images/placeholder.jpg"
        ),
      };
      setSelectedClubs([...selectedClubs, clubWithImage]);
      toast.success(`${club.brand} ${club.model} added to your bag!`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleRemoveFromBag = (clubId: number) => {
    const club = selectedClubs.find(c => c.id === clubId);
    setSelectedClubs(selectedClubs.filter(c => c.id !== clubId));
    if (club) {
      toast.info(`${club.brand} ${club.model} removed from your bag.`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleReplaceClub = (oldClubId: number, newClub: Club & { image_path?: string; handicapperlevel: string }) => {
    const oldClub = selectedClubs.find(c => c.id === oldClubId);
    if (!oldClub) return;

    setSelectedClubs(selectedClubs.filter(c => c.id !== oldClubId));

    const clubWithImage: Club & { image_path: string; handicapperlevel: string } = {
      ...newClub,
      image_path: newClub.image_path ?? (
        filteredClubModels.find(cm =>
          cm.brand === newClub.brand && cm.model === newClub.model
        )?.image ? `club_images/${filteredClubModels.find(cm => cm.brand === newClub.brand && cm.model === newClub.model)!.image}.jpg` : "driver_images/placeholder.jpg"
      ),
    };
    setSelectedClubs([...selectedClubs.filter(c => c.id !== oldClubId), clubWithImage]);

    toast.success(`${newClub.brand} ${newClub.model} replaced in your bag!`, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleViewDetails = (clubModel: ClubModel, variant: Club) => {
    console.log("Setting selectedClubModel:", clubModel);
    console.log("Setting selectedVariant:", variant);
    setSelectedClubModel(clubModel);
    setSelectedVariant(variant);
  };

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const selectCategory = (categoryName: string) => {
    console.log("Selecting category:", categoryName, "Resetting sub-items...");
    setSelectedCategory(categoryName);
    setSelectedSubItem(null);
    setSelectedSubSubItem(null);
    setIsCategorySidebarOpen(false);
  };

  const selectSubItem = (categoryName: string, subItemFilter: string) => {
    console.log("Selecting sub-item:", subItemFilter, "for category:", categoryName);
    setSelectedCategory(categoryName);
    setSelectedSubItem(subItemFilter);
    setSelectedSubSubItem(null);
  };

  const selectSubSubItem = (categoryName: string, subItemFilter: string, subSubItemFilter: string) => {
    console.log("Selecting sub-sub-item:", subSubItemFilter, "for sub-item:", subItemFilter, "in category:", categoryName);
    setSelectedCategory(categoryName);
    setSelectedSubItem(subItemFilter);
    setSelectedSubSubItem(subSubItemFilter);
  };

  const handleSaveMyClubsLofts = (lofts: number[]) => {
    setMyClubsLofts(lofts);
    localStorage.setItem('myClubsLofts', JSON.stringify(lofts));
    calculateRecommendedLofts(lofts);
  };

  const totalPrice = selectedClubs.reduce((sum, club) => sum + club.price, 0);

  if (loading) {
    return <div className="text-center py-10">Loading clubs...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <header className="flex bg-gray-100 transition-colors duration-150 top-0 z-50 w-full sticky py-4 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Golf Bag Builder
            </h1>
            <button
              onClick={() => setIsMyClubsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              My Clubs
            </button>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-gray-800">
              Clubs
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-800">
              Shops
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-800">
              Offers
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-gray-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-gray-600">
                {selectedClubs.length} Clubs
              </span>
              <span className="ml-2 text-green-600 font-semibold">
                £{totalPrice.toFixed(2)}
              </span>
            </div>
            <button
              className="md:hidden text-gray-600 hover:text-gray-800"
              onClick={() => setIsCategorySidebarOpen(!isCategorySidebarOpen)}
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className="relative">
        <div
          className="relative min-h-[calc(100vh-64px)] flex w-full flex-col items-center justify-center p-5 text-center md:px-20 lg:space-y-10"
          id="banner"
        >
          <img
            alt="Golf Bag Builder Background"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw"
            src={grassBg}
            className="h-full w-full object-cover object-position-bottom"
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              inset: "0px",
              color: "transparent",
            }}
          />
          <div className="relative flex w-full flex-col items-center justify-center p-5 text-center md:px-20 lg:space-y-10">
            <h1 className="text-2xl lg:text-5xl font-extrabold text-gray-800">
              Build Your Perfect Golf Bag
            </h1>
            <p className="text-base lg:text-2xl text-gray-600">
              Select from a wide range of premium clubs
            </p>
            <div className="w-full max-w-md mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your club from here"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                <button
                  className="absolute right-0 top-0 h-full px-4 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-colors"
                  onClick={() => setSearchQuery(searchQuery)}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
          <nav
            className={`w-full md:w-64 bg-white md:h-[calc(100vh-64px)] md:sticky md:top-[64px] p-6 shadow-md flex-shrink-0 md:block overflow-y-auto z-50 ${isCategorySidebarOpen ? "block" : "hidden md:block"
              }`}
          >
            <ul className="mb-6">
              {categories.map(category => (
                <li key={category.name} className="mb-2">
                  <div className="flex items-center justify-between">
                    <button
                      className={`flex-1 text-left py-2 px-4 rounded-lg flex items-center transition ${selectedCategory === category.name
                        ? "bg-gray-200 text-gray-800 font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                      onClick={() => selectCategory(category.name)}
                    >
                      <svg
                        className="w-5 h-5 mr-2 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d={category.icon}
                        />
                      </svg>
                      {category.name}
                    </button>
                    {category.subItems && category.subItems.length > 0 && (
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="p-2"
                      >
                        <svg
                          className={`w-4 h-4 transform transition-transform ${openCategories.includes(category.name) ? "rotate-180" : ""
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
                    )}
                  </div>
                  {openCategories.includes(category.name) && category.subItems && category.subItems.length > 0 && (
                    <ul className="ml-6 mt-1">
                      {category.subItems.map(subItem => (
                        <li key={subItem.name}>
                          <div className="flex items-center justify-between">
                            <button
                              className={`flex-1 text-left py-1 px-4 rounded-lg flex items-center transition ${selectedSubItem === subItem.filter
                                ? "bg-gray-200 text-gray-800 font-semibold"
                                : "text-gray-600 hover:bg-gray-100"
                                }`}
                              onClick={() => selectSubItem(category.name, subItem.filter)}
                            >
                              <span>{subItem.name}</span>
                            </button>
                            {subItem.subSubItems && subItem.subSubItems.length > 0 && (
                              <button
                                onClick={() => toggleCategory(`${category.name}-${subItem.name}`)}
                                className="p-2"
                              >
                                <svg
                                  className={`w-4 h-4 transform transition-transform ${openCategories.includes(`${category.name}-${subItem.name}`)
                                    ? "rotate-180"
                                    : ""
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
                            )}
                          </div>
                          {subItem.subSubItems && openCategories.includes(`${category.name}-${subItem.name}`) && (
                            <ul className="ml-6 mt-1">
                              {subItem.subSubItems.map(subSubItem => (
                                <li key={subSubItem.name}>
                                  <button
                                    className={`w-full text-left py-1 px-4 rounded-lg flex items-center transition ${selectedSubSubItem === subSubItem.filter
                                      ? "bg-gray-200 text-gray-800 font-semibold"
                                      : "text-gray-600 hover:bg-gray-100"
                                      }`}
                                    onClick={() =>
                                      selectSubSubItem(category.name, subItem.filter, subSubItem.filter)
                                    }
                                  >
                                    {subSubItem.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Sort & Filter</h3>
                <button
                  onClick={() => setIsSortFilterOpen(!isSortFilterOpen)}
                  className="p-2"
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${isSortFilterOpen ? "rotate-180" : ""
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
              </div>
              {isSortFilterOpen && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors md:text-sm"
                    >
                      <option value="default">Default</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="brand">Brand (A-Z)</option>
                      <option value="loft">Loft (Low to High)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select
                      value={filterBrand}
                      onChange={(e) => setFilterBrand(e.target.value)}
                      className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors md:text-sm"
                    >
                      <option value="">All Brands</option>
                      {brandOptions.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Handedness</label>
                    <div className="flex gap-2">
                      <button
                        className={`flex-1 py-3 px-4 rounded-md text-base font-medium transition-colors ${filterHandedness === "Right-Handed"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          } md:text-sm`}
                        onClick={() => setFilterHandedness(filterHandedness === "Right-Handed" ? "" : "Right-Handed")}
                      >
                        Right-Handed
                      </button>
                      <button
                        className={`flex-1 py-3 px-4 rounded-md text-base font-medium transition-colors ${filterHandedness === "Left-Handed"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          } md:text-sm`}
                        onClick={() => setFilterHandedness(filterHandedness === "Left-Handed" ? "" : "Left-Handed")}
                      >
                        Left-Handed
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Handicapper Level</label>
                    <div className="flex gap-2 flex-wrap">
                      {handicapperlevelOptions.map(level => (
                        <button
                          key={level}
                          className={`flex-1 py-3 px-4 rounded-md text-base font-medium transition-colors ${filterHandicapperLevel === level
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            } md:text-sm`}
                          onClick={() => setFilterHandicapperLevel(filterHandicapperLevel === level ? "" : level)}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterPriceMin}
                        onChange={(e) => setFilterPriceMin(e.target.value)}
                        className="block w-full pl-4 pr-4 py-3 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 rounded-md md:text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterPriceMax}
                        onChange={(e) => setFilterPriceMax(e.target.value)}
                        className="block w-full pl-4 pr-4 py-3 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 rounded-md md:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by My Clubs Gaps</label>
                    <button
                      onClick={() => setFilterByMyClubsGaps(!filterByMyClubsGaps)}
                      disabled={recommendedLofts.length === 0}
                      className={`w-full py-3 px-4 rounded-md text-base font-medium transition-colors ${recommendedLofts.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : filterByMyClubsGaps
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        } md:text-sm`}
                    >
                      {recommendedLofts.length === 0
                        ? "No Lofts Entered"
                        : filterByMyClubsGaps
                          ? "Filtering by Gaps"
                          : "Filter by Gaps"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSortOption('default');
                      setFilterHandedness('');
                      setFilterBrand('');
                      setFilterHandicapperLevel('');
                      setFilterPriceMin('');
                      setFilterPriceMax('');
                      setFilterByMyClubsGaps(false);
                    }}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-base md:text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </nav>
          <main
            className={`flex-1 p-6 transition-all duration-300 ${isBagPinned ? 'md:mr-80' : ''
              }`}
          >
            <div className="max-w-7xl mx-auto px-4">
              {/* Page Size Selector and Sticky Search Bar */}
              <div className="mb-6">
                <div className={`flex flex-col sm:flex-row sm:items-center sm:gap-4 ${showStickySearchBar && (!isMobile || (!isCategorySidebarOpen && !isBagSidebarOpen)) ? 'fixed top-[64px] bg-gray-100 z-40 shadow-sm py-2 px-4 w-full md:w-[calc(100%-256px)] md:left-[256px] md:max-w-7xl md:mx-auto' : ''}`}>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Items per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-full shadow-sm text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:bg-gray-50"
                    >
                      {pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  {showStickySearchBar && (!isMobile || (!isCategorySidebarOpen && !isBagSidebarOpen)) && (
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search clubs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                      />
                      <button
                        className="absolute right-0 top-0 h-full px-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-colors"
                        onClick={() => setSearchQuery(searchQuery)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems} clubs
                  </p>
                </div>
                {/* Add padding to prevent content from being hidden behind the fixed search bar */}
                {showStickySearchBar && (!isMobile || (!isCategorySidebarOpen && !isBagSidebarOpen)) && (
                  <div className="h-[72px]"></div>
                )}
              </div>

              {/* Club List */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-6">     
                  {paginatedClubModels.length > 0 ? (
                  paginatedClubModels.map(clubModel => {
                    if (!clubModel.variants || clubModel.variants.length === 0) {
                      console.warn(`No variants found for ${clubModel.brand} ${clubModel.model}`);
                      return null;
                    }
                    const club = {
                      ...clubModel.variants[0],
                      type: clubModel.type,
                      subtype: clubModel.subtype,
                      specifictype: clubModel.specifictype,
                      brand: clubModel.brand,
                      model: clubModel.model,
                      handicapperlevel: clubModel.handicapperlevel,
                    };
                    return (
                      <ClubCard
                        key={`${clubModel.brand}-${clubModel.model}`}
                        club={club}
                        clubModel={clubModel} // Pass the full ClubModel
                        isSelected={selectedClubs.some(c => c.id === clubModel.variants[0].id)}
                        onSelect={() => handleAddToBag(club)}
                        onDeselect={() => handleRemoveFromBag(clubModel.variants[0].id)}
                        onViewDetails={() => handleViewDetails(clubModel, clubModel.variants[0])}
                        isBagFull={selectedClubs.length >= 14}
                        imageSrc={`/club_images/${clubModel.image}.jpg`}
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-600 italic col-span-full">
                    No clubs available.
                  </p>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <nav className="inline-flex items-center gap-1 bg-white p-2 rounded-full shadow-sm border border-gray-200">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${currentPage === 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {adjustedStartPage > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-700 transition-all duration-200"
                        >
                          1
                        </button>
                        {adjustedStartPage > 2 && (
                          <span className="text-sm text-gray-500 px-2">...</span>
                        )}
                      </>
                    )}

                    {pageRange.map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${currentPage === page
                          ? "bg-green-600 text-white shadow-inner"
                          : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    {endPage < totalPages && (
                      <>
                        {endPage < totalPages - 1 && (
                          <span className="text-sm text-gray-500 px-2">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-700 transition-all duration-200"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </main>
        </div>
        <SelectedClubsSidebar
          selectedClubs={selectedClubs}
          onRemove={handleRemoveFromBag}
          onAdd={handleAddToBag}
          isPinned={isBagPinned}
          onPinToggle={() => setIsBagPinned(!isBagPinned)}
          onOpenChange={setIsBagSidebarOpen}
          defaultOpen={selectedClubs.length > 0 || isBagPinned}
          clubsData={clubsData.clubs}
        />
      </div>
      <ClubDetailModal
        clubModel={selectedClubModel}
        variant={selectedVariant}
        selectedClubs={selectedClubs}
        imageSrc={selectedClubModel ? `/club_images/${selectedClubModel.image}.jpg` : "https://via.placeholder.com/300x200?text=Golf+Club"}
        onClose={() => {
          setSelectedClubModel(null);
          setSelectedVariant(null);
        }}
        onAddToBag={handleAddToBag}
        onRemove={handleRemoveFromBag}
        onReplace={handleReplaceClub}
        onSelectVariant={(variant) => setSelectedVariant(variant)}
        isSelected={selectedVariant ? selectedClubs.some(c => c.id === selectedVariant.id) : false}
        isBagFull={selectedClubs.length >= 14}
      />
      <MyClubsModal
        isOpen={isMyClubsModalOpen}
        onClose={() => setIsMyClubsModalOpen(false)}
        onSave={handleSaveMyClubsLofts}
        initialLofts={myClubsLofts}
      />
    </div>
  );
};

export default App;