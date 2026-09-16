package com.nexguardian.agent

import com.nexguardian.agent.core.network.HttpResult
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.data.CollectionResult
import com.nexguardian.agent.data.LocationCollector
import com.nexguardian.agent.data.LocationQueuePolicy
import com.nexguardian.agent.domain.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

private val T0: Instant = Instant.parse("2026-09-15T12:00:00Z")
private const val VERSION = "2026-09-01"

private fun sample(
    lat: Double = -23.5505,
    lng: Double = -46.6333,
    accuracy: Double = 8.0,
    at: Instant = T0,
) = LocationSample(lat, lng, accuracy, LocationSource.GPS, at, VERSION)

private fun fix(
    lat: Double = -23.5505,
    lng: Double = -46.6333,
    accuracy: Double = 8.0,
    at: Instant = T0,
) = LocationFix(lat, lng, accuracy, LocationSource.GPS, at)

private class InMemoryConsentStore(private var consent: LocationConsent? = null) : ConsentStore {
    override suspend fun current() = consent
    override suspend fun grant(version: String, at: Instant) { consent = LocationConsent(version, at) }
    override suspend fun revoke(at: Instant) { consent = consent?.copy(revokedAt = at) }
}

private class InMemoryLocationQueue : LocationQueue {
    val items = mutableListOf<LocationSample>()
    override suspend fun enqueue(sample: LocationSample) { items.add(sample) }
    override suspend fun peek(limit: Int) = items.take(limit)
    override suspend fun drop(count: Int) { repeat(minOf(count, items.size)) { items.removeAt(0) } }
    override suspend fun size() = items.size
    override suspend fun clear() { items.clear() }
}

private class FixedProvider(private val fix: LocationFix?) : LocationProvider {
    override suspend fun current() = fix
}

class LocationSampleTest {
    @Test fun sampleWithoutConsentVersionCannotExist() {
        assertThrows(IllegalArgumentException::class.java) { sample().copy(consentVersion = "  ") }
    }

    @Test fun coordinatesOutsideTheWorldAreRefused() {
        assertThrows(IllegalArgumentException::class.java) { sample(lat = 91.0) }
        assertThrows(IllegalArgumentException::class.java) { sample(lng = -181.0) }
    }

    @Test fun stampingAFixCarriesTheConsentVersion() {
        assertEquals(VERSION, fix().consentedWith(LocationConsent(VERSION, T0)).consentVersion)
    }
}

class LocationQueuePolicyTest {
    @Test fun theFirstSampleIsAlwaysWorthKeeping() {
        assertTrue(LocationQueuePolicy.worthQueueing(null, sample()))
    }

    @Test fun aSampleThatBarelyMovedIsNotWorthBatteryOrStorage() {
        val previous = sample()
        val nudged = sample(lat = -23.55055, at = T0.plusSeconds(60))
        assertTrue(LocationQueuePolicy.distanceMeters(previous, nudged) < 25.0)
        assertFalse(LocationQueuePolicy.worthQueueing(previous, nudged))
    }

    @Test fun aRealMoveIsKept() {
        assertTrue(LocationQueuePolicy.worthQueueing(sample(), sample(lat = -23.5405, at = T0.plusSeconds(60))))
    }

    @Test fun anOutOfOrderFixIsDiscarded() {
        assertFalse(LocationQueuePolicy.worthQueueing(sample(at = T0), sample(lat = -23.5405, at = T0.minusSeconds(30))))
    }

    @Test fun aFarWorseFixDoesNotBlurAPositionAlreadyKnownBetter() {
        val precise = sample(accuracy = 10.0)
        val vague = sample(lat = -23.5405, accuracy = 3000.0, at = T0.plusSeconds(60))
        assertFalse(LocationQueuePolicy.worthQueueing(precise, vague))
    }

    @Test fun theBoundDropsTheOldestBecauseTheRecentTrailIsWhatMatters() {
        val queued = (1..LocationQueuePolicy.MAX_QUEUED).map { sample(at = T0.plusSeconds(it.toLong())) }
        val newest = sample(at = T0.plusSeconds(9999))
        val bounded = LocationQueuePolicy.bound(queued, newest)
        assertEquals(LocationQueuePolicy.MAX_QUEUED, bounded.size)
        assertEquals(newest, bounded.last())
        assertEquals(queued[1], bounded.first())
    }
}

class LocationCollectorTest {
    private val accepted = """{"accepted":1,"transitions":[],"serverTime":"2026-09-15T12:00:00Z"}"""

