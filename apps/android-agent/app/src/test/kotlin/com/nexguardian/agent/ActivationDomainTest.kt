package com.nexguardian.agent

import com.nexguardian.agent.data.*
import com.nexguardian.agent.domain.*
import com.nexguardian.agent.service.heartbeat.*
import java.time.Duration
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

private class MemoryStore : SessionStore {
    val value = MutableStateFlow(LocalSession())
    override val sessions = value.asStateFlow()
    override suspend fun update(transform: (LocalSession) -> LocalSession) { value.update(transform) }
}
class ActivationDomainTest {
    private val info = DeviceInfo("Test phone", "Test", "Model", "17", "0.1.0-demo")
    @Test fun unpairedBecomesPending() {
        assertEquals(DevicePairingState.PAIRING_PENDING, PairingTransitions.request(DevicePairingState.UNPAIRED))
    }
    @Test fun pendingBecomesPaired() {
        assertEquals(DevicePairingState.PAIRED, PairingTransitions.confirm(DevicePairingState.PAIRING_PENDING))
    }
    @Test fun pairedBecomesRevoked() {
        assertEquals(DevicePairingState.REVOKED, PairingTransitions.revoke(DevicePairingState.PAIRED))
    }
    @Test(expected = IllegalArgumentException::class) fun cannotConfirmWithoutPending() {
        PairingTransitions.confirm(DevicePairingState.UNPAIRED)
    }
    @Test fun trialExpiresOnlyByServerSnapshot() {
        val trial = DemoAuthority.subscription()
        val expired = trial.withServerState(SubscriptionState.EXPIRED)
        assertEquals(SubscriptionState.EXPIRED, expired.state)
        assertEquals(trial.trialStartedAt, expired.trialStartedAt)
        assertEquals(trial.trialExpiresAt, expired.trialExpiresAt)
        assertEquals(Duration.ofHours(48), Duration.between(trial.trialStartedAt, trial.trialExpiresAt))
    }
    @Test fun invalidCodeDoesNotCreateDevice() = runTest {
        val store = MemoryStore()
        val repo = MockActivationRepository(store, info) { "id-test" }
        assertEquals(ActivationError.INVALID, repo.validate("INVALID"))
        assertNull(store.value.value.deviceId)
        assertEquals(DevicePairingState.UNPAIRED, store.value.value.pairingState)
    }
    @Test fun expiredCodeDoesNotAdvanceState() = runTest {
        val store = MemoryStore()
        assertEquals(ActivationError.EXPIRED, MockActivationRepository(store, info).validate("EXPIRADO"))
        assertEquals(ActivationState.NOT_STARTED, store.value.value.activationState)
    }
    @Test fun expiryBoundaryIsExpired() {
        assertEquals(ActivationError.EXPIRED, ActivationValidator.validate(
            DemoAuthority.validCode.value, DemoAuthority.validCode, DemoAuthority.validCode.expiresAt))
    }
    @Test fun validCodeCreatesIdOnceAndRestoresPending() = runTest {
        val store = MemoryStore()
        var calls = 0
        val repo = MockActivationRepository(store, info) { calls++; "stable-id" }
        assertNull(repo.validate(" nex-48h "))
        assertEquals(DevicePairingState.PAIRING_PENDING, store.value.value.pairingState)
        val restarted = MockActivationRepository(store, info)
        assertEquals("stable-id", restarted.snapshots.first().session.deviceId)
        restarted.confirm()
        assertEquals(DevicePairingState.PAIRED, restarted.snapshots.first().session.pairingState)
        assertEquals(1, calls)
    }
    @Test fun connectionIsIndependentFromPairing() = runTest {
        val repo = MockActivationRepository(MemoryStore(), info)
        repo.validate("NEX-48H"); repo.confirm()
        assertEquals(ConnectionState.UNKNOWN, repo.snapshots.first().connection)
        repo.simulateHeartbeat()
        assertEquals(ConnectionState.ONLINE, repo.snapshots.first().connection)
        repo.revoke()
        assertEquals(DevicePairingState.REVOKED, repo.snapshots.first().session.pairingState)
        assertEquals(ConnectionState.ONLINE, repo.snapshots.first().connection)
    }
    @Test fun subscriptionIsIndependentFromPairing() = runTest {
        val repo = MockActivationRepository(MemoryStore(), info)
        repo.validate("NEX-48H"); repo.confirm(); repo.simulateSubscriptionExpired()
        val state = repo.snapshots.first()
        assertEquals(SubscriptionState.EXPIRED, state.subscription?.state)
        assertEquals(DevicePairingState.PAIRED, state.session.pairingState)
    }
    @Test fun reactivationDoesNotRestartTrialOrReplaceId() = runTest {
        val store = MemoryStore()
        val repo = MockActivationRepository(store, info) { "first-id" }
        repo.validate("NEX-48H"); repo.confirm()
        val initial = repo.snapshots.first().subscription!!
        repo.simulateSubscriptionExpired(); repo.revoke()
        repo.validate("NEX-48H"); repo.confirm()
        val again = MockActivationRepository(store, info).snapshots.first()
        assertEquals("first-id", again.session.deviceId)
        assertEquals(initial.trialStartedAt, again.subscription!!.trialStartedAt)
        assertEquals(initial.trialExpiresAt, again.subscription.trialExpiresAt)
        assertEquals(SubscriptionState.EXPIRED, again.subscription.state)
    }
    @Test fun revokedHeartbeatIsRejected() = runTest {
        val repo = MockActivationRepository(MemoryStore(), info)
        repo.validate("NEX-48H"); repo.confirm(); repo.revoke()
        try { repo.simulateHeartbeat(); fail("Must reject revoked device") }
        catch (_: IllegalArgumentException) { }
        assertNull(repo.snapshots.first().session.lastSync)
    }
    @Test fun heartbeatMockUsesAuthorityTimeAndMinimalFields() = runTest {
        val payload = mockHeartbeat("device-id", info, DemoAuthority.serverNow)
        val received = MockHeartbeatGateway(DemoAuthority.serverNow).send(payload)
        assertEquals(DemoAuthority.serverNow, received)
        assertNull(payload.batteryLevel)
        assertEquals(NetworkType.UNKNOWN, payload.networkType)
    }
}
