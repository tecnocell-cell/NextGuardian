package com.nexguardian.agent.feature.permissions

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.nexguardian.agent.ui.*

/** The consent text is versioned; the version travels with every sample it authorises. */
const val LOCATION_CONSENT_VERSION = "2026-09-01"

/**
 * Prominent disclosure, shown before any location permission is requested.
 *
 * It says what is collected, how often, who sees it and how to stop — in plain words and
 * before the system dialog, not after. Anything vaguer would be dark-patterned consent.
 */
@Composable fun LocationConsentScreen(
    sharing: Boolean,
    pending: Int,
    busy: Boolean,
    error: String?,
    back: () -> Unit,
    grant: () -> Unit,
    revoke: () -> Unit,
) {
    var confirmation by rememberSaveable { mutableStateOf(false) }
    Page("Compartilhar localização", "Você decide, e pode parar quando quiser.", "consent_title") {
        InfoCard("O que é enviado") {
            Text("Sua posição aproximada, a precisão da leitura e o horário.")
            Text("Nada mais: sem mensagens, sem fotos, sem o que você faz no aparelho.")
        }
        InfoCard("Quando") {
            Text("A cada 15 minutos, enquanto o compartilhamento estiver ligado.")
            Text("Não é rastreamento contínuo: o Android pode atrasar ou suspender as leituras.")
            Text("Sem internet, as posições ficam guardadas no aparelho e sobem quando a conexão voltar.")
        }
        InfoCard("Quem vê") {
            Text("Apenas os responsáveis pela conta à qual este aparelho está vinculado.")
            Text("O prazo de guarda é definido na conta e as posições antigas são apagadas.")
        }
        InfoCard("Como parar") {
            Text("Desligue aqui a qualquer momento. A coleta para na hora e o que ainda não foi enviado é descartado.")
            Text("Enquanto estiver ligado, um aviso fica visível na barra de notificações.")
        }
        if (sharing && pending > 0) Detail("Aguardando envio", "$pending posições")
        ErrorMessage(error)
        if (sharing) {
            Detail("Estado", "Compartilhando")
            TextButton(onClick = { confirmation = true }, enabled = !busy,
                modifier = Modifier.testTag("consent_revoke")) { Text("Parar de compartilhar") }
        } else {
            PrimaryButton("Aceitar e compartilhar", "consent_grant", enabled = !busy, action = grant)
        }
        PrimaryButton("Voltar ao status", "consent_back", action = back)
    }
    if (confirmation) AlertDialog(
        onDismissRequest = { if (!busy) confirmation = false },
        title = { Text("Parar de compartilhar?") },
        text = { Text("A coleta para imediatamente. As posições ainda não enviadas serão descartadas; as já enviadas seguem o prazo de guarda da conta.") },
        confirmButton = { TextButton(onClick = { confirmation = false; revoke() }, enabled = !busy,
            modifier = Modifier.testTag("confirm_consent_revoke")) { Text("Parar") } },
        dismissButton = { TextButton(onClick = { confirmation = false }) { Text("Cancelar") } }
    )
}
