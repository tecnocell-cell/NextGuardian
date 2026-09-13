package com.nexguardian.agent.service.background
/** Contract only. WorkManager dependency is present; no work is scheduled. */
interface BackgroundScheduler {
    suspend fun scheduleAuthorizedSync()
    suspend fun cancelAuthorizedSync()
}
