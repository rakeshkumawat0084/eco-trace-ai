
// Carbon Calculation Factors
export const ELECTRICITY_FACTOR = 0.85; // kg CO2 per kWh (updated for benchmark)
export const TRANSPORT_FACTORS: Record<string, number> = {
  Petrol: 0.17,
  Diesel: 0.19,
  EV: 0.05,
};
export const DIET_FACTORS: Record<string, number> = {
  Meat: 150,
  Vegetarian: 70,
  Vegan: 45,
};

export const MITIGATION_TASKS = [
  { id: 'commute', label: "Switch to localized public commuting systems", reduction: 35 },
  { id: 'power', label: "Terminate phantom power appliance arrays", reduction: 15 },
  { id: 'diet', label: "Enforce complete alternative vegan structural days", reduction: 25 }
];

export interface FootprintInput {
  electricity: string | number;
  distance: string | number;
  fuelType: string;
  dietType: string;
  distanceUnit: string;
  localSourced: string | number;
}

export interface CalculationResult {
  electricityScore: number;
  transportScore: number;
  dietScore: number;
  totalScore: number;
  breakdown: {
    electricity: number;
    transport: number;
    diet: number;
  };
}

/**
 * Calculates the monthly carbon footprint based on user inputs.
 */
export function calculateCarbonFootprint(input: FootprintInput): CalculationResult {
  const electricityScore = (parseFloat(input.electricity.toString()) || 0) * ELECTRICITY_FACTOR;
  
  let dist = parseFloat(input.distance.toString()) || 0;
  if (input.distanceUnit === "mi") {
    dist = dist * 1.60934;
  }
  
  const transportScore = dist * (TRANSPORT_FACTORS[input.fuelType] || 0.17) * 4.33;
  
  const baseDietScore = DIET_FACTORS[input.dietType] || 250;
  const sourcingFactor = 1 - ((parseFloat(input.localSourced.toString()) || 50) / 100) * 0.15;
  const dietScore = baseDietScore * sourcingFactor;

  const totalScore = electricityScore + transportScore + dietScore;

  return {
    electricityScore,
    transportScore,
    dietScore,
    totalScore,
    breakdown: {
      electricity: electricityScore,
      transport: transportScore,
      diet: dietScore
    }
  };
}

/**
 * Calculates direct water usage per month.
 */
export function calculateDirectWater(data: { showerMinutes: string | number, roWaste: string | number, washingMachine: string | number }): number {
  const shower = (parseFloat(data.showerMinutes.toString()) || 0) * 12 * 30; // 12L per min
  const ro = (parseFloat(data.roWaste.toString()) || 0) * 30; // Liters per day * 30
  const washing = (parseFloat(data.washingMachine.toString()) || 0) * 100 * 4; // 100L per load * 4 weeks
  return shower + ro + washing;
}

/**
 * Calculates virtual water usage per month based on diet.
 */
export function calculateVirtualWater(dietType: string): number {
  const dietImpact: Record<string, number> = {
    omnivore: 150000,
    vegetarian: 90000,
    vegan: 60000
  };
  return dietImpact[dietType] || 0;
}
