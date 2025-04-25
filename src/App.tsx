import { useState, useEffect, useMemo } from "react";
import ClubCard from "./components/ClubCard";
import ClubDetailModal from "./components/ClubDetailModal";
import SelectedClubsSidebar from "./components/SelectedClubsSidebar";
import clubsData from "./data/clubs.json";
import { Club, ClubModel } from "./types/club";
import grassBg from "./assets/grass_bg_1920x1080_png.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import debounce from "lodash/debounce";

// Define the structure of the JSON data
interface ClubsData {
  clubs: ClubModel[];
}

// Cast the imported JSON to the correct type
const typedClubsData = clubsData as unknown as ClubsData;

// Debug: Log the loaded data
console.log("Clubs Data:", typedClubsData.clubs);

const categories = [
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
  const [selectedCategory, setSelectedCategory] = useState<string>("Driver");
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  const [selectedSubSubItem, setSelectedSubSubItem] = useState<string | null>(null);
  const [selectedClubModel, setSelectedClubModel] = useState<ClubModel | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Club | null>(null);
  const [selectedClubs, setSelectedClubs] = useState<(Club & { image_path: string })[]>([]);
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isBagPinned, setIsBagPinned] = useState<boolean>(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  // State for sorting and additional filters
  const [sortOption, setSortOption] = useState<string>('default');
  const [filterHandedness, setFilterHandedness] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  // State for sidebar "Sort & Filter" section
  const [isSortFilterOpen, setIsSortFilterOpen] = useState<boolean>(true);
  // State for search bar visibility in top nav
  const [showSearchInTopNav, setShowSearchInTopNav] = useState<boolean>(false);
  // State for toggling search bar on mobile
  const [isSearchBarOpen, setIsSearchBarOpen] = useState<boolean>(false);

  // Debounce search query
  useEffect(() => {
    const debouncedSetSearch = debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300);
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery]);

  // Scroll listener to show/hide search bar in top nav
  useEffect(() => {
    const handleScroll = () => {
      const banner = document.getElementById('banner');
      if (banner) {
        const bannerBottom = banner.getBoundingClientRect().bottom;
        setShowSearchInTopNav(bannerBottom < 64); // 64px is the header height
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extract unique handedness values for filter dropdown
  const handednessOptions = useMemo(() => {
    const handednessSet = new Set<string>();
    typedClubsData.clubs.forEach(clubModel => {
      clubModel.variants.forEach(variant => {
        const handednessMatch = variant.description.match(/Handedness: (Right-Handed|Left-Handed)/i);
        if (handednessMatch) {
          handednessSet.add(handednessMatch[1]);
        }
      });
    });
    return Array.from(handednessSet).sort();
  }, []);

  // Extract unique brands for filter dropdown
  const brandOptions = useMemo(() => {
    const brandSet = new Set<string>();
    typedClubsData.clubs.forEach(clubModel => {
      if (clubModel.brand) {
        brandSet.add(clubModel.brand);
      }
    });
    return Array.from(brandSet).sort();
  }, []);

  // Filter and sort club models
  const filteredClubModels: ClubModel[] = useMemo(() => {
    return typedClubsData.clubs
      .filter(clubModel => {
        const matchesCategory = clubModel.type === selectedCategory;

        const matchesSubItem = selectedSubItem
          ? selectedCategory === "Hybrid"
            ? clubModel.variants.some(variant => 
                variant.loft === selectedSubItem || variant.loft === `${parseFloat(selectedSubItem.split(" ")[0])} degrees`
              )
            : selectedCategory === "Iron Set"
            ? selectedSubSubItem
              ? clubModel.subType === "Individual" && clubModel.specificType?.toLowerCase() === selectedSubSubItem.toLowerCase()
              : clubModel.subType === selectedSubItem
            : clubModel.specificType?.toLowerCase() === selectedSubItem.toLowerCase()
          : true;

        const matchesSubSubItem = selectedSubSubItem && selectedCategory !== "Iron Set"
          ? clubModel.specificType?.toLowerCase() === selectedSubSubItem.toLowerCase()
          : true;

        const matchesSearch = debouncedSearchQuery
          ? clubModel.brand.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            clubModel.model.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            clubModel.type.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
          : true;

        // Additional filters
        const matchesHandedness = filterHandedness
          ? clubModel.variants.some(variant => {
              const handednessMatch = variant.description.match(/Handedness: (Right-Handed|Left-Handed)/i);
              return handednessMatch && handednessMatch[1] === filterHandedness;
            })
          : true;

        const matchesBrand = filterBrand
          ? clubModel.brand === filterBrand
          : true;

        const price = clubModel.variants[0].price;
        const minPrice = filterPriceMin ? parseFloat(filterPriceMin) : 0;
        const maxPrice = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
        const matchesPriceRange = price >= minPrice && price <= maxPrice;

        return matchesCategory && matchesSubItem && matchesSubSubItem && matchesSearch && matchesHandedness && matchesBrand && matchesPriceRange;
      })
      .sort((a, b) => {
        if (sortOption === 'price-asc') {
          return a.variants[0].price - b.variants[0].price;
        } else if (sortOption === 'price-desc') {
          return b.variants[0].price - a.variants[0].price;
        } else if (sortOption === 'brand') {
          return a.brand.localeCompare(b.brand);
        } else if (sortOption === 'loft') {
          const getLoftValue = (loft: string): number => {
            if (!loft || loft === 'N/A') return Infinity;
            const cleanedLoft = loft.replace('°', '').replace(' degrees', '').replace('degree', '').trim();
            return parseFloat(cleanedLoft) || Infinity;
          };
          return getLoftValue(a.variants[0].loft) - getLoftValue(b.variants[0].loft);
        }
        return 0; // Default: No sorting
      });
  }, [selectedCategory, selectedSubItem, selectedSubSubItem, debouncedSearchQuery, filterHandedness, filterBrand, filterPriceMin, filterPriceMax, sortOption]);

  // Debug: Log filtered clubs
  console.log("Filtered Clubs:", filteredClubModels);

  const handleAddToBag = (club: Club) => {
    if (selectedClubs.length >= 14) {
      toast.error("Cannot add more than 14 clubs to the bag.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    if (!selectedClubs.some(c => c.id === club.id)) {
      const clubModel = filteredClubModels.find(cm => 
        cm.brand === club.brand && cm.model === club.model
      );
      const clubWithImage = {
        ...club,
        image_path: clubModel ? `club_images/${clubModel.image}.jpg` : "driver_images/placeholder.jpg"
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
    setSelectedCategory(categoryName);
    setSelectedSubItem(null);
    setSelectedSubSubItem(null);
    setIsCategorySidebarOpen(false);
  };

  const selectSubItem = (categoryName: string, subItemFilter: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubItem(subItemFilter);
    setSelectedSubSubItem(null);
  };

  const selectSubSubItem = (categoryName: string, subItemFilter: string, subSubItemFilter: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubItem(subItemFilter);
    setSelectedSubSubItem(subSubItemFilter);
  };

  const totalPrice = selectedClubs.reduce((sum, club) => sum + club.price, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <header className="flex bg-gray-100 transition-colors duration-150 top-0 z-50 w-full sticky py-4 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold text-gray-800">
            Golf Bag Builder
          </h1>
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
            {/* Search Bar in Top Nav (shown on scroll) */}
            {showSearchInTopNav && (
              <>
                <button
                  className="md:hidden text-gray-600 hover:text-gray-800"
                  onClick={() => setIsSearchBarOpen(!isSearchBarOpen)}
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
                <div className={`relative ${isSearchBarOpen || window.innerWidth >= 768 ? 'block' : 'hidden'} md:w-64`}>
                  <input
                    type="text"
                    placeholder="Search clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-1 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                  />
                  <button
                    className="absolute right-0 top-0 h-full px-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-colors"
                    onClick={() => setSearchQuery(searchQuery)}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
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
        {/* Hero Section with Background Image */}
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
        {/* Left Nav Bar and Club Cards Section */}
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
          <nav
            className={`w-full md:w-64 bg-white md:h-screen md:sticky md:top-[64px] p-6 shadow-md flex-shrink-0 md:block ${
              isCategorySidebarOpen ? "block" : "hidden md:block"
            }`}
          >
            {/* Categories */}
            <ul className="mb-6">
              {categories.map(category => (
                <li key={category.name} className="mb-2">
                  <div className="flex items-center justify-between">
                    <button
                      className={`flex-1 text-left py-2 px-4 rounded-lg flex items-center transition ${
                        selectedCategory === category.name
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
                          className={`w-4 h-4 transform transition-transform ${
                            openCategories.includes(category.name) ? "rotate-180" : ""
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
                              className={`flex-1 text-left py-1 px-4 rounded-lg flex items-center transition ${
                                selectedSubItem === subItem.filter
                                  ? "bg-gray-200 text-gray-800 font-semibold"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                              onClick={() => selectSubItem(category.name, subItem.filter)}
                            >
                              <span>{subItem.name}</span>
                            </button>
                            {subItem.subSubItems && (
                              <button
                                onClick={() =>
                                  toggleCategory(`${category.name}-${subItem.name}`)
                                }
                                className="p-2"
                              >
                                <svg
                                  className={`w-4 h-4 transform transition-transform ${
                                    openCategories.includes(`${category.name}-${subItem.name}`)
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
                          {subItem.subSubItems &&
                            openCategories.includes(`${category.name}-${subItem.name}`) && (
                              <ul className="ml-6 mt-1">
                                {subItem.subSubItems.map(subSubItem => (
                                  <li key={subSubItem.name}>
                                    <button
                                      className={`w-full text-left py-1 px-4 rounded-lg flex items-center transition ${
                                        selectedSubSubItem === subSubItem.filter
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

            {/* Sort & Filter Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Sort & Filter</h3>
                <button
                  onClick={() => setIsSortFilterOpen(!isSortFilterOpen)}
                  className="p-2"
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${
                      isSortFilterOpen ? "rotate-180" : ""
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
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sort By</label>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 sm:text-sm rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <option value="default">Default</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="brand">Brand (A-Z)</option>
                      <option value="loft">Loft (Low to High)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Brand</label>
                    <select
                      value={filterBrand}
                      onChange={(e) => setFilterBrand(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 sm:text-sm rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <option value="">All Brands</option>
                      {brandOptions.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Handedness</label>
                    <select
                      value={filterHandedness}
                      onChange={(e) => setFilterHandedness(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 sm:text-sm rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <option value="">All</option>
                      {handednessOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterPriceMin}
                        onChange={(e) => setFilterPriceMin(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 sm:text-sm rounded-md"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterPriceMax}
                        onChange={(e) => setFilterPriceMax(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-600 focus:border-green-600 sm:text-sm rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSortOption('default');
                      setFilterHandedness('');
                      setFilterBrand('');
                      setFilterPriceMin('');
                      setFilterPriceMax('');
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </nav>
          <main
            className={`flex-1 p-6 overflow-auto transition-all duration-300`}
          >
            <div className="max-w-7xl mx-auto">
              {/* Club Grid */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(14.5rem,1fr))] gap-6">
                {filteredClubModels.length > 0 ? (
                  filteredClubModels.map(clubModel => {
                    if (!clubModel.variants || clubModel.variants.length === 0) {
                      console.warn(`No variants found for ${clubModel.brand} ${clubModel.model}`);
                      return null;
                    }
                    const club = {
                      ...clubModel.variants[0],
                      type: clubModel.type,
                      subType: clubModel.subType,
                      specificType: clubModel.specificType,
                      brand: clubModel.brand,
                      model: clubModel.model,
                    };
                    return (
                      <ClubCard
                        key={`${clubModel.brand}-${clubModel.model}`}
                        club={club}
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
                    No {selectedCategory}s available.
                  </p>
                )}
              </div>
            </div>
          </main>
        </div>
        <SelectedClubsSidebar
          selectedClubs={selectedClubs}
          onRemove={handleRemoveFromBag}
          onAdd={handleAddToBag}
          isPinned={isBagPinned}
          onPinToggle={() => setIsBagPinned(!isBagPinned)}
          defaultOpen={selectedClubs.length > 0 || isBagPinned}
          clubsData={typedClubsData.clubs} // Pass clubsData prop
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
        onSelectVariant={(variant) => setSelectedVariant(variant)}
        isSelected={selectedVariant ? selectedClubs.some(c => c.id === selectedVariant.id) : false}
        isBagFull={selectedClubs.length >= 14}
      />
    </div>
  );
};

export default App;