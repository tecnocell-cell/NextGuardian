import { deriveTransition, distanceMeters, isInside, type ContainmentState } from '../src/modules/location/geofence.js';

// Praça da Sé, São Paulo, and a point ~1.1 km north of it.
const se = { latitude: -23.5505, longitude: -46.6333 };
const north = { latitude: -23.5405, longitude: -46.6333 };

describe('geofence geometry', () => {
  it('measures a known distance within a metre', () => {
    expect(distanceMeters(se, se)).toBe(0);
    expect(distanceMeters(se, north)).toBeCloseTo(1112, -1);
  });

  it('is symmetric', () => {
    expect(distanceMeters(se, north)).toBeCloseTo(distanceMeters(north, se), 6);
  });

  it('counts a precise sample inside its radius', () => {
    expect(isInside({ ...se, radiusMeters: 200 }, { ...se, accuracyMeters: 10 })).toBe(true);
    expect(isInside({ ...se, radiusMeters: 200 }, { ...north, accuracyMeters: 10 })).toBe(false);
  });

  it('refuses to call a sample inside when its accuracy straddles the boundary', () => {
    // 0 m from the centre, but accurate only to 5 km: it could be anywhere.
    expect(isInside({ ...se, radiusMeters: 200 }, { ...se, accuracyMeters: 5000 })).toBe(false);
  });
});

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 15, 12, minutes));
const all = ['ENTER', 'EXIT', 'DWELL'] as const;
const options = { dwellMinutes: 10, subscribed: all };

describe('geofence transitions', () => {
  it('reports ENTER on a first observation inside', () => {
    const result = deriveTransition(null, true, at(0), options);
    expect(result.transition).toBe('ENTER');
    expect(result.state).toMatchObject({ inside: true, dwellNotifiedAt: null });
  });

  it('does not report EXIT on a first observation outside', () => {
    // Nothing was left: there is no prior containment to cross out of.
    expect(deriveTransition(null, false, at(0), options).transition).toBeNull();
  });

  it('reports ENTER and EXIT on a change of containment', () => {
    const outside: ContainmentState = { inside: false, since: at(0), dwellNotifiedAt: null };
    expect(deriveTransition(outside, true, at(1), options).transition).toBe('ENTER');
    const inside: ContainmentState = { inside: true, since: at(0), dwellNotifiedAt: null };
    expect(deriveTransition(inside, false, at(1), options).transition).toBe('EXIT');
  });

  it('stays silent while containment is unchanged and the dwell time has not elapsed', () => {
    const inside: ContainmentState = { inside: true, since: at(0), dwellNotifiedAt: null };
    expect(deriveTransition(inside, true, at(9), options).transition).toBeNull();
  });

  it('reports DWELL once, after the dwell time, and not again', () => {
    const inside: ContainmentState = { inside: true, since: at(0), dwellNotifiedAt: null };
    const dwelled = deriveTransition(inside, true, at(10), options);
    expect(dwelled.transition).toBe('DWELL');
    expect(dwelled.state.dwellNotifiedAt).toEqual(at(10));
    expect(deriveTransition(dwelled.state, true, at(30), options).transition).toBeNull();
  });

  it('restarts the dwell clock after leaving and returning', () => {
    const dwelled: ContainmentState = { inside: true, since: at(0), dwellNotifiedAt: at(10) };
    const left = deriveTransition(dwelled, false, at(12), options);
    expect(left.state.dwellNotifiedAt).toBeNull();
    const returned = deriveTransition(left.state, true, at(13), options);
    expect(returned.transition).toBe('ENTER');
    expect(deriveTransition(returned.state, true, at(22), options).transition).toBeNull();
    expect(deriveTransition(returned.state, true, at(23), options).transition).toBe('DWELL');
  });

  it('derives state but reports nothing for unsubscribed transitions', () => {
    const only = { dwellMinutes: 10, subscribed: ['EXIT'] as const };
    const entered = deriveTransition(null, true, at(0), only);
    expect(entered.transition).toBeNull();
    expect(entered.state.inside).toBe(true);
    expect(deriveTransition(entered.state, false, at(1), only).transition).toBe('EXIT');
  });
});
