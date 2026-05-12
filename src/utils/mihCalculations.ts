/**
 * Pure functions for calculating Mandatory Inclusionary Housing (MIH) and FRESH bonuses.
 */

export interface MIHResult {
  isEligible: boolean;
  baseFAR: number;
  bonusFAR: number;
  totalFAR: number;
  affordableSqftRequired: number;
}

/**
 * Calculates the MIH bonus and required affordable housing area.
 * Note: These are generalized placeholder formulas. Exact ZR rules vary wildly by district.
 * 
 * @param lotArea Area of the lot in square feet.
 * @param baseFAR The base Residential FAR for the district.
 * @param district The zoning district string (e.g., "R7A", "C4-4D").
 * @returns An MIHResult object with the calculated bonuses.
 */
export const calculateMIH = (lotArea: number, baseFAR: number, district: string): MIHResult => {
  // Rough proxy: Contextual districts or high-density often get ~33% FAR bump under MIH
  // and require 25-30% of residential floor area to be affordable.
  
  const eligibleDistricts = ["R6A", "R7A", "R7D", "R8A", "R9A", "R10", "C4-4D", "C4-5D"];
  const isEligible = eligibleDistricts.some(d => district.includes(d)) || baseFAR > 2.0;

  if (!isEligible) {
    return {
      isEligible: false,
      baseFAR,
      bonusFAR: 0,
      totalFAR: baseFAR,
      affordableSqftRequired: 0
    };
  }

  // Typical MIH bump is roughly 25-33% increase over base
  const bonusFAR = Math.round((baseFAR * 0.33) * 100) / 100; 
  const totalFAR = baseFAR + bonusFAR;
  
  // Under MIH Option 1, 25% of residential floor area must be affordable
  const totalResidentialArea = lotArea * totalFAR;
  const affordableSqftRequired = Math.round(totalResidentialArea * 0.25);

  return {
    isEligible: true,
    baseFAR,
    bonusFAR,
    totalFAR,
    affordableSqftRequired
  };
};
