package com.nexguardian.agent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.*
import com.nexguardian.agent.domain.*
import com.nexguardian.agent.feature.activation.*
import com.nexguardian.agent.feature.pairing.*
import com.nexguardian.agent.feature.status.*
import com.nexguardian.agent.feature.settings.*
import com.nexguardian.agent.ui.*

@Composable fun NexGuardianApp(model: AgentViewModel) {
    val snapshot by model.snapshot.collectAsStateWithLifecycle()
    val action by model.actionState.collectAsStateWithLifecycle()
    GuardianTheme {
        Scaffold(topBar = {
            Surface(color = MaterialTheme.colorScheme.primaryContainer) {
                Text("DEMONSTRAÇÃO · SEM SERVIDOR",
                    Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 24.dp, vertical = 10.dp),
                    style = MaterialTheme.typography.labelMedium)
            }
        }) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                if (!snapshot.initialized) {
                    Column(Modifier.align(Alignment.Center).padding(24.dp)) {
                        if (action.error == null) CircularProgressIndicator()
                        ErrorMessage(action.error)
                    }
                } else {
                    val nav = rememberNavController()
                    val start = remember { when(snapshot.session.pairingState) {
                        DevicePairingState.PAIRING_PENDING -> "pairing"
                        DevicePairingState.PAIRED, DevicePairingState.REVOKED -> "status"
                        DevicePairingState.UNPAIRED -> "welcome"
                    } }
                    fun go(route: String) { model.clearError(); nav.navigate(route) { launchSingleTop = true } }
                    NavHost(navController = nav, startDestination = start) {
                        composable("welcome") { WelcomeScreen { go(if (snapshot.session.pairingState == DevicePairingState.PAIRING_PENDING) "pairing" else "activation") } }
                        composable("activation") {
                            ActivationCodeScreen(action.busy, action.error, model::clearError,
                                submit = { model.validate(it) {
                                    nav.navigate("pairing") { popUpTo("activation") { inclusive = true } }
                                } }, back = { nav.popBackStack() })
                        }
                        composable("pairing") {
                            PairingConfirmationScreen(snapshot.account?.name ?: "Família de demonstração",
                                model.deviceInfo.name, action.busy, action.error) {
                                model.confirm {
                                    nav.navigate("status") { popUpTo(nav.graph.id); launchSingleTop = true }
                                }
                            }
                        }
                        composable("status") {
                            StatusScreen(snapshot, model.deviceInfo, action.busy, action.error,
                                settings = { go("settings") }, heartbeat = model::heartbeat,
                                activate = { go("activation") })
                        }
                        composable("settings") {
                            SettingsScreen(snapshot.session.pairingState, action.busy, action.error,
                                back = { nav.popBackStack() },
                                revoke = { model.revoke { nav.popBackStack() } },
                                expire = model::expireTrial)
                        }
                    }
                }
            }
        }
    }
}
