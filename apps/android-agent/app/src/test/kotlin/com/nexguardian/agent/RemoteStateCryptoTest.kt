package com.nexguardian.agent

import com.nexguardian.agent.core.network.RemoteState
import com.nexguardian.agent.core.network.RemoteStateCrypto
import com.nexguardian.agent.core.network.SecretCipher
import org.junit.Assert.assertEquals
import org.junit.Test

class RemoteStateCryptoTest {
    private val cipher = object : SecretCipher {
        override fun encrypt(plain: String) = "enc:$plain"
        override fun decrypt(cipher: String) = cipher.removePrefix("enc:")
    }

    @Test fun encryptsOnlyTokenFieldsAndRoundTrips() {
        val original = RemoteState(
            activationTicket = "at", pairingTicket = "pt", accessToken = "ac", refreshToken = "rf",
            accountName = "Família", subscriptionState = "TRIAL", trialStartedAt = 1, trialExpiresAt = 2, connection = "ONLINE",
        )
        val protectedState = RemoteStateCrypto.protect(original, cipher)
        assertEquals("enc:ac", protectedState.accessToken)
        assertEquals("enc:rf", protectedState.refreshToken)
        assertEquals("enc:at", protectedState.activationTicket)
        // Non-sensitive fields are left in the clear.
        assertEquals("Família", protectedState.accountName)
        assertEquals("TRIAL", protectedState.subscriptionState)
        assertEquals(original, RemoteStateCrypto.reveal(protectedState, cipher))
    }

    @Test fun handlesNullTokens() {
        val state = RemoteState(connection = "UNKNOWN")
        assertEquals(state, RemoteStateCrypto.reveal(RemoteStateCrypto.protect(state, cipher), cipher))
    }
}
