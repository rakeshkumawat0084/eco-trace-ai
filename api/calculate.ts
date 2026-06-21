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
  const val = (v: any) => (v != null ? parseFloat(v.toString()) : 0) || 0;
  
  const electricityScore = val(input.electricity) * ELECTRICITY_FACTOR;
  
  let dist = val(input.distance);
  if (input.distanceUnit === "mi") {
    dist = dist * 1.60934;
  }
  
  const transportScore = dist * (TRANSPORT_FACTORS[input.fuelType || ""] || 0.17) * 4.33;
  
  const baseDietScore = DIET_FACTORS[input.dietType || ""] || 250;
  const sourcingFactor = 1 - (val(input.localSourced) / 100) * 0.15;
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

export default function handler(req: any, res: any) {
  // Allow OPTIONS for CORS if needed, but Vercel handles this mostly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, error: "Missing environmental payload" });
    }

    const electricityState = req.body.electricity !== undefined && req.body.electricity !== "" ? parseFloat(req.body.electricity) : null;
    const distanceState = req.body.distance !== undefined && req.body.distance !== "" ? parseFloat(req.body.distance) : null;
    const localSourcedState = req.body.localSourced !== undefined && req.body.localSourced !== "" ? parseFloat(req.body.localSourced) : null;

    if (
      (electricityState !== null && !isNaN(electricityState) && electricityState < 0) ||
      (distanceState !== null && !isNaN(distanceState) && distanceState < 0) ||
      (localSourcedState !== null && !isNaN(localSourcedState) && localSourcedState < 0)
    ) {
      return res.status(400).json({ success: false, error: "Metrics validation error: Negative values are not permitted." });
    }

    const data = calculateCarbonFootprint(req.body);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[API CALCULATE ERROR]:', error);
    res.status(400).json({ success: false, error: 'Calculation failed', message: error.message });
  }
}

