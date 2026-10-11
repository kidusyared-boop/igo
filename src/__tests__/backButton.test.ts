import { describe, expect, it } from 'vitest';
import { parentScreen } from '../App';
import { blankTrip } from '../features/trips/tripDraft';

describe('back button', () => {
  it('closes the app from the trip list', () => {
    expect(parentScreen({ name: 'list' })).toBeNull();
  });

  it('goes from a trip or the review page to the list', () => {
    expect(parentScreen({ name: 'trip', id: 'x' })).toEqual({ name: 'list' });
    expect(parentScreen({ name: 'review' })).toEqual({ name: 'list' });
  });

  it('leaves the form the way Cancel does', () => {
    const trip = blankTrip();
    expect(parentScreen({ name: 'form', trip, isNew: true })).toEqual({ name: 'list' });
    expect(parentScreen({ name: 'form', trip, isNew: false })).toEqual({ name: 'trip', id: trip.id });
  });
});
