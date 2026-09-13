package com.nexguardian.agent.service.heartbeat
import java.time.Instant
import com.nexguardian.agent.domain.DeviceInfo
enum class NetworkType { WIFI, CELLULAR, ETHERNET, NONE, UNKNOWN }
data class HeartbeatPayload(
    val deviceId: String, val appVersion: String, val androidVersion: String,
    val manufacturer: String, val model: String, val batteryLevel: Int?,
    val networkType: NetworkType, val timestamp: Instant
)
interface HeartbeatGateway { suspend fun send(payload: HeartbeatPayload): Instant }
class MockHeartbeatGateway(private val serverTime: Instant) : HeartbeatGateway {
    override suspend fun send(payload: HeartbeatPayload): Instant {
        require(payload.deviceId.isNotBlank())
        require(payload.batteryLevel == null || payload.batteryLevel in 0..100)
        return serverTime
    }
}
fun mockHeartbeat(id: String, info: DeviceInfo, timestamp: Instant) = HeartbeatPayload(
    id, info.appVersion, info.androidVersion, info.manufacturer, info.model,
    null, NetworkType.UNKNOWN, timestamp
)
