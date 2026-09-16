package com.nexguardian.agent.data

import com.nexguardian.agent.core.network.ApiException
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.domain.ConsentStore
import com.nexguardian.agent.domain.LocationProvider
import com.nexguardian.agent.domain.LocationQueue
import com.nexguardian.agent.domain.LocationSample
import com.nexguardian.agent.domain.consentedWith

/** What a collection attempt did, so the UI can be honest instead of implying live tracking. */
sealed interface CollectionResult {
    data object NoConsent : CollectionResult
    data object NoFix : CollectionResult
    data object NotWorthKeeping : CollectionResult
    data class Queued(val pending: Int) : CollectionResult
    data class Sent(val accepted: Int, val transitions: Int) : CollectionResult
}

/**
 * Collects a position and gets it to the server, offline-first.
 *
 * Consent is checked on every single collection, not once at start-up: the user may revoke
 * it at any moment, and a revoked consent must stop collection immediately — not at the next
 * app launch. Nothing is read from the platform before that check passes.
 */
class LocationCollector(
    private val api: NexGuardianApi,
    private val consent: ConsentStore,
    private val queue: LocationQueue,
    private val provider: LocationProvider,
    private val accessToken: suspend () -> String?,
) {

    suspend fun collect(): CollectionResult {
        val active = consent.current()?.takeIf { it.active } ?: return CollectionResult.NoConsent

        val fix = provider.current() ?: return CollectionResult.NoFix
        val sample = fix.consentedWith(active)

        val previous = queue.peek(Int.MAX_VALUE).lastOrNull()
        if (!LocationQueuePolicy.worthQueueing(previous, sample)) return CollectionResult.NotWorthKeeping

        queue.enqueue(sample)
        return flush() ?: CollectionResult.Queued(queue.size())
    }

    /**
     * Drains the queue. Samples are dropped only after the server confirms them, so a failure
     * mid-flush leaves them queued for the next attempt rather than losing the trail.
     */
    suspend fun flush(): CollectionResult.Sent? {
        val token = accessToken() ?: return null
        var accepted = 0
        var transitions = 0

        while (true) {
            val batch: List<LocationSample> = queue.peek(LocationQueuePolicy.MAX_BATCH)
            if (batch.isEmpty()) break
            val result = try {
                api.reportLocations(token, batch)
            } catch (e: ApiException) {
                // 4xx other than rate limiting means the server will never accept these samples;
                // keeping them would retry forever. Anything else is transient: keep and retry.
                if (e.status in 400..499 && e.status != 429) queue.drop(batch.size)
                return if (accepted > 0) CollectionResult.Sent(accepted, transitions) else null
            }
            queue.drop(batch.size)
            accepted += result.accepted
            transitions += result.transitions.size
            if (batch.size < LocationQueuePolicy.MAX_BATCH) break
        }
        return if (accepted > 0) CollectionResult.Sent(accepted, transitions) else null
    }

    /** Withdrawing consent stops collection and discards what was never sent. */
    suspend fun revokeConsent(at: java.time.Instant) {
        consent.revoke(at)
        queue.clear()
    }
}
