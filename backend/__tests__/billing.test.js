const {
    getDefaultResourceRate,
    computeBillBreakdown,
    calculateHaversineDistanceKm,
} = require('../services/pricingService');

describe('DonorX Billing & Pricing Engine Tests', () => {
    describe('Default Pricing by Resource Rarity', () => {
        it('assigns correct prices for rare organs', () => {
            expect(getDefaultResourceRate({ type: 'ORGAN', group: 'Kidney' })).toBe(350000);
            expect(getDefaultResourceRate({ type: 'ORGAN', group: 'Heart' })).toBe(500000);
            expect(getDefaultResourceRate({ type: 'ORGAN', group: 'Liver' })).toBe(400000);
            expect(getDefaultResourceRate({ type: 'ORGAN', group: 'Cornea' })).toBe(50000);
        });

        it('assigns premium rates for rare Rh-negative blood and standard rates for Rh-positive', () => {
            // Rare Rh-negative
            expect(getDefaultResourceRate({ type: 'BLOOD', group: 'O-' })).toBe(3500);
            expect(getDefaultResourceRate({ type: 'BLOOD', group: 'AB-' })).toBe(3500);
            expect(getDefaultResourceRate({ type: 'BLOOD', group: 'A-' })).toBe(3000);
            // Common Rh-positive
            expect(getDefaultResourceRate({ type: 'BLOOD', group: 'O+' })).toBe(2000);
            expect(getDefaultResourceRate({ type: 'BLOOD', group: 'A+' })).toBe(1800);
        });

        it('assigns correct rates for critical resources', () => {
            expect(getDefaultResourceRate({ type: 'ICU_BED' })).toBe(8000);
            expect(getDefaultResourceRate({ type: 'VENTILATOR' })).toBe(6500);
            expect(getDefaultResourceRate({ type: 'AMBULANCE' })).toBe(3000);
            expect(getDefaultResourceRate({ type: 'OXYGEN_CYLINDER' })).toBe(1500);
        });
    });

    describe('Geodesic Distance & Transport Calculation', () => {
        it('calculates geodesic distance between two points', () => {
            // Chennai Central to Guindy (~10-12 km)
            const p1 = [80.2707, 13.0827];
            const p2 = [80.2117, 13.0067];
            const dist = calculateHaversineDistanceKm(p1, p2);
            expect(dist).toBeGreaterThan(5);
            expect(dist).toBeLessThan(15);
        });
    });

    describe('Bill Breakdown & 5% DonorX Commission Calculation', () => {
        it('calculates resource total, transport cost, 5% commission and total correctly', () => {
            const unitRate = 10000;
            const quantity = 2;
            const distanceKm = 10;
            const transportBaseFee = 500;
            const transportRatePerKm = 40;

            const breakdown = computeBillBreakdown({
                unitRate,
                quantity,
                distanceKm,
                transportBaseFee,
                transportRatePerKm,
            });

            // Resource Total: 10000 * 2 = 20000
            expect(breakdown.resourceTotal).toBe(20000);
            // Transport Total: 500 + 10 * 40 = 900
            expect(breakdown.transportTotal).toBe(900);
            // Subtotal: 20000 + 900 = 20900
            expect(breakdown.subtotal).toBe(20900);
            // Exactly 5% commission for DonorX: 20900 * 0.05 = 1045
            expect(breakdown.commissionAmount).toBe(1045);
            // Grand Total: 20900 + 1045 = 21945
            expect(breakdown.totalAmount).toBe(21945);
        });
    });
});
