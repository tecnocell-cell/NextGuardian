package com.nexguardian.agent

import com.nexguardian.agent.core.network.HttpResult
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.data.RemoteActivationRepository
import com.nexguardian.agent.domain.ActivationError
import com.nexguardian.agent.domain.ConnectionState
import com.nexguardian.agent.domain.DeviceInfo
import com.nexguardian.agent.domain.DevicePairingState
import com.nexguardian.agent.domain.SubscriptionState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class RemoteActivationRepositoryTest {
    private val info = DeviceInfo("Pixel", "Google", "Pixel 8", "15", "0.1.0")

    private fun route(path: String): HttpResult = when (path) {
        "/activation/validate" -> HttpResult(200, """{"activationTicket":"tkt","accountDisplayName":"Família","expiresAt":"t"}""")
        "/devices/pair" -> HttpResult(201, """{"pairingId":"pid","pairingTicket":"pt"}""")
        "/devices/pair/confirm" -> HttpResult(200, """{"device":{"pairingState":"PAIRED"},"session":{"accessToken":"acc","refreshToken":"ref","accessExpiresAt":"t"},"subscription":{"state":"TRIAL","trialStartedAt":"2026-01-01T00:00:00Z","trialExpiresAt":"2026-01-03T00:00:00Z"}}""")
        "/devices/heartbeat" -> HttpResult(200, """{"serverReceivedAt":"2026-01-01T00:05:00Z","connectionState":"ONLINE","subscription":{"state":"TRIAL","trialStartedAt":"2026-01-01T00:00:00Z","trialExpiresAt":"2026-01-03T00:00:00Z"}}""")
        "/devices/revoke" -> HttpResult(200, """{"device":{"pairingState":"REVOKED"},"serverTime":"t"}""")
        else -> HttpResult(404, "{}")
    }

    private fun repo(handler: (String, String, String?, String?) -> HttpResult): Triple<RemoteActivationRepository, InMemorySessionStore, InMemoryRemoteStateStore> {
        val session = InMemorySessionStore()
        val state = InMemoryRemoteStateStore()
        val api = NexGuardianApi(FakeHttpClient(handler)) { "idem" }
        val repository = RemoteActivationRepository(api, session, state, info, uuid = { "dev-uuid" }, now = { Instant.parse("2026-01-01T00:00:00Z") })
        return Triple(repository, session, state)
    }

    @Test fun fullFlowEnrollsAndReportsTrial() = runTest {
        val (repository, session, _) = repo { _, path, _, _ -> route(path) }
        assertNull(repository.validate("NG-1"))
        repository.confirm()
        assertEquals(DevicePairingState.PAIRED, session.sessions.first().pairingState)
        val snapshot = repository.snapshots.first()
        assertEquals(SubscriptionState.TRIAL, snapshot.subscription?.state)
        assertEquals("Família", snapshot.account?.name)
        repository.simulateHeartbeat()
        assertEquals(ConnectionState.ONLINE, repository.snapshots.first().connection)
    }

    @Test fun invalidCodeMapsToActivationError() = runTest {
        val (repository, _, _) = repo { _, path, _, _ -> if (path == "/activation/validate") HttpResult(400, "{}") else route(path) }
        assertEquals(ActivationError.INVALID, repository.validate("bad"))
    }

    @Test fun revokeClearsTokensAndState() = runTest {
        val (repository, session, state) = repo { _, path, _, _ -> route(path) }
        repository.validate("NG-1")
        repository.confirm()
        repository.revoke()
        assertEquals(DevicePairingState.REVOKED, session.sessions.first().pairingState)
        assertNull(state.state.first().accessToken)
    }

    @Test fun heartbeatFetchesAndAcksPendingCommands() = runTest {
        val acked = mutableListOf<String>()
        val session = InMemorySessionStore()
        val state = InMemoryRemoteStateStore()
        val api = NexGuardianApi(FakeHttpClient { _, path, _, _ ->
            when {
                path == "/agent/commands" -> HttpResult(200, """{"commands":[{"id":"cmd-1","type":"RING_DEVICE"}],"serverTime":"t"}""")
                path.startsWith("/agent/commands/") && path.endsWith("/ack") -> {
                    acked.add(path)
                    HttpResult(200, """{"id":"cmd-1","deviceId":"d","type":"RING_DEVICE","status":"EXECUTED"}""")
                }
                else -> route(path)
            }
        }) { "idem" }
        val repository = RemoteActivationRepository(api, session, state, info, uuid = { "dev-uuid" }, now = { Instant.parse("2026-01-01T00:00:00Z") })
        repository.validate("NG-1")
        repository.confirm()
        repository.simulateHeartbeat()
        assertEquals(1, acked.size)
        assertTrue(acked[0].contains("cmd-1"))
    }
}
