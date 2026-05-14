export interface GlossaryTerm {
  term: string;
  definition: string;
  link?: string;
}

export const glossary: Record<string, GlossaryTerm> = {
  "far": {
    term: "Floor Area Ratio (FAR)",
    definition: "The principal bulk regulation controlling the size of buildings. FAR is the ratio of total building floor area to the area of its zoning lot.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-2/12-10#FloorAreaRatio"
  },
  "bulk": {
    term: "Bulk",
    definition: "The size and shape of buildings, and their physical relationship to each other and to open space and lot lines. Regulated by FAR, height, setbacks, and yard requirements.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-2/12-10#Bulk"
  },
  "setback": {
    term: "Setback",
    definition: "A step-like recession in the profile of a building, usually required at a specified height above street level to allow sunlight and air to reach the street.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-2/12-10#Setback"
  },
  "sky_exposure_plane": {
    term: "Sky Exposure Plane",
    definition: "A theoretical sloping plane that begins at a specified height above the street line. Buildings cannot penetrate this plane, ensuring light and air at street level.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-2/12-10#SkyExposurePlane"
  },
  "mih": {
    term: "Mandatory Inclusionary Housing (MIH)",
    definition: "A program that requires a share of affordable housing when developers build in areas rezoned for more housing capacity. Compliance unlocks FAR bonuses.",
    link: "https://zr.planning.nyc.gov/article-ii/chapter-3/23-154"
  },
  "bbl": {
    term: "BBL (Borough, Block, and Lot)",
    definition: "A unique 10-digit number assigned to every piece of real estate in NYC for tax and zoning purposes. Format: B (1 digit) + Block (5 digits) + Lot (4 digits)."
  },
  "use_group": {
    term: "Use Group",
    definition: "Categories of land uses (Groups 1–18) established by the Zoning Resolution, grouping activities with similar characteristics (e.g., UG 6 = local retail shops).",
    link: "https://zr.planning.nyc.gov/article-ii/chapter-2/22-10"
  },
  "zoning_district": {
    term: "Zoning District",
    definition: "A residential (R), commercial (C), or manufacturing (M) area for which specific use, bulk, and parking regulations apply under the Zoning Resolution.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-1/11-12"
  },
  "fresh": {
    term: "FRESH (Food Retail Expansion to Support Health)",
    definition: "A zoning and financial incentive program encouraging supermarkets in underserved NYC neighborhoods. Qualifying projects receive FAR bonuses up to 2.0.",
    link: "https://www.nyc.gov/site/planning/zoning/districts-tools/fresh.page"
  },
  "assemblage": {
    term: "Lot Assemblage",
    definition: "The combination of two or more adjacent tax lots into a single zoning lot. Assemblage can unlock additional FAR by merging lot areas and development rights.",
  },
  "special_district": {
    term: "Special Purpose District",
    definition: "A zoning district that supplements or modifies the underlying district regulations to address specific neighborhood conditions or planning goals.",
    link: "https://zr.planning.nyc.gov/article-viii"
  }
};

