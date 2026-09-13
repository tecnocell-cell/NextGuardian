package com.nexguardian.agent.core.network

import kotlinx.coroutines.flow.Flow

/**
 * Remote-session state kept locally to render status and drive the enrollment flow.
 * NOTE: tokens are an interim in app-private storage (backups disabled); Keystore-backed
 * protection is a planned hardening follow-up (see docs 18/22).
 */
data class RemoteState(
    val activationTicket: String? = null,
    val pairingId: String? = null,
    val pairingTicket: String? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val accountName: String? = null,
    val subscriptionState: String? = null,
    val trialStartedAt: Long? = null,
    val trialExpiresAt: Long? = null,
    val connection: String = "UNKNOWN",
)

interface RemoteStateStore {
    val state: Flow<RemoteState>
    suspend fun update(transform: (RemoteState) -> RemoteState)
}
