package com.nexguardian.agent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val graph = application as NexGuardianApplication
        setContent {
            val model: AgentViewModel = viewModel(factory = object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    require(modelClass.isAssignableFrom(AgentViewModel::class.java))
                    @Suppress("UNCHECKED_CAST")
                    return AgentViewModel(graph.repository, graph.deviceInfo) as T
                }
            })
            val consentModel: LocationConsentViewModel = viewModel(factory = object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    require(modelClass.isAssignableFrom(LocationConsentViewModel::class.java))
                    @Suppress("UNCHECKED_CAST")
                    return LocationConsentViewModel(
                        graph.consentStore, graph.locationQueue, graph.locationCollector
                    ) as T
                }
            })
            NexGuardianApp(model, consentModel)
        }
    }
}
