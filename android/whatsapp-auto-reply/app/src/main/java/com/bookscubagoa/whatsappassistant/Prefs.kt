package com.bookscubagoa.whatsappassistant

import android.content.Context

object Prefs {
    private const val NAME = "book_scuba_wa_assistant"

    private const val KEY_BASE_URL = "base_url"
    private const val KEY_SECRET = "api_secret"
    private const val KEY_ENABLED = "auto_reply_enabled"

    private const val DEFAULT_URL = "https://www.bookscubagoa.com"

    fun baseUrl(context: Context): String {
        val raw = prefs(context).getString(KEY_BASE_URL, DEFAULT_URL)?.trim() ?: DEFAULT_URL
        return raw.removeSuffix("/")
    }

    fun apiSecret(context: Context): String =
        prefs(context).getString(KEY_SECRET, "")?.trim() ?: ""

    fun isAutoReplyEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ENABLED, false) && apiSecret(context).isNotEmpty()

    fun save(context: Context, baseUrl: String, secret: String, enabled: Boolean) {
        prefs(context).edit()
            .putString(KEY_BASE_URL, baseUrl.trim().removeSuffix("/"))
            .putString(KEY_SECRET, secret.trim())
            .putBoolean(KEY_ENABLED, enabled)
            .apply()
    }

    fun appendLog(context: Context, line: String) {
        val key = "log"
        val prev = prefs(context).getString(key, "") ?: ""
        val merged = (line + "\n" + prev).lines().take(40).joinToString("\n")
        prefs(context).edit().putString(key, merged).apply()
    }

    fun readLog(context: Context): String =
        prefs(context).getString("log", "No activity yet.") ?: "No activity yet."

    private fun prefs(context: Context) =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
}
