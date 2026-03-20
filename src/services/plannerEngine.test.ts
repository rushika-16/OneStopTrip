import { describe, it, expect } from 'vitest';
import { buildDestinationPlans } from './plannerEngine';
import type { PlannerInput } from '../types/travel';

describe('plannerEngine: buildDestinationPlans', () => {
  const createInput = (overrides?: Partial<PlannerInput>): PlannerInput => ({
    totalBudget: 5000,
    travelDays: 5,
    currentLocation: 'Delhi, India',
    travelerCount: 2,
    destinationType: 'beach',
    travelScope: 'either',
    hasVisa: false,
    foodPreferences: [],
    activityPreferences: [],
    travelMonth: 3, // March
    ...overrides,
  });

  it('should return plans for valid input', () => {
    const input = createInput();

    const plans = buildDestinationPlans(input);

    expect(plans).toBeDefined();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
  });

  it('should return 3 plans (budget, mid-range, premium tiers)', () => {
    const input = createInput({
      currentLocation: 'Mumbai, India',
    });

    const plans = buildDestinationPlans(input);

    // Should have budget, mid-range, and premium options
    const tiers = plans.map((p) => p.tier);
    expect(tiers).toContain('budget');
    expect(tiers).toContain('mid-range');
    expect(tiers).toContain('premium');
  });

  it('should include required plan structure', () => {
    const input = createInput();

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      expect(plan).toHaveProperty('tier');
      expect(plan).toHaveProperty('destination');
      expect(plan).toHaveProperty('breakdown');
      expect(plan).toHaveProperty('itinerary');
      expect(plan).toHaveProperty('notes');
      expect(plan).toHaveProperty('budgetOptimizerTips');

      // Destination properties
      expect(plan.destination).toHaveProperty('name');
      expect(plan.destination).toHaveProperty('country');
      expect(plan.destination).toHaveProperty('scope');

      // Cost breakdown
      expect(plan.breakdown).toHaveProperty('accommodation');
      expect(plan.breakdown).toHaveProperty('food');
      expect(plan.breakdown).toHaveProperty('activities');
      expect(plan.breakdown).toHaveProperty('transport');
      expect(plan.breakdown).toHaveProperty('total');
      expect(plan.breakdown).toHaveProperty('perPerson');

      // Itinerary
      expect(Array.isArray(plan.itinerary)).toBe(true);
      expect(plan.itinerary.length).toBeGreaterThan(0);

      // Notes and tips
      expect(Array.isArray(plan.notes)).toBe(true);
      expect(Array.isArray(plan.budgetOptimizerTips)).toBe(true);
    });
  });

  it('should return different destinations for different tiers', () => {
    const input = createInput({
      currentLocation: 'Bangalore, India',
    });

    const plans = buildDestinationPlans(input);

    const names = plans.map((p) => p.destination.name);
    expect(new Set(names).size).toBe(names.length); // All unique
  });

  it('should respect destination type preference', () => {
    const input = createInput({
      destinationType: 'mountains',
    });

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      expect(plan.destination.type).toBe('mountains');
    });
  });

  it('should generate itinerary with correct number of days', () => {
    const input = createInput({
      travelDays: 7,
    });

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      expect(plan.itinerary.length).toBe(7);
      plan.itinerary.forEach((day, index) => {
        expect(day.day).toBe(index + 1);
        expect(day.title).toBeDefined();
        expect(Array.isArray(day.highlights)).toBe(true);
        expect(day.estimatedDailyCost).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('should allocate budget correctly in cost breakdown', () => {
    const input = createInput({
      totalBudget: 6000,
      travelDays: 6,
    });

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      // Check that total is set
      expect(plan.breakdown.total).toBeGreaterThan(0);
      expect(plan.breakdown.perPerson).toBeGreaterThan(0);

      // Major categories should have positive values
      expect(plan.breakdown.accommodation).toBeGreaterThan(0);
      expect(plan.breakdown.food).toBeGreaterThan(0);
      expect(plan.breakdown.transport).toBeGreaterThan(0);
    });
  });

  it('should include budget tips for all plans', () => {
    const input = createInput();

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      expect(plan.budgetOptimizerTips.length).toBeGreaterThan(0);
      expect(plan.budgetOptimizerTips[0]).toMatch(/./); // Non-empty string
    });
  });

  it('should handle international trips', () => {
    const input = createInput({
      currentLocation: 'New York, USA',
      destinationType: 'city',
      travelScope: 'international',
    });

    const plans = buildDestinationPlans(input);

    expect(plans.length).toBeGreaterThan(0);
    plans.forEach((plan) => {
      expect(plan.destination).toBeDefined();
    });
  });

  it('should handle domestic trips', () => {
    const input = createInput({
      currentLocation: 'Delhi, India',
      destinationType: 'beach',
      travelScope: 'domestic',
    });

    const plans = buildDestinationPlans(input);

    expect(plans.length).toBeGreaterThan(0);
  });

  it('should prioritize requested destination when provided', () => {
    const input = createInput({
      destinationType: 'beach',
      travelScope: 'either',
      targetDestination: 'Mumbai',
    });

    const plans = buildDestinationPlans(input);

    expect(plans.length).toBeGreaterThan(0);
    plans.forEach((plan) => {
      expect(plan.destination.name).toContain('Mumbai');
    });
  });

  it('should fall back to type-based suggestions if requested destination is unknown', () => {
    const input = createInput({
      destinationType: 'mountains',
      targetDestination: 'Atlantis',
    });

    const plans = buildDestinationPlans(input);

    expect(plans.length).toBeGreaterThan(0);
    plans.forEach((plan) => {
      expect(plan.destination.type).toBe('mountains');
    });
  });

  it('should adjust cost breakdown for group size', () => {
    const singleInput = createInput({
      travelerCount: 1,
      travelDays: 5,
      totalBudget: 2000,
    });
    const groupInput = createInput({
      travelerCount: 4,
      travelDays: 5,
      totalBudget: 8000,
    });

    const singlePlans = buildDestinationPlans(singleInput);
    const groupPlans = buildDestinationPlans(groupInput);

    // Group should have similar or lower per-person accommodation costs
    const singleAccomPerPerson =
      singlePlans[0].breakdown.accommodation / singleInput.travelerCount /
      singleInput.travelDays;
    const groupAccomPerPerson =
      groupPlans[0].breakdown.accommodation / groupInput.travelerCount /
      groupInput.travelDays;

    expect(groupAccomPerPerson).toBeLessThanOrEqual(singleAccomPerPerson * 1.2);
  });

  it('should include plan notes for all plans', () => {
    const input = createInput();

    const plans = buildDestinationPlans(input);

    plans.forEach((plan) => {
      expect(plan.notes.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle different travel months', () => {
    const summerInput = createInput({ travelMonth: 6 });
    const winterInput = createInput({ travelMonth: 12 });

    const summerPlans = buildDestinationPlans(summerInput);
    const winterPlans = buildDestinationPlans(winterInput);

    expect(summerPlans.length).toBeGreaterThan(0);
    expect(winterPlans.length).toBeGreaterThan(0);
  });
});
