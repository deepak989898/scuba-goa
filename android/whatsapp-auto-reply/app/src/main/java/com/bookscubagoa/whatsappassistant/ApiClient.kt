package com.bookscubagoa.whatsappassistant

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AssistantReply(
    val ok: Boolean,
    val reply: String?,
    val skipped: Boolean,
    val error: String?,
    val debugReason: String? = null,
    val httpCode: Int? = null,
    val elapsedMs: Long = 0,
)

object ApiClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun testConnection(context: Context): String = withContext(Dispatchers.IO) {
        val url = "${Prefs.baseUrl(context)}/api/mobile/whatsapp-assistant"
        val secret = Prefs.apiSecret(context)
        if (secret.isEmpty()) return@withContext "Add API secret first"

        DebugLog.d(context, "TEST", "GET $url")

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $secret")
            .get()
            .build()

        runCatching {
            val started = System.currentTimeMillis()
            client.newCall(request).execute().use { res ->
                val body = res.body?.string() ?: ""
                val elapsed = System.currentTimeMillis() - started
                DebugLog.d(context, "TEST", "HTTP ${res.code} in ${elapsed}ms body=${body.take(200)}")
                if (!res.isSuccessful) return@withContext "HTTP ${res.code}: $body"
                val json = JSONObject(body)
                val enabled = json.optBoolean("agentEnabled", false)
                val configured = json.optBoolean("configured", false)
                val apiVersion = json.optInt("apiVersion", 1)
                "OK ${elapsed}ms — apiVersion=$apiVersion agentEnabled=$enabled configured=$configured"
            }
        }.getOrElse {
            DebugLog.e(context, "TEST", "Network error", it)
            "Error: ${it.message}"
        }
    }

    suspend fun fetchReply(
        context: Context,
        senderName: String,
        phone: String,
        message: String,
    ): AssistantReply = withContext(Dispatchers.IO) {
        val url = "${Prefs.baseUrl(context)}/api/mobile/whatsapp-assistant"
        val secret = Prefs.apiSecret(context)
        if (secret.isEmpty()) {
            return@withContext AssistantReply(false, null, true, "API secret missing")
        }

        val payload = JSONObject()
            .put("senderName", senderName)
            .put("phone", phone)
            .put("message", message)

        DebugLog.d(
            context,
            "API",
            "POST $url | sender=\"$senderName\" phone=\"$phone\" msg=\"${message.take(80)}\"",
        )

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $secret")
            .header("Content-Type", "application/json")
            .post(payload.toString().toRequestBody(jsonType))
            .build()

        runCatching {
            val started = System.currentTimeMillis()
            client.newCall(request).execute().use { res ->
                val body = res.body?.string() ?: ""
                val elapsed = System.currentTimeMillis() - started
                DebugLog.d(context, "API", "HTTP ${res.code} in ${elapsed}ms body=${body.take(300)}")

                if (!res.isSuccessful) {
                    return@withContext AssistantReply(
                        ok = false,
                        reply = null,
                        skipped = false,
                        error = "HTTP ${res.code}: $body",
                        httpCode = res.code,
                        elapsedMs = elapsed,
                    )
                }
                val json = JSONObject(body)
                val skipped = json.optBoolean("skipped", false)
                val reply = json.optString("reply", "").trim().ifEmpty { null }
                val reason = json.optString("reason", "").trim().ifEmpty { null }
                AssistantReply(
                    ok = true,
                    reply = reply,
                    skipped = skipped,
                    error = null,
                    debugReason = reason,
                    httpCode = res.code,
                    elapsedMs = elapsed,
                )
            }
        }.getOrElse {
            DebugLog.e(context, "API", "Network error", it)
            AssistantReply(false, null, false, it.message ?: "network error")
        }
    }
}
