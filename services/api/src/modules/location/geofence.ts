// Pure, deterministic geofence geometry and transition derivation (doc 16, Part I).
// Circles only in the MVP (§3b): matches the Android Geofencing API and avoids PostGIS.

export type Transition = 'ENTER' | 'EXIT' | 'DWELL';

export interface Point {
  latitude: number;
  longitude: number;
}

export interface GeofenceShape extends Point {
  radiusMeters: number;
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const MINUTE = 60_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Great-circle distance. Accurate enough for geofences of a few hundred metres,
// and far cheaper than a geospatial extension.
export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// A sample only counts as inside when its accuracy circle does not straddle the
// boundary. A vague fix (e.g. COARSE permission) must not fake a crossing.
export function isInside(shape: GeofenceShape, sample: Point & { accuracyMeters: number }): boolean {
  return distanceMeters(shape, sample) + sample.accuracyMeters <= shape.radiusMeters;
}

export interface ContainmentState {
  inside: boolean;
  since: Date;
  dwellNotifiedAt: Date | null;
}

export interface TransitionDecision {
  transition: Transition | null;
  state: ContainmentState;
}

/**
 * Derives at most one transition from a new containment observation.
 *
 * ENTER/EXIT fire on a change of containment. DWELL fires once per stay, after
 * `dwellMinutes` continuously inside — this is why `since` is tracked rather
 * than recomputed: the agent reports periodically, so no scheduler is needed.
 * Transitions the geofence does not subscribe to are derived but not reported.
 */
export function deriveTransition(
  previous: ContainmentState | null,
  inside: boolean,
  now: Date,
  options: { dwellMinutes: number; subscribed: readonly Transition[] },
): TransitionDecision {
  const report = (transition: Transition | null) =>
    transition && options.subscribed.includes(transition) ? transition : null;

  if (!previous) {
    // A first observation outside is not a crossing: there was nothing to leave.
    return { transition: inside ? report('ENTER') : null, state: { inside, since: now, dwellNotifiedAt: null } };
  }

  if (previous.inside !== inside) {
    return {
      transition: report(inside ? 'ENTER' : 'EXIT'),
      state: { inside, since: now, dwellNotifiedAt: null },
    };
  }

  const dwelled =
    inside &&
    previous.dwellNotifiedAt === null &&
    now.getTime() - previous.since.getTime() >= options.dwellMinutes * MINUTE;

  return {
    transition: dwelled ? report('DWELL') : null,
    state: {
      inside,
      since: previous.since,
      dwellNotifiedAt: dwelled ? now : previous.dwellNotifiedAt,
    },
  };
}
