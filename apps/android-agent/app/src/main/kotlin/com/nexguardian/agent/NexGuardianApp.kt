package com.nexguardian.agent
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import com.nexguardian.agent.feature.permissions.*
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nexguardian.agent.ui.*

@Composable fun NexGuardianApp(model: AgentViewModel, consentModel: LocationConsentViewModel? = null) {
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
                                activate = { go("activation") },
                                location = consentModel?.let { { go("location") } })
                        }
                        composable("location") {
                            val consent = consentModel ?: return@composable
                            val consentState by consent.uiState.collectAsStateWithLifecycle()
                            val context = LocalContext.current
                            // The system dialog comes AFTER the disclosure and only if the user
                            // accepted it. Denying the OS permission leaves consent recorded but
                            // nothing is collected, which the screen reports honestly.
                            val permission = rememberLauncherForActivityResult(
                                ActivityResultContracts.RequestMultiplePermissions()
                            ) { granted ->
                                if (granted.values.any { it }) LocationService.start(context)
                            }
                            LaunchedEffect(Unit) { consent.refresh() }
                            LocationConsentScreen(
                                sharing = consentState.sharing,
                                pending = consentState.pending,
                                busy = consentState.busy,
                                error = consentState.error,
                                back = { nav.popBackStack() },
                                grant = {
                                    consent.grant(LOCATION_CONSENT_VERSION) {
                                        permission.launch(arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION,
                                        ))
                                    }
                                },
                                revoke = { consent.revoke { LocationService.stop(context) } },
                            )
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
