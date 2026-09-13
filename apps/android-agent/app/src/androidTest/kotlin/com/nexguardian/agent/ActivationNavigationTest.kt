package com.nexguardian.agent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.lifecycle.ViewModelStore
import com.nexguardian.agent.data.MockActivationRepository
import com.nexguardian.agent.domain.*
import kotlinx.coroutines.flow.*
import org.junit.After
import org.junit.Rule
import org.junit.Test

class ActivationNavigationTest {
    @get:Rule val compose = createComposeRule()
    private val models = ViewModelStore()
    @After fun close() { models.clear() }
    @Test fun invalidExpiredAndHappyPathThroughAllScreens() {
        val store = object : SessionStore {
            private val local = MutableStateFlow(LocalSession())
            override val sessions = local.asStateFlow()
            override suspend fun update(transform: (LocalSession) -> LocalSession) { local.update(transform) }
        }
        val info = DeviceInfo("Demo phone", "Demo", "Demo", "17", "0.1.0-demo")
        val model = AgentViewModel(MockActivationRepository(store, info), info)
        models.put("demo", model)
        compose.setContent { NexGuardianApp(model) }
        compose.waitUntil(10_000) { compose.onAllNodesWithTag("welcome_start").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("welcome_start").performScrollTo().performClick()
        compose.onNodeWithTag("activation_code").performTextInput("INVALID")
        compose.onNodeWithTag("activation_submit").performScrollTo().performClick()
        compose.onNodeWithTag("error_message").assertTextContains("Código inválido", substring = true)
        compose.onNodeWithTag("activation_code").performScrollTo().performTextReplacement("EXPIRADO")
        compose.onNodeWithTag("activation_submit").performScrollTo().performClick()
        compose.onNodeWithTag("error_message").assertTextContains("Código expirado", substring = true)
        compose.onNodeWithTag("activation_code").performScrollTo().performTextReplacement("NEX-48H")
        compose.onNodeWithTag("activation_submit").performScrollTo().performClick()
        compose.onNodeWithTag("pairing_title").assertExists()
        compose.onNodeWithTag("pairing_confirm").performScrollTo().performClick()
        compose.onNodeWithTag("status_title").assertExists()
        compose.onNodeWithText("Pareado").assertExists()
        compose.onNodeWithText("Teste grátis").assertExists()
        compose.onNodeWithTag("status_settings").performScrollTo().performClick()
        compose.onNodeWithTag("settings_title").assertExists()
        compose.onNodeWithText("Simular trial expirado").performScrollTo().performClick()
        compose.onNodeWithTag("settings_back").performScrollTo().performClick()
        compose.onNodeWithText("Expirada").assertExists()
        compose.onNodeWithText("Pareado").assertExists()
        compose.onNodeWithTag("status_settings").performScrollTo().performClick()
        compose.onNodeWithTag("settings_revoke").performScrollTo().performClick()
        compose.onNodeWithTag("confirm_revoke").performClick()
        compose.onNodeWithText("Revogado").assertExists()
        compose.onNodeWithText("Expirada").assertExists()
    }
}
