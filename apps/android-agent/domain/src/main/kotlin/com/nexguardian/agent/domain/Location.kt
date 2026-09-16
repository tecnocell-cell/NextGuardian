package com.nexguardian.agent.domain

import java.time.Instant

/** How a position was obtained. Mirrors the contract enum; no provider-specific detail leaks. */
enum class LocationSource { GPS, FUSED, NETWORK }

/** A raw position as read from the platform, before consent is attached. */
data class LocationFix(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double,
    val source: LocationSource,
    val observedAt: Instant,
)

/**
 * A position the user consented to share. [consentVersion] travels with the sample because
 * consent is versioned: a sample collected under an older text must stay attributable to it.
 * The type cannot be built without a consent version, so an unconsented sample cannot exist.
 */
data class LocationSample(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double,
    val source: LocationSource,
    val observedAt: Instant,
    val consentVersion: String,
) {
    init {
        require(latitude in -90.0..90.0) { "latitude out of range" }
        require(longitude in -180.0..180.0) { "longitude out of range" }
        require(accuracyMeters >= 0) { "accuracy cannot be negative" }
        require(consentVersion.isNotBlank()) { "a sample without consent must not exist" }
    }
}

/**
 * Consent to share location, as granted on this device. Absent means never granted;
 * [revokedAt] records a withdrawal without erasing that consent once existed.
 */
data class LocationConsent(
    val version: String,
    val grantedAt: Instant,
    val revokedAt: Instant? = null,
) {
    val active: Boolean get() = revokedAt == null
}

/** Current consent, or null when the user has never granted it. */
interface ConsentStore {
    suspend fun current(): LocationConsent?
    suspend fun grant(version: String, at: Instant)
    suspend fun revoke(at: Instant)
}

/** Positions waiting to reach the server. Survives process death; drains on reconnect. */
interface LocationQueue {
    suspend fun enqueue(sample: LocationSample)
    suspend fun peek(limit: Int): List<LocationSample>
    suspend fun drop(count: Int)
    suspend fun size(): Int
    suspend fun clear()
}

/**
 * Supplies the current position. Implemented on Android; faked on the JVM for tests.
 * It knows nothing about consent: attaching it is the collector's job.
 */
interface LocationProvider {
    suspend fun current(): LocationFix?
}

/** Stamps a raw fix with the consent it was collected under. */
fun LocationFix.consentedWith(consent: LocationConsent) = LocationSample(
    latitude = latitude,
    longitude = longitude,
    accuracyMeters = accuracyMeters,
    source = source,
    observedAt = observedAt,
    consentVersion = consent.version,
)
