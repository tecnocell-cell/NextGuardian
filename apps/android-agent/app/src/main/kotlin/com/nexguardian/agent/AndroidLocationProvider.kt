package com.nexguardian.agent

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.nexguardian.agent.domain.LocationFix
import com.nexguardian.agent.domain.LocationProvider
import com.nexguardian.agent.domain.LocationSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.time.Instant
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

/**
 * Reads a position from the platform's own LocationManager.
 *
 * Deliberately no Play Services dependency: the fused provider would add a proprietary
 * library for a single fix, and the platform provider is enough for a consented,
 * periodic report. The trade-off is slightly coarser fixes indoors.
 */
class AndroidLocationProvider(
    private val context: Context,
    private val timeoutMillis: Long = 20_000,
) : LocationProvider {

    private val manager get() = ContextCompat.getSystemService(context, LocationManager::class.java)

    private fun granted(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    private val hasPermission: Boolean
        get() = granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION)

    @SuppressLint("MissingPermission") // guarded by hasPermission on every path below
    override suspend fun current(): LocationFix? {
        // The OS permission is a second gate, after consent: a user can revoke either one.
        if (!hasPermission) return null
        val manager = manager ?: return null
        val provider = pickProvider(manager) ?: return null

        val fix = withTimeoutOrNull(timeoutMillis) {
            suspendCancellableCoroutine { continuation ->
                val delivered = AtomicBoolean(false)
                val resumeOnce: (Location?) -> Unit = { location ->
                    if (delivered.compareAndSet(false, true)) continuation.resume(location)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val signal = android.os.CancellationSignal()
                    continuation.invokeOnCancellation { signal.cancel() }
                    manager.getCurrentLocation(provider, signal, context.mainExecutor) { resumeOnce(it) }
                } else {
                    val listener = android.location.LocationListener { resumeOnce(it) }
                    continuation.invokeOnCancellation { manager.removeUpdates(listener) }
                    manager.requestSingleUpdateCompat(provider, listener)
                }
            }
        } ?: manager.lastKnownOrNull(provider)

        return fix?.toDomain()
    }

    private fun pickProvider(manager: LocationManager): String? = when {
        granted(Manifest.permission.ACCESS_FINE_LOCATION) &&
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
        manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
        else -> null
    }

    @SuppressLint("MissingPermission")
    private fun LocationManager.lastKnownOrNull(provider: String): Location? =
        runCatching { getLastKnownLocation(provider) }.getOrNull()

    @SuppressLint("MissingPermission")
    private fun LocationManager.requestSingleUpdateCompat(provider: String, listener: android.location.LocationListener) {
        @Suppress("DEPRECATION")
        requestSingleUpdate(provider, listener, context.mainLooper)
    }

    private fun Location.toDomain() = LocationFix(
        latitude = latitude,
        longitude = longitude,
        // An unknown accuracy is reported as very poor, never as perfect: the server
        // refuses to call a vague sample "inside" a geofence, and that is the safe default.
        accuracyMeters = if (hasAccuracy()) accuracy.toDouble() else 10_000.0,
        source = if (provider == LocationManager.GPS_PROVIDER) LocationSource.GPS else LocationSource.NETWORK,
        observedAt = Instant.ofEpochMilli(time),
    )
}
