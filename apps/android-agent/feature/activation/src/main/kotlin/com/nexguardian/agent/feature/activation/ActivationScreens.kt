package com.nexguardian.agent.feature.activation
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.KeyboardCapitalization
import com.nexguardian.agent.ui.*

@Composable fun WelcomeScreen(start: () -> Unit) {
    Page("Cuidado começa com confiança.", "Vincule este aparelho à sua conta, com clareza e confirmação.") {
        InfoCard("Uma conexão consciente") {
            Text("1. Informe o código da sua conta.")
            Text("2. Confira o aparelho e confirme o vínculo.")
            Text("3. Acompanhe o status e gerencie suas escolhas.")
        }
        InfoCard("Uma demonstração, por enquanto") {
            Text("Não há servidor conectado. Nenhum recurso de monitoramento está ativo.")
        }
        PrimaryButton("Começar ativação", "welcome_start", action = start)
    }
}
@Composable fun ActivationCodeScreen(busy: Boolean, error: String?, changed: () -> Unit,
    submit: (String) -> Unit, back: () -> Unit) {
    var code by rememberSaveable { mutableStateOf("") }
    Page("Ative seu aparelho", "Insira o código de ativação para encontrar a conta de destino.") {
        OutlinedTextField(value = code, onValueChange = { code = it.take(64); changed() },
            modifier = Modifier.fillMaxWidth().testTag("activation_code"),
            label = { Text("Código de ativação") }, singleLine = true, enabled = !busy,
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters))
        ErrorMessage(error)
        InfoCard("Códigos de demonstração") {
            Text("NEX-48H · código válido")
            Text("EXPIRADO · código vencido")
            Text("Qualquer outro código simula uma validação inválida.")
        }
        PrimaryButton(if (busy) "Validando..." else "Validar código", "activation_submit",
            enabled = !busy && code.isNotBlank()) { submit(code) }
        TextButton(onClick = back, enabled = !busy) { Text("Voltar") }
    }
}
