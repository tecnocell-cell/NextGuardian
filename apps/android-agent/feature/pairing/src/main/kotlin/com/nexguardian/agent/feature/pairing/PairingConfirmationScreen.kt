package com.nexguardian.agent.feature.pairing
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.nexguardian.agent.ui.*
@Composable fun PairingConfirmationScreen(account: String, device: String, busy: Boolean,
    error: String?, confirm: () -> Unit) {
    Page("Confirme o vínculo", "O aparelho está aguardando sua confirmação.", "pairing_title") {
        InfoCard("Confira antes de continuar") {
            Detail("Conta de demonstração", account)
            Detail("Aparelho", device)
            Detail("Vínculo", "Pareamento pendente")
        }
        Text("Ao confirmar, esta demonstração exibirá um trial fictício de 48 horas. Na versão conectada, as datas serão definidas exclusivamente pelo servidor.")
        Text("O vínculo não autoriza acesso a câmera, microfone, mensagens ou localização.")
        ErrorMessage(error)
        PrimaryButton("Confirmar vínculo", "pairing_confirm", !busy, confirm)
    }
}
