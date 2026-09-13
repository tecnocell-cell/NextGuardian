package com.nexguardian.agent
import android.app.Application
import android.os.Build
import com.nexguardian.agent.core.storage.*
import com.nexguardian.agent.data.MockActivationRepository
import com.nexguardian.agent.domain.DeviceInfo
class NexGuardianApplication : Application() {
    val deviceInfo by lazy { DeviceInfo(Build.MODEL, Build.MANUFACTURER, Build.MODEL, Build.VERSION.RELEASE, BuildConfig.VERSION_NAME) }
    val repository by lazy { MockActivationRepository(PreferencesSessionStore(agentPreferences), deviceInfo) }
}
