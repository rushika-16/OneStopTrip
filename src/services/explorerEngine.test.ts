import { describe, it, expect } from 'vitest';
import { filterPlaces } from './explorerEngine';
import type { ExplorerPlace } from '../types/travel';
import type { ExplorerFilters } from './explorerEngine';

describe('explorerEngine: filterPlaces', () => {
  const createPlace = (overrides?: Partial<ExplorerPlace>): ExplorerPlace => ({
    id: '1',
    name: 'Coastal Spice Kitchen',
    type: 'food',
    cuisineTags: ['Indian', 'Seafood'],
    budgetBand: 'mid',
    rating: 4.8,
    distanceKm: 2.5,
    estimatedCost: 1500,
    mapUrl: 'https://maps.example.com',
    reviewSnippet: 'Amazing food and great service',
    ...overrides,
  });

  const createFilters = (overrides?: Partial<ExplorerFilters>): ExplorerFilters => ({
    query: '',
    type: 'all',
    cuisine: '',
    budgetBand: 'all',
    minimumRating: 0,
    maxDistanceKm: 100,
    ...overrides,
  });

  it('should return all places when no filters applied', () => {
    const places = [
      createPlace({ id: '1', name: 'Restaurant A' }),
      createPlace({ id: '2', name: 'Restaurant B' }),
      createPlace({ id: '3', name: 'Museum', type: 'attractions' }),
    ];
    const filters = createFilters();

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(3);
  });

  it('should filter by search query in place name', () => {
    const places = [
      createPlace({ id: '1', name: 'Coastal Spice Kitchen' }),
      createPlace({ id: '2', name: 'Mountain Breeze Resort' }),
      createPlace({ id: '3', name: 'Ocean View Café' }),
    ];
    const filters = createFilters({ query: 'coastal' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Coastal Spice Kitchen');
  });

  it('should filter by search query in review snippet', () => {
    const places = [
      createPlace({
        id: '1',
        name: 'Restaurant A',
        reviewSnippet: 'Amazing food experience',
      }),
      createPlace({
        id: '2',
        name: 'Restaurant B',
        reviewSnippet: 'Good hotel stay',
      }),
    ];
    const filters = createFilters({ query: 'amazing' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should filter by place type', () => {
    const places = [
      createPlace({ id: '1', type: 'food' }),
      createPlace({ id: '2', type: 'activities' }),
      createPlace({ id: '3', type: 'food' }),
    ];
    const filters = createFilters({ type: 'food' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => p.type === 'food')).toBe(true);
  });

  it('should filter by budget band', () => {
    const places = [
      createPlace({ id: '1', budgetBand: 'low' }),
      createPlace({ id: '2', budgetBand: 'mid' }),
      createPlace({ id: '3', budgetBand: 'high' }),
    ];
    const filters = createFilters({ budgetBand: 'mid' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(1);
    expect(filtered[0].budgetBand).toBe('mid');
  });

  it('should filter by cuisine tag', () => {
    const places = [
      createPlace({ id: '1', cuisineTags: ['Indian', 'Seafood'] }),
      createPlace({ id: '2', cuisineTags: ['Italian', 'Pasta'] }),
      createPlace({ id: '3', cuisineTags: ['Indian', 'Vegetarian'] }),
    ];
    const filters = createFilters({ cuisine: 'Indian' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(2);
  });

  it('should be case-insensitive for search query', () => {
    const places = [
      createPlace({ id: '1', name: 'COASTAL Kitchen' }),
      createPlace({ id: '2', name: 'Mountain Resort' }),
    ];

    const filtered1 = filterPlaces(places, createFilters({ query: 'coastal' }));
    const filtered2 = filterPlaces(places, createFilters({ query: 'COASTAL' }));

    expect(filtered1.length).toBe(1);
    expect(filtered2.length).toBe(1);
  });

  it('should apply multiple filters simultaneously', () => {
    const places = [
      createPlace({
        id: '1',
        type: 'food',
        budgetBand: 'mid',
        name: 'Spice Kitchen',
        cuisineTags: ['Indian'],
      }),
      createPlace({
        id: '2',
        type: 'food',
        budgetBand: 'high',
        name: 'Fine Dining',
        cuisineTags: ['French'],
      }),
      createPlace({
        id: '3',
        type: 'activities',
        budgetBand: 'mid',
        name: 'Spice Tours',
        cuisineTags: [],
      }),
    ];
    const filters = createFilters({
      query: 'spice',
      type: 'food',
      budgetBand: 'mid',
    });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should handle empty places array', () => {
    const filtered = filterPlaces([], createFilters());

    expect(filtered.length).toBe(0);
  });

  it('should return empty array when no results match filters', () => {
    const places = [
      createPlace({
        id: '1',
        type: 'food',
        cuisineTags: ['Italian'],
        name: 'Italian Restaurant',
      }),
    ];
    const filters = createFilters({
      query: 'chinese',
      type: 'activities',
      budgetBand: 'high',
    });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(0);
  });

  it('should filter by query matching cuisine tags', () => {
    const places = [
      createPlace({
        id: '1',
        name: 'Veg Restaurant',
        cuisineTags: ['Vegetarian', 'Vegan'],
      }),
      createPlace({
        id: '2',
        name: 'Meat Restaurant',
        cuisineTags: ['Meat', 'Grilled'],
      }),
    ];
    const filters = createFilters({ query: 'veg' });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should filter by minimum rating', () => {
    const places = [
      createPlace({ id: '1', rating: 4.5 }),
      createPlace({ id: '2', rating: 4.8 }),
      createPlace({ id: '3', rating: 3.9 }),
    ];
    const filters = createFilters({ minimumRating: 4.5 });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => p.rating >= 4.5)).toBe(true);
  });

  it('should filter by maximum distance', () => {
    const places = [
      createPlace({ id: '1', distanceKm: 2.5 }),
      createPlace({ id: '2', distanceKm: 5.0 }),
      createPlace({ id: '3', distanceKm: 10.0 }),
    ];
    const filters = createFilters({ maxDistanceKm: 5.0 });

    const filtered = filterPlaces(places, filters);

    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => p.distanceKm <= 5.0)).toBe(true);
  });
});
