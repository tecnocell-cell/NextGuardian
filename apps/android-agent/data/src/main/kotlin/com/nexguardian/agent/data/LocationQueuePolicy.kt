package com.nexguardian.agent.data

import com.nexguardian.agent.domain.LocationSample

/**
 * Pure rules for what the offline queue keeps. No Android, no IO: the awkward cases
 * (a full queue, a device parked all night, a fix worse than the one before it) are
 * decided here so they can be tested without an emulator.
 */
object LocationQueuePolicy {

    /** Bounded so a long offline stretch cannot grow the queue without limit. */
    const val MAX_QUEUED = 500

    /** The server accepts at most 200 samples per request (contract). */
    const val MAX_BATCH = 200

    /**
     * Whether a new sample is worth queueing given the last one already queued.
     *
     * Two rejections, both about not paying battery and storage for nothing:
     * a sample that barely moved from the previous one, and a sample whose accuracy
     * is so much worse that it would only blur a position we already know better.
     */
    fun worthQueueing(
        previous: LocationSample?,
        candidate: LocationSample,
        minDistanceMeters: Double = 25.0,
    ): Boolean {
        if (previous == null) return true
        // Out-of-order fixes happen when a provider flushes a cached position late.
        if (!candidate.observedAt.isAfter(previous.observedAt)) return false
        if (candidate.accuracyMeters > previous.accuracyMeters * 4 && candidate.accuracyMeters > 100) return false
        return distanceMeters(previous, candidate) >= minDistanceMeters
    }

    /**
     * Applies the bound. When the queue is full the OLDEST samples go first: the recent
     * trail is what the responsible adult needs, and dropping the newest would mean
     * throwing away the very position that is being asked for.
     */
    fun <T> bound(queued: List<T>, incoming: T, max: Int = MAX_QUEUED): List<T> {
        val next = queued + incoming
        return if (next.size <= max) next else next.takeLast(max)
    }

    private const val EARTH_RADIUS_METERS = 6_371_008.8

    fun distanceMeters(a: LocationSample, b: LocationSample): Double {
        val dLat = Math.toRadians(b.latitude - a.latitude)
        val dLng = Math.toRadians(b.longitude - a.longitude)
        val lat1 = Math.toRadians(a.latitude)
        val lat2 = Math.toRadians(b.latitude)
        val h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
        return 2 * EARTH_RADIUS_METERS * Math.asin(minOf(1.0, Math.sqrt(h)))
    }
}
