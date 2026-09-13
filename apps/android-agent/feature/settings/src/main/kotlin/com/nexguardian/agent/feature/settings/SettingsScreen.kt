package com.nexguardian.agent.feature.settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.nexguardian.agent.domain.DevicePairingState
import com.nexguardian.agent.ui.*
@Composable fun SettingsScreen(pairing: DevicePairingState, busy: Boolean, error: String?,
    back: () -> Unit, revoke: () -> Unit, expire: () -> Unit) {
    var confirmation by rememberSaveable { mutableStateOf(false) }
    Page("Suas escolhas", "Transparência e controle sobre este vínculo.", "settings_title") {
        InfoCard("Dados locais") {
            Text("A demonstração guarda apenas um UUID próprio, estados e a última sincronização fictícia.")
            Text("Não guarda senha, token em texto puro ou conteúdo privado.")
        }
        InfoCard("Modo de demonstração") {
            Text("Servidor, ativação, assinatura e conexão estão simulados.")
            Text("Nenhuma permissão sensível é solicitada.")
        }
        ErrorMessage(error)
        if (pairing == DevicePairingState.PAIRED) {
            OutlinedButton(onClick = expire, enabled = !busy) { Text("Simular trial expirado") }
            TextButton(onClick = { confirmation = true }, enabled = !busy,
                modifier = Modifier.testTag("settings_revoke")) { Text("Revogar vínculo") }
        }
        PrimaryButton("Voltar ao status", "settings_back", action = back)
    }
    if (confirmation) AlertDialog(
        onDismissRequest = { if (!busy) confirmation = false },
        title = { Text("Revogar este vínculo?") },
        text = { Text("O aparelho ficará revogado. O ID será preservado e um novo vínculo não reiniciará o trial fictício.") },
        confirmButton = { TextButton(onClick = { confirmation = false; revoke() }, enabled = !busy,
            modifier = Modifier.testTag("confirm_revoke")) { Text("Confirmar revogação") } },
        dismissButton = { TextButton(onClick = { confirmation = false }) { Text("Cancelar") } }
    )
}
