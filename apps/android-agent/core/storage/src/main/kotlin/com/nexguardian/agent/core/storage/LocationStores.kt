package com.nexguardian.agent.core.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.nexguardian.agent.core.network.Json
import com.nexguardian.agent.core.network.JsonArray
import com.nexguardian.agent.core.network.JsonObject
import com.nexguardian.agent.data.LocationQueuePolicy
import com.nexguardian.agent.domain.ConsentStore
import com.nexguardian.agent.domain.LocationConsent
import com.nexguardian.agent.domain.LocationQueue
import com.nexguardian.agent.domain.LocationSample
import com.nexguardian.agent.domain.LocationSource
import kotlinx.coroutines.flow.first
import java.time.Instant

val Context.agentLocationPreferences by preferencesDataStore(name = "nexguardian_location")

/** Consent record on this device. App-private storage; backup is disabled app-wide. */
class DataStoreConsentStore(private val store: DataStore<Preferences>) : ConsentStore {
    private object Keys {
        val version = stringPreferencesKey("consentVersion")
        val grantedAt = longPreferencesKey("consentGrantedAt")
        val revokedAt = longPreferencesKey("consentRevokedAt")
    }

    override suspend fun current(): LocationConsent? {
        val preferences = store.data.first()
        val version = preferences[Keys.version] ?: return null
        val grantedAt = preferences[Keys.grantedAt] ?: return null
        return LocationConsent(
            version = version,
            grantedAt = Instant.ofEpochMilli(grantedAt),
            revokedAt = preferences[Keys.revokedAt]?.let(Instant::ofEpochMilli),
        )
    }

    override suspend fun grant(version: String, at: Instant) {
        store.edit {
            it[Keys.version] = version
            it[Keys.grantedAt] = at.toEpochMilli()
            it.remove(Keys.revokedAt)
        }
    }

    // Revocation keeps the version and grant time: that consent existed is itself a record.
    override suspend fun revoke(at: Instant) {
        store.edit { it[Keys.revokedAt] = at.toEpochMilli() }
    }
}

/**
 * Offline queue persisted as JSON. Sized by [LocationQueuePolicy.MAX_QUEUED], so the worst
 * case is a few hundred small records rather than an unbounded file.
 */
class DataStoreLocationQueue(private val store: DataStore<Preferences>) : LocationQueue {
    private val key = stringPreferencesKey("pendingSamples")

    private suspend fun read(): List<LocationSample> = decode(store.data.first()[key])

    private suspend fun write(samples: List<LocationSample>) {
        store.edit { it[key] = encode(samples) }
    }

    override suspend fun enqueue(sample: LocationSample) = write(LocationQueuePolicy.bound(read(), sample))

    override suspend fun peek(limit: Int): List<LocationSample> = read().take(limit)

    override suspend fun drop(count: Int) = write(read().drop(count))

    override suspend fun size(): Int = read().size

    override suspend fun clear() {
        store.edit { it.remove(key) }
    }

    private fun encode(samples: List<LocationSample>): String = Json.encode(
        samples.map {
            mapOf(
                "latitude" to it.latitude, "longitude" to it.longitude,
                "accuracyMeters" to it.accuracyMeters, "source" to it.source.name,
                "observedAt" to it.observedAt.toString(), "consentVersion" to it.consentVersion,
            )
        }
    )

    // A record that cannot be read back is skipped, never allowed to block the whole queue.
    private fun decode(text: String?): List<LocationSample> {
        if (text.isNullOrBlank()) return emptyList()
        val array = runCatching { Json.parse(text) as? JsonArray }.getOrNull() ?: return emptyList()
        return array.items.mapNotNull { item ->
            val fields = item as? JsonObject ?: return@mapNotNull null
            runCatching {
                LocationSample(
                    latitude = fields.num("latitude") ?: return@runCatching null,
                    longitude = fields.num("longitude") ?: return@runCatching null,
                    accuracyMeters = fields.num("accuracyMeters") ?: return@runCatching null,
                    source = LocationSource.valueOf(fields.str("source") ?: return@runCatching null),
                    observedAt = Instant.parse(fields.str("observedAt") ?: return@runCatching null),
                    consentVersion = fields.str("consentVersion") ?: return@runCatching null,
                )
            }.getOrNull()
        }
    }
}
