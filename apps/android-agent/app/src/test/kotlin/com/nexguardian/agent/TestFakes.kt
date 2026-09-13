package com.nexguardian.agent

import com.nexguardian.agent.core.network.HttpClient
import com.nexguardian.agent.core.network.HttpResult
import com.nexguardian.agent.core.network.RemoteState
import com.nexguardian.agent.core.network.RemoteStateStore
import com.nexguardian.agent.domain.LocalSession
import com.nexguardian.agent.domain.SessionStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

class FakeHttpClient(
    val handler: (method: String, path: String, bearer: String?, body: String?) -> HttpResult,
) : HttpClient {
    val requests = mutableListOf<Triple<String, String, String?>>()
    override suspend fun postJson(path: String, bearer: String?, idempotencyKey: String?, body: String): HttpResult {
        requests.add(Triple("POST", path, bearer))
        return handler("POST", path, bearer, body)
    }
    override suspend fun getJson(path: String, bearer: String?): HttpResult {
        requests.add(Triple("GET", path, bearer))
        return handler("GET", path, bearer, null)
    }
}

class InMemorySessionStore(initial: LocalSession = LocalSession()) : SessionStore {
    private val flow = MutableStateFlow(initial)
    override val sessions: Flow<LocalSession> = flow
    override suspend fun update(transform: (LocalSession) -> LocalSession) { flow.value = transform(flow.value) }
}

class InMemoryRemoteStateStore(initial: RemoteState = RemoteState()) : RemoteStateStore {
    private val flow = MutableStateFlow(initial)
    override val state: Flow<RemoteState> = flow
    override suspend fun update(transform: (RemoteState) -> RemoteState) { flow.value = transform(flow.value) }
}
