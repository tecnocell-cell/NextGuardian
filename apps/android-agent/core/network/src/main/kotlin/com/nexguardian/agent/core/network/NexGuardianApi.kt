package com.nexguardian.agent.core.network

import com.nexguardian.agent.domain.DeviceInfo
import com.nexguardian.agent.domain.LocationSample
import java.util.UUID

class ApiException(val status: Int, message: String) : Exception(message)

data class AgentCommand(val id: String, val type: String, val text: String? = null)
data class ValidateResult(val activationTicket: String, val accountDisplayName: String, val expiresAt: String)
data class PairResult(val pairingId: String, val pairingTicket: String)
data class ConfirmResult(
    val pairingState: String,
    val accessToken: String,
    val refreshToken: String,
    val subscriptionState: String,
    val trialStartedAt: String,
    val trialExpiresAt: String,
)
data class GeofenceCrossing(val geofenceId: String, val name: String, val transition: String)
data class ReportLocationsResult(val accepted: Int, val transitions: List<GeofenceCrossing>)
data class HeartbeatResult(
    val serverReceivedAt: String,
    val connectionState: String,
    val subscriptionState: String,
    val trialStartedAt: String,
    val trialExpiresAt: String,
)

/** Typed calls over the NextGuardian OpenAPI contract. Mapping is pure and JVM-testable. */
class NexGuardianApi(
    private val http: HttpClient,
    private val idempotencyKey: () -> String = { UUID.randomUUID().toString() },
) {
    suspend fun validateActivation(code: String, deviceId: String): ValidateResult {
        val result = http.postJson("/activation/validate", null, idempotencyKey(),
            Json.encode(mapOf("code" to code, "deviceId" to deviceId)))
        val body = success(result)
        return ValidateResult(
            activationTicket = body.str("activationTicket").orEmpty(),
            accountDisplayName = body.str("accountDisplayName").orEmpty(),
            expiresAt = body.str("expiresAt").orEmpty(),
        )
    }

    suspend fun pair(activationTicket: String, deviceId: String, info: DeviceInfo): PairResult {
        val result = http.postJson("/devices/pair", activationTicket, idempotencyKey(),
            Json.encode(mapOf("deviceId" to deviceId, "deviceInfo" to info.toMap())))
        val body = success(result)
        return PairResult(body.str("pairingId").orEmpty(), body.str("pairingTicket").orEmpty())
    }

    suspend fun confirmPair(pairingTicket: String, pairingId: String, deviceId: String): ConfirmResult {
        val result = http.postJson("/devices/pair/confirm", pairingTicket, idempotencyKey(),
            Json.encode(mapOf("pairingId" to pairingId, "deviceId" to deviceId, "confirmedOnDevice" to true)))
        val body = success(result)
        val device = body.obj("device")
        val session = body.obj("session")
        val subscription = body.obj("subscription")
        return ConfirmResult(
            pairingState = device?.str("pairingState").orEmpty(),
            accessToken = session?.str("accessToken").orEmpty(),
            refreshToken = session?.str("refreshToken").orEmpty(),
            subscriptionState = subscription?.str("state").orEmpty(),
            trialStartedAt = subscription?.str("trialStartedAt").orEmpty(),
            trialExpiresAt = subscription?.str("trialExpiresAt").orEmpty(),
        )
    }

    suspend fun heartbeat(accessToken: String, deviceId: String, info: DeviceInfo, batteryLevel: Int?, networkType: String, timestamp: String): HeartbeatResult {
        val payload = HashMap<String, Any?>()
        payload["deviceId"] = deviceId
        payload["appVersion"] = info.appVersion
        payload["androidVersion"] = info.androidVersion
        payload["manufacturer"] = info.manufacturer
        payload["model"] = info.model
        payload["batteryLevel"] = batteryLevel
        payload["networkType"] = networkType
        payload["timestamp"] = timestamp
        val result = http.postJson("/devices/heartbeat", accessToken, idempotencyKey(), Json.encode(payload))
        val body = success(result)
        val subscription = body.obj("subscription")
        return HeartbeatResult(
            serverReceivedAt = body.str("serverReceivedAt").orEmpty(),
            connectionState = body.str("connectionState").orEmpty(),
            subscriptionState = subscription?.str("state").orEmpty(),
            trialStartedAt = subscription?.str("trialStartedAt").orEmpty(),
            trialExpiresAt = subscription?.str("trialExpiresAt").orEmpty(),
        )
    }

    suspend fun revoke(accessToken: String, deviceId: String) {
        val result = http.postJson("/devices/revoke", accessToken, idempotencyKey(), Json.encode(mapOf("deviceId" to deviceId)))
        success(result)
    }

    suspend fun fetchCommands(accessToken: String): List<AgentCommand> {
        val body = success(http.getJson("/agent/commands", accessToken))
        val commands = body.fields["commands"] as? JsonArray ?: return emptyList()
        return commands.items.mapNotNull { item ->
            (item as? JsonObject)?.let { AgentCommand(it.str("id").orEmpty(), it.str("type").orEmpty(), it.obj("payload")?.str("text")) }
        }
    }

    suspend fun ackCommand(accessToken: String, commandId: String, status: String, result: String? = null) {
        val payload = HashMap<String, Any?>()
        payload["status"] = status
        if (result != null) payload["result"] = result
        success(http.postJson("/agent/commands/$commandId/ack", accessToken, null, Json.encode(payload)))
    }

    /**
     * Sends consented positions in one batch. The server answers with the geofence
     * transitions it derived, so the agent never decides a crossing on its own.
     */
    suspend fun reportLocations(accessToken: String, samples: List<LocationSample>): ReportLocationsResult {
        require(samples.isNotEmpty()) { "Nothing to report" }
        val payload = mapOf("samples" to samples.map { it.toMap() })
        val body = success(http.postJson("/agent/locations", accessToken, null, Json.encode(payload)))
        val crossings = (body.fields["transitions"] as? JsonArray)?.items.orEmpty().mapNotNull { item ->
            (item as? JsonObject)?.let {
                GeofenceCrossing(it.str("geofenceId").orEmpty(), it.str("name").orEmpty(), it.str("transition").orEmpty())
            }
        }
        return ReportLocationsResult(accepted = body.num("accepted")?.toInt() ?: 0, transitions = crossings)
    }

    private fun success(result: HttpResult): JsonObject {
        if (result.status !in 200..299) throw ApiException(result.status, "HTTP ${result.status}")
        return Json.parseObject(result.body)
    }

    private fun LocationSample.toMap(): Map<String, Any?> = mapOf(
        "latitude" to latitude, "longitude" to longitude, "accuracyMeters" to accuracyMeters,
        "source" to source.name, "observedAt" to observedAt.toString(), "consentVersion" to consentVersion,
    )

    private fun DeviceInfo.toMap(): Map<String, Any?> = mapOf(
        "name" to name, "manufacturer" to manufacturer, "model" to model,
        "androidVersion" to androidVersion, "appVersion" to appVersion,
    )
}
