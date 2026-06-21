import request from 'supertest';
import app from '../api';
import { 
  calculateCarbonFootprint, 
  calculateDirectWater, 
  calculateVirtualWater,
  ELECTRICITY_FACTOR,
  TRANSPORT_FACTORS,
  DIET_FACTORS
} from '../lib/calculations';

describe('🧪 Complete High-Coverage Verification Suite', () => {
  
  describe('Unit Tests: Sustainability Calculations Audit', () => {
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
      expect(result.totalScore).toBeGreaterThan(0);
    });

    test('calculates direct water usage monthly', () => {
      const data = { showerMinutes: 10, roWaste: 15, washingMachine: 2 };
      expect(calculateDirectWater(data)).toBe(4850);
    });

    test('calculates virtual water by diet type', () => {
      expect(calculateVirtualWater('omnivore')).toBe(150000);
      expect(calculateVirtualWater('vegetarian')).toBe(90000);
      expect(calculateVirtualWater('vegan')).toBe(60000);
    });
  });

  describe('Integration Tests: API Endpoints', () => {
    it('SUCCESS CASE: Should correctly parse and process valid carbon parameters schema', async () => {
      const response = await request(app)
        .post('/api/calculate')
        .send({
          electricity: 200,
          distance: 100,
          fuelType: 'Petrol',
          dietType: 'Vegetarian',
          distanceUnit: 'km',
          localSourced: 50
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalScore');
      expect(response.body.data.totalScore).toBeGreaterThan(0);
    });

    it('VALIDATION CHECK: Reject missing payload structure with clean status 400 headers', async () => {
      const response = await request(app).post('/api/calculate').send({});
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing environmental payload');
    });

    it('VALIDATION CHECK: Reject negative input values fields gracefully', async () => {
      const response = await request(app)
        .post('/api/calculate')
        .send({ 
          electricity: -50, 
          distance: 100,
          fuelType: 'Petrol',
          dietType: 'Vegetarian',
          distanceUnit: 'km',
          localSourced: 50
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Metrics validation error');
    });
  });

});
