package com.nexguardian.agent

import com.nexguardian.agent.core.network.ApiException
import com.nexguardian.agent.core.network.HttpResult
import com.nexguardian.agent.core.network.NexGuardianApi
import com.nexguardian.agent.domain.DeviceInfo
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

class NexGuardianApiTest {
    private val info = DeviceInfo("Pixel", "Google", "Pixel 8", "15", "0.1.0")
    private fun api(handler: (String, String, String?, String?) -> HttpResult) =
        NexGuardianApi(FakeHttpClient(handler)) { "idem" }

    @Test fun validateMapsResponse() = runTest {
        val api = api { _, path, _, _ ->
            assertEquals("/activation/validate", path)
            HttpResult(200, """{"activationTicket":"tkt","accountDisplayName":"Família","expiresAt":"2026-01-01T00:00:00Z"}""")
        }
        val result = api.validateActivation("NG-1", "dev")
        assertEquals("tkt", result.activationTicket)
        assertEquals("Família", result.accountDisplayName)
    }

    @Test fun nonSuccessThrowsApiException() = runTest {
        val api = api { _, _, _, _ -> HttpResult(400, """{"error":"x"}""") }
        try {
            api.validateActivation("bad", "dev")
            fail("expected ApiException")
        } catch (e: ApiException) {
            assertEquals(400, e.status)
        }
    }

    @Test fun confirmMapsNestedObjects() = runTest {
        val api = api { _, _, _, _ ->
            HttpResult(200, """{"device":{"pairingState":"PAIRED"},"session":{"accessToken":"acc","refreshToken":"ref","accessExpiresAt":"t"},"subscription":{"state":"TRIAL","trialStartedAt":"2026-01-01T00:00:00Z","trialExpiresAt":"2026-01-03T00:00:00Z"}}""")
        }
        val result = api.confirmPair("pt", "pid", "dev")
        assertEquals("PAIRED", result.pairingState)
        assertEquals("acc", result.accessToken)
        assertEquals("TRIAL", result.subscriptionState)
    }

    @Test fun pairSendsActivationTicketAsBearer() = runTest {
        val fake = FakeHttpClient { _, _, _, _ -> HttpResult(201, """{"pairingId":"pid","pairingTicket":"pt"}""") }
        val result = NexGuardianApi(fake) { "idem" }.pair("tkt", "dev", info)
        assertEquals("pid", result.pairingId)
        assertEquals("tkt", fake.requests.last().third)
    }
}
