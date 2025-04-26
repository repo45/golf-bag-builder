export interface Club {
  id: number;
  loft: string | null;
  shaftmaterial: string | null;
  setmakeup: string | null;
  length: string | null;
  bounce: string | null;
  price: number;
  description: string;
  source: string;
  url: string;
  type: string;
  subtype: string | null;
  specifictype: string | null;
  brand: string;
  model: string;
}

export interface ClubModel {
  type: string;
  subtype: string | null;
  specifictype: string | null;
  brand: string;
  model: string;
  handicapperlevel: string;
  category: string;
  image: string;
  variants: Club[];
}