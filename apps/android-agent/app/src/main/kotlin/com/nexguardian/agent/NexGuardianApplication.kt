package com.nexguardian.agent
import android.app.Application
import android.os.Build
import com.nexguardian.agent.core.network.DataStoreRemoteStateStore
import com.nexguardian.agent.core.network.JdkHttpClient
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.core.network.agentRemotePreferences
import com.nexguardian.agent.core.storage.*
import com.nexguardian.agent.data.MockActivationRepository
import com.nexguardian.agent.data.RemoteActivationRepository
import com.nexguardian.agent.domain.ActivationRepository
import com.nexguardian.agent.domain.DeviceInfo
class NexGuardianApplication : Application() {
    val deviceInfo by lazy { DeviceInfo(Build.MODEL, Build.MANUFACTURER, Build.MODEL, Build.VERSION.RELEASE, BuildConfig.VERSION_NAME) }
    val repository: ActivationRepository by lazy {
        val session = PreferencesSessionStore(agentPreferences)
        if (BuildConfig.USE_REAL_API) {
            val api = NexGuardianApi(JdkHttpClient(BuildConfig.API_BASE_URL))
            RemoteActivationRepository(api, session, DataStoreRemoteStateStore(agentRemotePreferences), deviceInfo)
        } else {
            MockActivationRepository(session, deviceInfo)
        }
    }
}
