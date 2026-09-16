package com.nexguardian.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import com.nexguardian.agent.data.CollectionResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Foreground service that reports location while it runs.
 *
 * Foreground, and therefore with a permanent notification, on purpose: the product's whole
 * premise is that monitoring is visible. A silent background collector would be both a
 * policy violation and a betrayal of the person carrying the device.
 */
class LocationService : Service() {

    private val scope = CoroutineScope(SupervisorJob())
    private var work: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // From API 29 the type must be declared at start time, and from API 34 the system
        // rejects a location service that does not say so.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification())
        }
        if (work?.isActive != true) work = scope.launch { loop() }
        // Restart if the system kills us, but without redelivering the original intent.
        return START_STICKY
    }

    private suspend fun loop() {
        val collector = (application as NexGuardianApplication).locationCollector
        while (scope.isActive) {
            val result = runCatching { collector.collect() }.getOrNull()
            // Consent withdrawn while running: stop immediately rather than at the next launch.
            if (result is CollectionResult.NoConsent) {
                stopSelf()
                return
            }
            delay(INTERVAL_MILLIS)
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun notification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Localização", NotificationManager.IMPORTANCE_LOW)
            )
        }
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("Compartilhando localização com sua família")
            .setSmallIcon(R.drawable.ic_guardian)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "nexguardian_location"
        private const val NOTIFICATION_ID = 4201
        private const val INTERVAL_MILLIS = 15 * 60 * 1000L

        fun start(context: Context) {
            val intent = Intent(context, LocationService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
        }

        fun stop(context: Context) = context.stopService(Intent(context, LocationService::class.java))
    }
}