    private fun collector(
        consent: ConsentStore,
        queue: LocationQueue,
        provider: LocationProvider,
        token: String? = "device-token",
        handler: (String, String, String?, String?) -> HttpResult = { _, _, _, _ -> HttpResult(202, accepted) },
    ): Pair<LocationCollector, FakeHttpClient> {
        val http = FakeHttpClient(handler)
        return LocationCollector(NexGuardianApi(http), consent, queue, provider) { token } to http
    }

    @Test fun nothingIsReadFromThePlatformWithoutConsent() = runTest {
        var asked = false
        val provider = object : LocationProvider {
            override suspend fun current(): LocationFix? { asked = true; return fix() }
        }
        val (collector, http) = collector(InMemoryConsentStore(null), InMemoryLocationQueue(), provider)
        assertEquals(CollectionResult.NoConsent, collector.collect())
        assertFalse("the provider must not be touched before consent is checked", asked)
        assertTrue(http.requests.isEmpty())
    }

    @Test fun revokedConsentStopsCollectionImmediately() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0, revokedAt = T0.plusSeconds(10)))
        val (collector, _) = collector(consent, InMemoryLocationQueue(), FixedProvider(fix()))
        assertEquals(CollectionResult.NoConsent, collector.collect())
    }

    @Test fun noFixIsReportedHonestlyRatherThanGuessed() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val (collector, http) = collector(consent, InMemoryLocationQueue(), FixedProvider(null))
        assertEquals(CollectionResult.NoFix, collector.collect())
        assertTrue(http.requests.isEmpty())
    }

    @Test fun aConsentedFixReachesTheServer() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        val (collector, http) = collector(consent, queue, FixedProvider(fix()))
        assertEquals(CollectionResult.Sent(accepted = 1, transitions = 0), collector.collect())
        assertEquals(0, queue.size())
        assertEquals("POST", http.requests.single().first)
        assertEquals("/agent/locations", http.requests.single().second)
        assertEquals("device-token", http.requests.single().third)
    }

    @Test fun withoutASessionTheSampleWaitsInTheQueue() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        val (collector, http) = collector(consent, queue, FixedProvider(fix()), token = null)
        assertEquals(CollectionResult.Queued(1), collector.collect())
        assertEquals(1, queue.size())
        assertTrue(http.requests.isEmpty())
    }

    @Test fun aTransientFailureKeepsTheSamplesForTheNextAttempt() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        val (collector, _) = collector(consent, queue, FixedProvider(fix())) { _, _, _, _ ->
            HttpResult(503, """{"error":"unavailable"}""")
        }
        collector.collect()
        assertEquals("the trail must survive a server hiccup", 1, queue.size())
    }

    @Test fun samplesTheServerWillNeverAcceptAreDroppedInsteadOfRetriedForever() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        val (collector, _) = collector(consent, queue, FixedProvider(fix())) { _, _, _, _ ->
            HttpResult(400, """{"error":"invalid"}""")
        }
        collector.collect()
        assertEquals(0, queue.size())
    }

    @Test fun rateLimitingKeepsTheSamples() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        val (collector, _) = collector(consent, queue, FixedProvider(fix())) { _, _, _, _ ->
            HttpResult(429, """{"error":"slow down"}""")
        }
        collector.collect()
        assertEquals(1, queue.size())
    }

    @Test fun aQueueFilledOfflineDrainsWhenTheSessionReturns() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        repeat(3) { queue.enqueue(sample(at = T0.plusSeconds(it.toLong()))) }
        val (collector, http) = collector(consent, queue, FixedProvider(null))
        assertNotNull(collector.flush())
        assertEquals(0, queue.size())
        assertEquals("one batch, not one request per sample", 1, http.requests.size)
    }

    @Test fun withdrawingConsentDiscardsWhatWasNeverSent() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val queue = InMemoryLocationQueue()
        queue.enqueue(sample())
        val (collector, _) = collector(consent, queue, FixedProvider(fix()))
        collector.revokeConsent(T0.plusSeconds(60))
        assertEquals(0, queue.size())
        assertEquals(CollectionResult.NoConsent, collector.collect())
    }

    @Test fun theGeofenceCrossingsTheServerDerivedAreReportedBack() = runTest {
        val consent = InMemoryConsentStore(LocationConsent(VERSION, T0))
        val body = """{"accepted":1,"transitions":[{"geofenceId":"g1","name":"Casa","transition":"ENTER"}],"serverTime":"2026-09-15T12:00:00Z"}"""
        val (collector, _) = collector(consent, InMemoryLocationQueue(), FixedProvider(fix())) { _, _, _, _ ->
            HttpResult(202, body)
        }
        assertEquals(CollectionResult.Sent(accepted = 1, transitions = 1), collector.collect())
    }
}
