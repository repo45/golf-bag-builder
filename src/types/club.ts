export interface Price {
  retailer: string;
  price: number;
  url: string;
}

export interface Club {
  id: number;
  type: string;
  subType?: string | null; // e.g., "Set", "Individual"
  specificType?: string | null; // e.g., "7 Iron", "3-Wood"
  brand: string;
  model: string;
  price: number;
  loft: string;
  shaftMaterial?: string; // e.g., "Graphite", "Steel"
  setMakeup?: string; // e.g., "4-PW" for iron sets
  length?: string; // e.g., "45 inches"
  bounce?: string; // e.g., "10 degrees" for wedges
  forgivenessRating: number;
  difficultyRating: number;
  description: string;
  prices: Price[];
  image?: string; // Optional, added for SelectedClubsSidebar
}

export interface ClubModel {
  type: string;
  subType: string | null;
  specificType: string | null;
  brand: string;
  model: string;
  image: string; // Path to the image (e.g., "driver_images/TaylorMade_Stealth_Plus+.jpg")
  variants: Club[];
}