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

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $secret")
            .get()
            .build()

        runCatching {
            client.newCall(request).execute().use { res ->
                val body = res.body?.string() ?: ""
                if (!res.isSuccessful) return@withContext "HTTP ${res.code}: $body"
                val json = JSONObject(body)
                val enabled = json.optBoolean("agentEnabled", false)
                "OK — agentEnabled=$enabled site=${json.optString("siteUrl")}"
            }
        }.getOrElse { "Error: ${it.message}" }
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

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $secret")
            .header("Content-Type", "application/json")
            .post(payload.toString().toRequestBody(jsonType))
            .build()

        runCatching {
            client.newCall(request).execute().use { res ->
                val body = res.body?.string() ?: ""
                if (!res.isSuccessful) {
                    return@withContext AssistantReply(false, null, false, "HTTP ${res.code}: $body")
                }
                val json = JSONObject(body)
                val skipped = json.optBoolean("skipped", false)
                val reply = json.optString("reply", "").trim().ifEmpty { null }
                AssistantReply(true, reply, skipped, json.optString("reason", null))
            }
        }.getOrElse {
            AssistantReply(false, null, false, it.message ?: "network error")
        }
    }
}
