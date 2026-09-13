package com.nexguardian.agent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexguardian.agent.domain.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
data class ActionUiState(val busy: Boolean = false, val error: String? = null)
class AgentViewModel(val repository: ActivationRepository, val deviceInfo: DeviceInfo) : ViewModel() {
    private val actions = MutableStateFlow(ActionUiState())
    val actionState = actions.asStateFlow()
    val snapshot = repository.snapshots.catch {
        actions.value = ActionUiState(error = "Não foi possível ler os dados locais. Feche e abra o aplicativo para tentar novamente.")
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AgentSnapshot())
    fun clearError() { actions.update { it.copy(error = null) } }
    private fun perform(block: suspend () -> Unit) {
        if (actions.value.busy) return
        viewModelScope.launch {
            actions.value = ActionUiState(busy = true)
            try { block() }
            catch (e: CancellationException) { throw e }
            catch (_: Exception) { actions.value = ActionUiState(error = "Não foi possível concluir. Confira o vínculo e tente novamente.") }
            finally { actions.update { it.copy(busy = false) } }
        }
    }
    fun validate(code: String, success: () -> Unit) = perform {
        when (repository.validate(code)) {
            ActivationError.INVALID -> actions.value = ActionUiState(error = "Código inválido. Use NEX-48H para testar.")
            ActivationError.EXPIRED -> actions.value = ActionUiState(error = "Código expirado. Solicite um novo código.")
            null -> success()
        }
    }
    fun confirm(success: () -> Unit) = perform { repository.confirm(); success() }
    fun revoke(success: () -> Unit) = perform { repository.revoke(); success() }
    fun heartbeat() = perform { repository.simulateHeartbeat() }
    fun expireTrial() = perform { repository.simulateSubscriptionExpired() }
}
