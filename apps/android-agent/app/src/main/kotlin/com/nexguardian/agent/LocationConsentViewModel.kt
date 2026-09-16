package com.nexguardian.agent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexguardian.agent.data.LocationCollector
import com.nexguardian.agent.domain.ConsentStore
import com.nexguardian.agent.domain.LocationQueue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant

data class ConsentUiState(
    val sharing: Boolean = false,
    val pending: Int = 0,
    val busy: Boolean = false,
    val error: String? = null,
)

/**
 * Holds the consent decision. It records consent but does not start collection: whether the
 * OS permission was granted and whether the service runs are the Activity's business, so
 * that consent can never be implied by a side effect the user did not see.
 */
class LocationConsentViewModel(
    private val consent: ConsentStore,
    private val queue: LocationQueue,
    private val collector: LocationCollector,
    private val now: () -> Instant = { Instant.now() },
) : ViewModel() {

    private val state = MutableStateFlow(ConsentUiState())
    val uiState = state.asStateFlow()

    init { refresh() }

    fun refresh() = perform {
        state.update { it.copy(sharing = consent.current()?.active == true, pending = queue.size()) }
    }

    fun grant(version: String, onGranted: () -> Unit) = perform {
        consent.grant(version, now())
        state.update { it.copy(sharing = true) }
        onGranted()
    }

    fun revoke(onRevoked: () -> Unit) = perform {
        collector.revokeConsent(now())
        state.update { it.copy(sharing = false, pending = 0) }
        onRevoked()
    }

    private fun perform(block: suspend () -> Unit) {
        if (state.value.busy) return
        viewModelScope.launch {
            state.update { it.copy(busy = true, error = null) }
            try {
                block()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                state.update { it.copy(error = "Não foi possível salvar sua escolha. Tente novamente.") }
            } finally {
                state.update { it.copy(busy = false) }
            }
        }
    }
}
