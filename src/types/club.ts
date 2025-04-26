export interface Price {
  retailer: string;
  price: number;
  url: string;
}

export interface Club {
  id: number;
  loft: string | null;
  shaftMaterial: string | null;
  setMakeup: string | null;
  length: string | null;
  bounce: string | null;
  price: number;
  description: string;
  prices: Price[];
  type: string;
  subType: string | null;
  specificType: string | null;
  brand: string;
  model: string;
}

export interface ClubModel {
  type: string;
  subType: string | null;
  specificType: string | null;
  brand: string;
  model: string;
  handicapperLevel: string;
  category: string;
  image: string;
  variants: Club[];
}