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
    definition: "The size and shape of buildings, and their physical relationship to each other and to open space and lot lines.",
    link: "https://zr.planning.nyc.gov/article-i/chapter-2/12-10#Bulk"
  },
  "setback": {
    term: "Setback",
    definition: "A step-like recession in the profile of a building, usually required to allow sunlight to reach the street.",
  },
  "sky_exposure_plane": {
    term: "Sky Exposure Plane",
    definition: "A theoretical sloping plane that begins at a specified height above the street line, intended to provide light and air at street level. Buildings cannot penetrate this plane.",
  },
  "mih": {
    term: "Mandatory Inclusionary Housing (MIH)",
    definition: "A program that requires affordable housing when developers build in areas rezoned for more housing capacity.",
  },
  "bbl": {
    term: "BBL (Borough, Block, and Lot)",
    definition: "A unique 10-digit number assigned to every piece of real estate in NYC for tax and zoning purposes."
  },
  "use_group": {
    term: "Use Group",
    definition: "Categories of uses (from 1 to 18) established by the Zoning Resolution, grouping activities with similar characteristics."
  },
  "zoning_district": {
    term: "Zoning District",
    definition: "A residential, commercial, or manufacturing area for which specific use, bulk, and parking regulations apply."
  }
};
