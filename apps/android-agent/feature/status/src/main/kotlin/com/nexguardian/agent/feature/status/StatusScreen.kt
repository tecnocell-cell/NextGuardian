package com.nexguardian.agent.feature.status
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import com.nexguardian.agent.domain.*
import com.nexguardian.agent.ui.*
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
private fun date(value: Instant?): String = value?.atZone(ZoneId.systemDefault())
    ?.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm z")) ?: "Ainda não realizada"
fun DevicePairingState.label() = when(this) {
    DevicePairingState.UNPAIRED -> "Não pareado"
    DevicePairingState.PAIRING_PENDING -> "Pareamento pendente"
    DevicePairingState.PAIRED -> "Pareado"
    DevicePairingState.REVOKED -> "Revogado"
}
private fun SubscriptionState.label() = when(this) {
    SubscriptionState.TRIAL -> "Teste grátis"
    SubscriptionState.ACTIVE -> "Ativa"
    SubscriptionState.EXPIRED -> "Expirada"
    SubscriptionState.CANCELLED -> "Cancelada"
}
@Composable fun StatusScreen(snapshot: AgentSnapshot, info: DeviceInfo, busy: Boolean, error: String?,
    settings: () -> Unit, heartbeat: () -> Unit, activate: () -> Unit) {
    Page("Seu aparelho", "Vínculo, assinatura e conexão: estados independentes.", "status_title") {
        InfoCard("Visão geral") {
            Detail("Status do vínculo", snapshot.session.pairingState.label())
            Detail("Status da assinatura", snapshot.subscription?.state?.label() ?: "Não iniciada")
            snapshot.subscription?.let { Detail("Expira em (simulação)", date(it.trialExpiresAt)) }
            Detail("Conexão (simulada)", when(snapshot.connection) {
                ConnectionState.ONLINE -> "Online"
                ConnectionState.OFFLINE -> "Offline"
                ConnectionState.UNKNOWN -> "Desconhecida"
            })
        }
        PrimaryButton("Configurações", "status_settings", action = settings)
        InfoCard("Identificação do aparelho") {
            Detail("Nome", info.name)
            Detail("Android", info.androidVersion)
            Detail("Versão do aplicativo", info.appVersion)
            Detail("ID interno provisório", snapshot.session.deviceId ?: "Gerado na primeira ativação")
            Detail("Última sincronização (simulada)", date(snapshot.session.lastSync))
        }
        ErrorMessage(error)
        if (snapshot.session.pairingState == DevicePairingState.PAIRED) {
            OutlinedButton(onClick = heartbeat, enabled = !busy) { Text("Simular sincronização") }
        } else if (snapshot.session.pairingState == DevicePairingState.REVOKED) {
            PrimaryButton("Ativar novamente", "reactivate", !busy, activate)
        }
        Text("Datas e conexão são fictícias. O aplicativo não concede nem renova trial pelo relógio do aparelho.",
            style = MaterialTheme.typography.bodySmall)
    }
}
