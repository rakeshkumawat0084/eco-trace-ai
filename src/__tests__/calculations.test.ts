import { calculateDirectWater, calculateVirtualWater } from '../lib/calculations';

describe('Sustainability Calculations Audit - Comprehensive Unit Tests', () => {
    
    describe('calculateDirectWater - High Precision Matrix', () => {
        test('Standard consumption: 10m showers, 15L RO waste, 2 washing loads', () => {
            const data = {
                showerMinutes: 10,
                roWaste: 15,
                washingMachine: 2
            };
            // Shower: 10 * 12 * 30 = 3600
            // RO: 15 * 30 = 450
            // Washing: 2 * 100 * 4 = 800
            // Total: 4850
            expect(calculateDirectWater(data)).toBe(4850);
        });

        test('Handles string numeric inputs correctly for cross-environment safety', () => {
            const data = {
                showerMinutes: "12",
                roWaste: "20.5",
                washingMachine: "1"
            };
            // Shower: 12 * 12 * 30 = 4320
            // RO: 20.5 * 30 = 615
            // Washing: 1 * 100 * 4 = 400
            // Total: 5335
            expect(calculateDirectWater(data)).toBe(5335);
        });

        test('Zero baseline: Should return 0 for all nullified parameters', () => {
            const data = {
                showerMinutes: 0,
                roWaste: 0,
                washingMachine: 0
            };
            expect(calculateDirectWater(data)).toBe(0);
        });

        test('Error resistance: Handles invalid numeric strings as zero', () => {
            const data = {
                showerMinutes: "invalid",
                roWaste: "",
                washingMachine: "NaN"
            };
            // All should resolve to 0
            expect(calculateDirectWater(data as any)).toBe(0);
        });

        test('Handles null/undefined inputs gracefully', () => {
            const data = {
                showerMinutes: null as any,
                roWaste: undefined as any,
                washingMachine: 0
            };
            expect(calculateDirectWater(data)).toBe(0);
        });

        test('High usage scenario (Industrial/Large Family)', () => {
            const data = {
                showerMinutes: 120,
                roWaste: 500,
                washingMachine: 20
            };
            // Shower: 120 * 12 * 30 = 43200
            // RO: 500 * 30 = 15000
            // Washing: 20 * 100 * 4 = 8000
            // Total: 66200
            expect(calculateDirectWater(data)).toBe(66200);
        });

        test('Negative inputs: Should be treated as numbers (mathematically correct but logically weird)', () => {
            const data = {
                showerMinutes: -10,
                roWaste: 0,
                washingMachine: 0
            };
            // -10 * 12 * 30 = -3600
            expect(calculateDirectWater(data)).toBe(-3600);
        });
    });

    describe('calculateVirtualWater - Diet Vector Analysis', () => {
        test('Omnivore protocol: High hydrological footprint', () => {
            expect(calculateVirtualWater('omnivore')).toBe(150000);
        });

        test('Vegetarian protocol: Moderate hydrological mitigation', () => {
            expect(calculateVirtualWater('vegetarian')).toBe(90000);
        });

        test('Vegan protocol: Peak hydrological efficiency', () => {
            expect(calculateVirtualWater('vegan')).toBe(60000);
        });

        test('Unknown/Null state: Returns zero for unauthorized diet vectors', () => {
            expect(calculateVirtualWater('none')).toBe(0);
            expect(calculateVirtualWater('')).toBe(0);
            expect(calculateVirtualWater('paleo' as any)).toBe(0);
            expect(calculateVirtualWater(null as any)).toBe(0);
            expect(calculateVirtualWater(undefined as any)).toBe(0);
        });

        test('Case sensitivity check: Current implementation is case-sensitive', () => {
            // "Vegan" != "vegan" in the current record key lookup
            expect(calculateVirtualWater('Vegan')).toBe(0);
            expect(calculateVirtualWater('VEGAN')).toBe(0);
            expect(calculateVirtualWater('omnivore ')).toBe(0); // Trailing space
        });
    });

});
