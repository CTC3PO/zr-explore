export type UseCategory = "Residential" | "Community Facility" | "Commercial" | "Manufacturing";

export interface NYCUseGroup {
  id: number;
  category: UseCategory;
  description: string;
  examples: string;
  primaryDistricts: string;
}

export const useGroups: NYCUseGroup[] = [
  {
    id: 1,
    category: "Residential",
    description: "Single-family detached residences",
    examples: "Single-family homes",
    primaryDistricts: "R1, R2, R3"
  },
  {
    id: 2,
    category: "Residential",
    description: "All other types of residences",
    examples: "Apartment buildings, two-family homes",
    primaryDistricts: "R3 through R10"
  },
  {
    id: 3,
    category: "Community Facility",
    description: "Community facilities serving local needs",
    examples: "Schools, libraries, museums, non-profit galleries",
    primaryDistricts: "All Residence Districts"
  },
  {
    id: 4,
    category: "Community Facility",
    description: "Community facilities (recreation/health)",
    examples: "Houses of worship, community centers, hospitals",
    primaryDistricts: "All Residence Districts"
  },
  {
    id: 5,
    category: "Commercial",
    description: "Transient accommodations",
    examples: "Hotels, motels",
    primaryDistricts: "C1 through C8"
  },
  {
    id: 6,
    category: "Commercial",
    description: "Retail and service establishments for local needs",
    examples: "Grocery stores, salons, drug stores, local retail",
    primaryDistricts: "C1, C2, C4, C5, C6"
  },
  {
    id: 7,
    category: "Commercial",
    description: "Home maintenance and repair services",
    examples: "Plumbing shops, exterminators, sign painting",
    primaryDistricts: "C2, C6, C8"
  },
  {
    id: 8,
    category: "Commercial",
    description: "Amusement and entertainment",
    examples: "Movie theaters, small bowling alleys",
    primaryDistricts: "C2, C4, C6, C8"
  },
  {
    id: 9,
    category: "Commercial",
    description: "Business and other services",
    examples: "Catering, printing shops, studios",
    primaryDistricts: "C2, C4, C5, C6, C8"
  },
  {
    id: 10,
    category: "Commercial",
    description: "Large retail establishments",
    examples: "Department stores, large appliance stores",
    primaryDistricts: "C4, C5, C6"
  },
  {
    id: 11,
    category: "Commercial",
    description: "Custom manufacturing",
    examples: "Custom clothing makers, jewelry making",
    primaryDistricts: "C5, C6"
  },
  {
    id: 12,
    category: "Commercial",
    description: "Large entertainment facilities",
    examples: "Arenas, indoor skating rinks, large bowling alleys",
    primaryDistricts: "C4, C6, C7, C8"
  },
  {
    id: 13,
    category: "Commercial",
    description: "Low coverage/open uses",
    examples: "Golf driving ranges, camps",
    primaryDistricts: "C7, C8"
  },
  {
    id: 14,
    category: "Commercial",
    description: "Facilities for boating and related activities",
    examples: "Boat rental, boat storage",
    primaryDistricts: "C3"
  },
  {
    id: 15,
    category: "Commercial",
    description: "Large commercial amusement",
    examples: "Amusement parks",
    primaryDistricts: "C7"
  },
  {
    id: 16,
    category: "Commercial",
    description: "Automotive and other heavy commercial services",
    examples: "Gas stations, car washes, motorcycle sales",
    primaryDistricts: "C8, M1, M2, M3"
  },
  {
    id: 17,
    category: "Manufacturing",
    description: "Light manufacturing",
    examples: "Apparel manufacturing, food products, woodworking",
    primaryDistricts: "M1, M2, M3"
  },
  {
    id: 18,
    category: "Manufacturing",
    description: "Heavy manufacturing",
    examples: "Chemical plants, meat packing, salvage yards",
    primaryDistricts: "M3"
  }
];
