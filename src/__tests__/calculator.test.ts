import { 
  calculateCarbonFootprint, 
  calculateDirectWater, 
  calculateVirtualWater,
  ELECTRICITY_FACTOR,
  TRANSPORT_FACTORS,
  DIET_FACTORS
} from '../lib/calculations';

describe('Sustainability Calculations Audit', () => {
  
  describe('Carbon Footprint Calculation', () => {
    test('calculates correct electricity score', () => {
      const input = {
        electricity: 100, // 100 kWh
        distance: 0,
        fuelType: 'Petrol',
        dietType: 'Meat',
        distanceUnit: 'km',
        localSourced: 50
      };
      const result = calculateCarbonFootprint(input);
      expect(result.electricityScore).toBe(100 * ELECTRICITY_FACTOR);
      expect(result.breakdown.electricity).toBe(100 * ELECTRICITY_FACTOR);
    });

    test('calculates correct transport score for Petrol in km', () => {
      const input = {
        electricity: 0,
        distance: 100, // 100 km
        fuelType: 'Petrol',
        dietType: 'Meat',
        distanceUnit: 'km',
        localSourced: 50
      };
      const result = calculateCarbonFootprint(input);
      // dist * factor * 4.33
      const expected = 100 * TRANSPORT_FACTORS['Petrol'] * 4.33;
      expect(result.transportScore).toBeCloseTo(expected, 2);
    });

    test('calculates correct transport score for miles conversion', () => {
      const input = {
        electricity: 0,
        distance: 100, // 100 miles
        fuelType: 'EV',
        dietType: 'Meat',
        distanceUnit: 'mi',
        localSourced: 50
      };
      const result = calculateCarbonFootprint(input);
      const distInKm = 100 * 1.60934;
      const expected = distInKm * TRANSPORT_FACTORS['EV'] * 4.33;
      expect(result.transportScore).toBeCloseTo(expected, 2);
    });

    test('calculates diet score based on local sourcing', () => {
      const input = {
        electricity: 0,
        distance: 0,
        fuelType: 'Petrol',
        dietType: 'Vegan',
        distanceUnit: 'km',
        localSourced: 100 // 100% local
      };
      const result = calculateCarbonFootprint(input);
      // base * (1 - (local/100)*0.15)
      // 45 * (1 - 0.15) = 38.25
      expect(result.dietScore).toBe(DIET_FACTORS['Vegan'] * 0.85);
    });

    test('handles empty or invalid inputs gracefully', () => {
      const input = {
        electricity: '',
        distance: '',
        fuelType: 'Unknown',
        dietType: 'Unknown',
        distanceUnit: 'km',
        localSourced: ''
      };
      const result = calculateCarbonFootprint(input);
      // Should use default diet factor 250 and default local sourcing 50%
      // 250 * (1 - 0.075) = 231.25
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.electricityScore).toBe(0);
      expect(result.transportScore).toBe(0);
    });

    test('total score matches sum of components', () => {
      const input = {
        electricity: 250,
        distance: 500,
        fuelType: 'Diesel',
        dietType: 'Vegetarian',
        distanceUnit: 'km',
        localSourced: 75
      };
      const result = calculateCarbonFootprint(input);
      expect(result.totalScore).toBe(result.electricityScore + result.transportScore + result.dietScore);
    });

    test('handles numeric inputs as strings', () => {
      const input = {
        electricity: "150",
        distance: "300",
        fuelType: 'EV',
        dietType: 'Vegan',
        distanceUnit: 'km',
        localSourced: "20"
      };
      const result = calculateCarbonFootprint(input);
      expect(result.electricityScore).toBe(150 * ELECTRICITY_FACTOR);
      expect(result.transportScore).toBeCloseTo(300 * TRANSPORT_FACTORS['EV'] * 4.33, 2);
    });
  });

  describe('Water Footprint Calculation', () => {
    test('calculates direct water usage monthly', () => {
      const data = {
        showerMinutes: 10,
        roWaste: 15,
        washingMachine: 2
      };
      // shower: 10 * 12 * 30 = 3600
      // ro: 15 * 30 = 450
      // washing: 2 * 100 * 4 = 800
      // total: 3600 + 450 + 800 = 4850
      expect(calculateDirectWater(data)).toBe(4850);
    });

    test('calculates virtual water by diet type', () => {
      expect(calculateVirtualWater('omnivore')).toBe(150000);
      expect(calculateVirtualWater('vegetarian')).toBe(90000);
      expect(calculateVirtualWater('vegan')).toBe(60000);
      expect(calculateVirtualWater('unknown')).toBe(0);
    });
  });

});
