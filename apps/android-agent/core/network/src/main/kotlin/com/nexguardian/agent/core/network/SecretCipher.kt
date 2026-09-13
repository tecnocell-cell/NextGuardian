package com.nexguardian.agent.core.network

/** Encrypts/decrypts secret strings at rest. The production implementation is Keystore-backed. */
interface SecretCipher {
    fun encrypt(plain: String): String
    fun decrypt(cipher: String): String
}

/** Identity cipher for tests and the offline demo (no protection). */
object PlaintextCipher : SecretCipher {
    override fun encrypt(plain: String): String = plain
    override fun decrypt(cipher: String): String = cipher
}

/** Protects only the sensitive token/ticket fields of RemoteState; other fields stay clear. */
object RemoteStateCrypto {
    fun protect(state: RemoteState, cipher: SecretCipher): RemoteState = state.copy(
        activationTicket = state.activationTicket?.let(cipher::encrypt),
        pairingTicket = state.pairingTicket?.let(cipher::encrypt),
        accessToken = state.accessToken?.let(cipher::encrypt),
        refreshToken = state.refreshToken?.let(cipher::encrypt),
    )

    fun reveal(state: RemoteState, cipher: SecretCipher): RemoteState = state.copy(
        activationTicket = state.activationTicket?.let { runCatching { cipher.decrypt(it) }.getOrNull() },
        pairingTicket = state.pairingTicket?.let { runCatching { cipher.decrypt(it) }.getOrNull() },
        accessToken = state.accessToken?.let { runCatching { cipher.decrypt(it) }.getOrNull() },
        refreshToken = state.refreshToken?.let { runCatching { cipher.decrypt(it) }.getOrNull() },
    )
}
