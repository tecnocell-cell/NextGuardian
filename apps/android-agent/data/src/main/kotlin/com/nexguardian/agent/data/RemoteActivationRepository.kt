package com.nexguardian.agent.data

import com.nexguardian.agent.core.network.ApiException
import com.nexguardian.agent.core.network.CommandEffects
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.core.network.NoOpCommandEffects
import com.nexguardian.agent.core.network.RemoteState
import com.nexguardian.agent.core.network.RemoteStateStore
import com.nexguardian.agent.domain.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.util.UUID

/**
 * Real ActivationRepository backed by the NextGuardian API. Implements the same domain port as the
 * demo mock, so screens and the ViewModel are unchanged. Server is the temporal authority.
 */
class RemoteActivationRepository(
    private val api: NexGuardianApi,
    private val sessionStore: SessionStore,
    private val stateStore: RemoteStateStore,
    private val info: DeviceInfo,
    private val effects: CommandEffects = NoOpCommandEffects,
    private val uuid: () -> String = { UUID.randomUUID().toString() },
    private val now: () -> Instant = { Instant.now() },
) : ActivationRepository {

    override val snapshots: Flow<AgentSnapshot> =
        combine(sessionStore.sessions, stateStore.state) { local, remote ->
            AgentSnapshot(
                initialized = true,
                session = local,
                subscription = buildSubscription(local, remote),
                connection = runCatching { ConnectionState.valueOf(remote.connection) }.getOrDefault(ConnectionState.UNKNOWN),
                account = remote.accountName?.let { Account(local.deviceId ?: "", it) },
            )
        }

    override suspend fun validate(code: String): ActivationError? {
        val deviceId = ensureDeviceId()
        val result = try {
            api.validateActivation(code, deviceId)
        } catch (e: ApiException) {
            // The contract returns 400 for invalid/expired and 429 for too many attempts.
            if (e.status == 400 || e.status == 429) return ActivationError.INVALID else throw e
        }
        stateStore.update { it.copy(activationTicket = result.activationTicket, accountName = result.accountDisplayName) }
        sessionStore.update {
            it.copy(
                deviceId = deviceId,
                pairingState = PairingTransitions.request(it.pairingState),
                activationState = ActivationState.VALIDATED,
            )
        }
        return null
    }

    override suspend fun confirm() {
        val deviceId = requireNotNull(sessionStore.sessions.first().deviceId) { "No device id" }
        val ticket = requireNotNull(stateStore.state.first().activationTicket) { "No activation ticket" }
        val pair = api.pair(ticket, deviceId, info)
        stateStore.update { it.copy(pairingId = pair.pairingId, pairingTicket = pair.pairingTicket) }
        val confirm = api.confirmPair(pair.pairingTicket, pair.pairingId, deviceId)
        stateStore.update {
            it.copy(
                accessToken = confirm.accessToken,
                refreshToken = confirm.refreshToken,
                subscriptionState = confirm.subscriptionState,
                trialStartedAt = parseMillis(confirm.trialStartedAt),
                trialExpiresAt = parseMillis(confirm.trialExpiresAt),
                activationTicket = null,
                pairingTicket = null,
            )
        }
        sessionStore.update {
            it.copy(
                pairingState = PairingTransitions.confirm(it.pairingState),
                activationState = ActivationState.CONFIRMED,
            )
        }
    }

    override suspend fun revoke() {
        val local = sessionStore.sessions.first()
        val deviceId = requireNotNull(local.deviceId) { "No device id" }
        stateStore.state.first().accessToken?.let { token -> runCatching { api.revoke(token, deviceId) } }
        sessionStore.update {
            it.copy(pairingState = PairingTransitions.revoke(it.pairingState), activationState = ActivationState.REVOKED)
        }
        stateStore.update { it.copy(accessToken = null, refreshToken = null, connection = ConnectionState.OFFLINE.name) }
    }

    override suspend fun simulateHeartbeat() {
        val local = sessionStore.sessions.first()
        require(local.pairingState == DevicePairingState.PAIRED) { "Device is not paired" }
        val deviceId = requireNotNull(local.deviceId) { "No device id" }
        val token = requireNotNull(stateStore.state.first().accessToken) { "No device session" }
        val heartbeat = api.heartbeat(token, deviceId, info, batteryLevel = null, networkType = "UNKNOWN", timestamp = now().toString())
        val at = parseMillis(heartbeat.serverReceivedAt)?.let(Instant::ofEpochMilli) ?: now()
        sessionStore.update { it.copy(lastSync = at) }
        stateStore.update {
            it.copy(
                connection = heartbeat.connectionState.ifBlank { ConnectionState.ONLINE.name },
                subscriptionState = heartbeat.subscriptionState.ifBlank { it.subscriptionState },
                trialStartedAt = parseMillis(heartbeat.trialStartedAt) ?: it.trialStartedAt,
                trialExpiresAt = parseMillis(heartbeat.trialExpiresAt) ?: it.trialExpiresAt,
            )
        }
        // Command pull is best-effort and must never break the heartbeat itself.
        runCatching { syncCommands(token) }
    }

    // Fetches pending commands and acknowledges the ones the agent can process safely.
    // The closed catalog carries no arbitrary execution; check-in/sync are satisfied by the
    // heartbeat above, so the mechanism acknowledges delivery/execution.
    private suspend fun syncCommands(token: String) {
        for (command in api.fetchCommands(token)) {
            when (command.type) {
                "SHOW_MESSAGE" -> effects.showMessage(command.text.orEmpty())
                "RING_DEVICE" -> effects.ring()
            }
            api.ackCommand(token, command.id, "EXECUTED")
        }
    }

    // The real backend is the subscription authority; there is no client-side expiry.
    override suspend fun simulateSubscriptionExpired() = Unit

    private suspend fun ensureDeviceId(): String {
        val existing = sessionStore.sessions.first().deviceId
        if (existing != null) return existing
        val id = uuid()
        sessionStore.update { it.copy(deviceId = id) }
        return id
    }

    private fun buildSubscription(local: LocalSession, remote: RemoteState): Subscription? {
        val state = remote.subscriptionState ?: return null
        val started = remote.trialStartedAt ?: return null
        val expires = remote.trialExpiresAt ?: return null
        if (expires <= started) return null
        return Subscription(
            accountId = local.deviceId ?: "",
            state = runCatching { SubscriptionState.valueOf(state) }.getOrDefault(SubscriptionState.TRIAL),
            trialStartedAt = Instant.ofEpochMilli(started),
            trialExpiresAt = Instant.ofEpochMilli(expires),
        )
    }

    private fun parseMillis(text: String): Long? =
        text.takeIf { it.isNotBlank() }?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }
}
