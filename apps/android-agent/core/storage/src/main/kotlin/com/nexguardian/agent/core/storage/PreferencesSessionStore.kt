package com.nexguardian.agent.core.storage
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.nexguardian.agent.domain.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant

val Context.agentPreferences by preferencesDataStore(name = "nexguardian_demo")
class PreferencesSessionStore(private val store: DataStore<Preferences>) : SessionStore {
    private object Keys {
        val id = stringPreferencesKey("deviceId")
        val pairing = stringPreferencesKey("pairingState")
        val activation = stringPreferencesKey("activationState")
        val sync = longPreferencesKey("lastSync")
        val subscription = stringPreferencesKey("demoSubscriptionState")
    }
    private inline fun <reified T : Enum<T>> enumOr(value: String?, fallback: T): T =
        enumValues<T>().firstOrNull { it.name == value } ?: fallback
    private fun decode(p: Preferences) = LocalSession(
        p[Keys.id], enumOr(p[Keys.pairing], DevicePairingState.UNPAIRED),
        enumOr(p[Keys.activation], ActivationState.NOT_STARTED),
        p[Keys.sync]?.let(Instant::ofEpochMilli),
        enumOr(p[Keys.subscription], SubscriptionState.TRIAL)
    )
    override val sessions: Flow<LocalSession> = store.data.map(::decode)
    override suspend fun update(transform: (LocalSession) -> LocalSession) {
        store.edit { p ->
            val next = transform(decode(p))
            next.deviceId?.let { p[Keys.id] = it } ?: p.remove(Keys.id)
            p[Keys.pairing] = next.pairingState.name
            p[Keys.activation] = next.activationState.name
            p[Keys.subscription] = next.demoSubscriptionState.name
            next.lastSync?.let { p[Keys.sync] = it.toEpochMilli() } ?: p.remove(Keys.sync)
        }
    }
}
