package com.nexguardian.agent
import android.app.Application
import android.os.Build
import com.nexguardian.agent.core.network.DataStoreRemoteStateStore
import com.nexguardian.agent.core.network.JdkHttpClient
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.core.network.agentRemotePreferences
import com.nexguardian.agent.core.storage.*
import com.nexguardian.agent.data.LocationCollector
import com.nexguardian.agent.data.MockActivationRepository
import com.nexguardian.agent.data.RemoteActivationRepository
import com.nexguardian.agent.domain.ActivationRepository
import com.nexguardian.agent.domain.ConsentStore
import com.nexguardian.agent.domain.DeviceInfo
import kotlinx.coroutines.flow.first
class NexGuardianApplication : Application() {
    val deviceInfo by lazy { DeviceInfo(Build.MODEL, Build.MANUFACTURER, Build.MODEL, Build.VERSION.RELEASE, BuildConfig.VERSION_NAME) }

    private val remoteStateStore by lazy { DataStoreRemoteStateStore(agentRemotePreferences, KeystoreCipher()) }
    private val api by lazy { NexGuardianApi(JdkHttpClient(BuildConfig.API_BASE_URL)) }

    val consentStore: ConsentStore by lazy { DataStoreConsentStore(agentLocationPreferences) }
    val locationQueue by lazy { DataStoreLocationQueue(agentLocationPreferences) }

    /**
     * Location needs a real device session, so the collector only makes sense against the
     * real API. In the offline demo build there is no token and nothing is ever sent.
     */
    val locationCollector by lazy {
        LocationCollector(
            api = api,
            consent = consentStore,
            queue = locationQueue,
            provider = AndroidLocationProvider(this),
            accessToken = { if (BuildConfig.USE_REAL_API) remoteStateStore.state.first().accessToken else null },
        )
    }

    val repository: ActivationRepository by lazy {
        val session = PreferencesSessionStore(agentPreferences)
        if (BuildConfig.USE_REAL_API) {
            RemoteActivationRepository(api, session, remoteStateStore, deviceInfo, AndroidCommandEffects(this))
        } else {
            MockActivationRepository(session, deviceInfo)
        }
    }
}
