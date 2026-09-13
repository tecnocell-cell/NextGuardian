package com.nexguardian.agent.domain
import kotlinx.coroutines.flow.Flow
interface SessionStore {
    val sessions: Flow<LocalSession>
    suspend fun update(transform: (LocalSession) -> LocalSession)
}
interface ActivationRepository {
    val snapshots: Flow<AgentSnapshot>
    suspend fun validate(code: String): ActivationError?
    suspend fun confirm()
    suspend fun revoke()
    suspend fun simulateHeartbeat()
    suspend fun simulateSubscriptionExpired()
}
