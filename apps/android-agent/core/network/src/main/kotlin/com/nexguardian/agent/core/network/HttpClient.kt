package com.nexguardian.agent.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

data class HttpResult(val status: Int, val body: String)

interface HttpClient {
    suspend fun postJson(path: String, bearer: String?, idempotencyKey: String?, body: String): HttpResult
    suspend fun getJson(path: String, bearer: String?): HttpResult
}

/** Pure-JDK client (works on Android and on the JVM). No third-party dependency. */
class JdkHttpClient(private val baseUrl: String) : HttpClient {
    override suspend fun postJson(path: String, bearer: String?, idempotencyKey: String?, body: String): HttpResult =
        request("POST", path, bearer, idempotencyKey, body)

    override suspend fun getJson(path: String, bearer: String?): HttpResult =
        request("GET", path, bearer, null, null)

    private suspend fun request(method: String, path: String, bearer: String?, idempotencyKey: String?, body: String?): HttpResult =
        withContext(Dispatchers.IO) {
            val connection = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = method
                connection.connectTimeout = 10_000
                connection.readTimeout = 15_000
                connection.setRequestProperty("Accept", "application/json")
                bearer?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
                idempotencyKey?.let { connection.setRequestProperty("Idempotency-Key", it) }
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream ?: connection.inputStream
                val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
                HttpResult(status, text)
            } finally {
                connection.disconnect()
            }
        }
}
