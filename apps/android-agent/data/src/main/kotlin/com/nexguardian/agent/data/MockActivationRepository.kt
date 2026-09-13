package com.nexguardian.agent.data
import com.nexguardian.agent.domain.*
import com.nexguardian.agent.service.heartbeat.*
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.flow.*

object DemoAuthority {
    // Fixed server fixtures: never calculate entitlement from the device clock.
    val serverNow: Instant = Instant.parse("2026-09-11T12:00:00Z")
    val account = Account("account-demo", "Família de demonstração")
    val validCode = ActivationCode("NEX-48H", account.id, Instant.parse("2026-09-12T12:00:00Z"))
    val expiredCode = ActivationCode("EXPIRADO", account.id, Instant.parse("2026-09-10T12:00:00Z"))
    fun subscription(state: SubscriptionState = SubscriptionState.TRIAL) = Subscription(
        account.id, state, Instant.parse("2026-09-11T12:00:00Z"), Instant.parse("2026-09-13T12:00:00Z")
    )
}
class MockActivationRepository(
    private val store: SessionStore, private val info: DeviceInfo,
    private val uuid: () -> String = { UUID.randomUUID().toString() }
) : ActivationRepository {
    private val connection = MutableStateFlow(ConnectionState.UNKNOWN)
    override val snapshots = combine(store.sessions, connection) { local, network ->
        AgentSnapshot(true, local,
            if (local.activationState in setOf(ActivationState.CONFIRMED, ActivationState.REVOKED))
                DemoAuthority.subscription(local.demoSubscriptionState) else null,
            network, if (local.pairingState != DevicePairingState.UNPAIRED) DemoAuthority.account else null)
    }
    override suspend fun validate(code: String): ActivationError? {
        val normalized = code.trim().uppercase()
        val known = when (normalized) {
            DemoAuthority.validCode.value -> DemoAuthority.validCode
            DemoAuthority.expiredCode.value -> DemoAuthority.expiredCode
            else -> null
        }
        val error = ActivationValidator.validate(normalized, known, DemoAuthority.serverNow)
        if (error != null) return error
        store.update { it.copy(deviceId = it.deviceId ?: uuid(),
            pairingState = PairingTransitions.request(it.pairingState), activationState = ActivationState.VALIDATED) }
        return null
    }
    override suspend fun confirm() {
        store.update { it.copy(pairingState = PairingTransitions.confirm(it.pairingState), activationState = ActivationState.CONFIRMED) }
    }
    override suspend fun revoke() {
        store.update { it.copy(pairingState = PairingTransitions.revoke(it.pairingState), activationState = ActivationState.REVOKED) }
    }
    override suspend fun simulateHeartbeat() {
        val current = store.sessions.first()
        require(current.pairingState == DevicePairingState.PAIRED)
        val timestamp = MockHeartbeatGateway(DemoAuthority.serverNow).send(
            mockHeartbeat(requireNotNull(current.deviceId), info, DemoAuthority.serverNow))
        store.update {
            require(it.pairingState == DevicePairingState.PAIRED)
            it.copy(lastSync = timestamp)
        }
        connection.value = ConnectionState.ONLINE
    }
    override suspend fun simulateSubscriptionExpired() {
        store.update {
            require(it.pairingState == DevicePairingState.PAIRED)
            it.copy(demoSubscriptionState = SubscriptionState.EXPIRED)
        }
    }
}
