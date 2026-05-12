/**
 * Translates abstract building metrics into relatable community landmarks.
 */

export const translateHeight = (feet: number): string => {
  if (feet <= 0) return "Ground level";
  
  if (feet <= 15) return "About the height of a single-story home.";
  if (feet <= 45) return `About the height of ${Math.round(feet / 12)} brownstone floors.`;
  if (feet <= 100) return `Roughly the height of a ${Math.round(feet / 10)}-story apartment building.`;
  if (feet <= 305) return "About the height of the Statue of Liberty (base to torch).";
  if (feet <= 1250) return "About the height of the Empire State Building (roof height).";
  if (feet <= 1776) return "Approaching the height of One World Trade Center.";
  
  return `${feet} feet tall (a supertall skyscraper!).`;
};

export const translateArea = (sqft: number): string => {
  if (sqft <= 0) return "No buildable area.";
  
  if (sqft <= 500) return "About the size of a studio apartment.";
  if (sqft <= 1000) return "About the size of a 2-bedroom apartment.";
  if (sqft <= 2500) return "About the size of a typical Brooklyn townhouse.";
  if (sqft <= 43560) return `Roughly ${Math.round((sqft / 43560) * 10) / 10} acres.`;
  if (sqft <= 80000) return "About the size of a Manhattan city block.";
  if (sqft <= 130000) return "About the size of a typical Home Depot.";
  
  return `Roughly ${Math.round((sqft / 43560) * 10) / 10} acres.`;
};
