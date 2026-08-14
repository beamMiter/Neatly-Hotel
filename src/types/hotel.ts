export const DEFAULT_HOTEL_ID = "default";

export const DEFAULT_HOTEL_INFORMATION = {
  id: DEFAULT_HOTEL_ID,
  name: "Neatly Hotel",
  description:
    "Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas. All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a hairdryer and shower. Every room at Neatly Hotel offers air conditioning and a desk.",
  logoUrl: "/images/logo-neatly.png",
};

export type HotelInformation = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
};
