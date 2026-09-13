package com.nexguardian.agent.core.network

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.agentRemotePreferences by preferencesDataStore(name = "nexguardian_remote")

/** Token/ticket fields are stored encrypted via [cipher] (Keystore-backed in production). */
class DataStoreRemoteStateStore(
    private val store: DataStore<Preferences>,
    private val cipher: SecretCipher = PlaintextCipher,
) : RemoteStateStore {
    private object Keys {
        val activationTicket = stringPreferencesKey("activationTicket")
        val pairingId = stringPreferencesKey("pairingId")
        val pairingTicket = stringPreferencesKey("pairingTicket")
        val accessToken = stringPreferencesKey("accessToken")
        val refreshToken = stringPreferencesKey("refreshToken")
        val accountName = stringPreferencesKey("accountName")
        val subscriptionState = stringPreferencesKey("subscriptionState")
        val trialStartedAt = longPreferencesKey("trialStartedAt")
        val trialExpiresAt = longPreferencesKey("trialExpiresAt")
        val connection = stringPreferencesKey("connection")
    }

    // Reads the stored (encrypted-at-rest) representation verbatim.
    private fun decodeStored(p: Preferences) = RemoteState(
        activationTicket = p[Keys.activationTicket],
        pairingId = p[Keys.pairingId],
        pairingTicket = p[Keys.pairingTicket],
        accessToken = p[Keys.accessToken],
        refreshToken = p[Keys.refreshToken],
        accountName = p[Keys.accountName],
        subscriptionState = p[Keys.subscriptionState],
        trialStartedAt = p[Keys.trialStartedAt],
        trialExpiresAt = p[Keys.trialExpiresAt],
        connection = p[Keys.connection] ?: "UNKNOWN",
    )

    private fun writeStored(p: MutablePreferences, state: RemoteState) {
        putOrRemove(p, Keys.activationTicket, state.activationTicket)
        putOrRemove(p, Keys.pairingId, state.pairingId)
        putOrRemove(p, Keys.pairingTicket, state.pairingTicket)
        putOrRemove(p, Keys.accessToken, state.accessToken)
        putOrRemove(p, Keys.refreshToken, state.refreshToken)
        putOrRemove(p, Keys.accountName, state.accountName)
        putOrRemove(p, Keys.subscriptionState, state.subscriptionState)
        state.trialStartedAt?.let { p[Keys.trialStartedAt] = it } ?: p.remove(Keys.trialStartedAt)
        state.trialExpiresAt?.let { p[Keys.trialExpiresAt] = it } ?: p.remove(Keys.trialExpiresAt)
        p[Keys.connection] = state.connection
    }

    override val state: Flow<RemoteState> = store.data.map { RemoteStateCrypto.reveal(decodeStored(it), cipher) }

    override suspend fun update(transform: (RemoteState) -> RemoteState) {
        store.edit { p ->
            val current = RemoteStateCrypto.reveal(decodeStored(p), cipher)
            writeStored(p, RemoteStateCrypto.protect(transform(current), cipher))
        }
    }

    private fun putOrRemove(p: MutablePreferences, key: Preferences.Key<String>, value: String?) {
        if (value != null) p[key] = value else p.remove(key)
    }
}
