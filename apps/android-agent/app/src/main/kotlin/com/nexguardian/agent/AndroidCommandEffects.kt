package com.nexguardian.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.RingtoneManager
import com.nexguardian.agent.core.network.CommandEffects

/** Visible, legitimate effects: a notification for SHOW_MESSAGE and the ringtone for RING_DEVICE. */
class AndroidCommandEffects(private val context: Context) : CommandEffects {
    private val channelId = "nexguardian_messages"

    private fun manager(): NotificationManager = context.getSystemService(NotificationManager::class.java)

    override fun showMessage(text: String) {
        val manager = manager()
        if (manager.getNotificationChannel(channelId) == null) {
            manager.createNotificationChannel(NotificationChannel(channelId, "Mensagens", NotificationManager.IMPORTANCE_HIGH))
        }
        val notification = Notification.Builder(context, channelId)
            .setContentTitle("NextGuardian")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_guardian)
            .setAutoCancel(true)
            .build()
        manager.notify(text.hashCode(), notification)
    }

    override fun ring() {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        RingtoneManager.getRingtone(context, uri)?.play()
    }
}
