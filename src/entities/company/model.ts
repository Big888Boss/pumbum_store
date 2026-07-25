export type PostalAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  addressCountry: string;
};

export type CompanyProfile = {
  name: string;
  legalName?: string;
  url: string;
  logoUrl: string;
  phone: string;
  email?: string;
  address: PostalAddress;
  openingHours: string[];
  sameAs: string[];
  deliveryArea: string[];
  updatedAt: string;
};
