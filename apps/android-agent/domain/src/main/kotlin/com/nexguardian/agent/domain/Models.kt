package com.nexguardian.agent.domain
import java.time.Instant

enum class DevicePairingState { UNPAIRED, PAIRING_PENDING, PAIRED, REVOKED }
enum class SubscriptionState { TRIAL, ACTIVE, EXPIRED, CANCELLED }
enum class ConnectionState { ONLINE, OFFLINE, UNKNOWN }
enum class ActivationState { NOT_STARTED, VALIDATED, CONFIRMED, REVOKED }
data class Account(val id: String, val name: String)
data class User(val id: String, val accountId: String, val name: String, val email: String)
data class Device(val id: String, val accountId: String?, val name: String, val pairingState: DevicePairingState)
data class ActivationCode(val value: String, val accountId: String, val expiresAt: Instant)
data class Subscription(val accountId: String, val state: SubscriptionState,
    val trialStartedAt: Instant, val trialExpiresAt: Instant) {
    init { require(trialExpiresAt.isAfter(trialStartedAt)) }
    // Receive an authoritative snapshot, never grant a trial from the handset clock.
    fun withServerState(serverState: SubscriptionState) = copy(state = serverState)
}
data class DeviceInfo(val name: String, val manufacturer: String, val model: String,
    val androidVersion: String, val appVersion: String)
data class LocalSession(
    val deviceId: String? = null,
    val pairingState: DevicePairingState = DevicePairingState.UNPAIRED,
    val activationState: ActivationState = ActivationState.NOT_STARTED,
    val lastSync: Instant? = null,
    val demoSubscriptionState: SubscriptionState = SubscriptionState.TRIAL
)
data class AgentSnapshot(
    val initialized: Boolean = false,
    val session: LocalSession = LocalSession(),
    val subscription: Subscription? = null,
    val connection: ConnectionState = ConnectionState.UNKNOWN,
    val account: Account? = null
)
enum class ActivationError { INVALID, EXPIRED }
object PairingTransitions {
    fun request(from: DevicePairingState): DevicePairingState {
        require(from == DevicePairingState.UNPAIRED || from == DevicePairingState.REVOKED)
        return DevicePairingState.PAIRING_PENDING
    }
    fun confirm(from: DevicePairingState): DevicePairingState {
        require(from == DevicePairingState.PAIRING_PENDING)
        return DevicePairingState.PAIRED
    }
    fun revoke(from: DevicePairingState): DevicePairingState {
        require(from == DevicePairingState.PAIRED)
        return DevicePairingState.REVOKED
    }
}
object ActivationValidator {
    fun validate(input: String, known: ActivationCode?, serverNow: Instant): ActivationError? = when {
        known == null || input.trim() != known.value -> ActivationError.INVALID
        !known.expiresAt.isAfter(serverNow) -> ActivationError.EXPIRED
        else -> null
    }
}
