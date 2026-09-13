package com.nexguardian.agent.core.security
import java.security.KeyStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
/** Future credentials use Keystore-backed keys. No key/token/certificate generated now. */
interface DeviceCredentialStore {
    suspend fun hasDeviceKey(): Boolean
    suspend fun deleteDeviceKey()
}
class AndroidKeystoreCredentialStore : DeviceCredentialStore {
    private val alias = "nexguardian.device.identity.v1"
    private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    override suspend fun hasDeviceKey(): Boolean = withContext(Dispatchers.IO) { store().containsAlias(alias) }
    override suspend fun deleteDeviceKey(): Unit = withContext(Dispatchers.IO) { store().deleteEntry(alias) }
}
