package com.bookscubagoa.whatsappassistant

import android.content.Context
import android.util.Log

object DebugLog {
    private const val LOG_TAG = "WaAssistant"

    fun d(context: Context, tag: String, message: String) {
        val line = "${timestamp()} [$tag] $message"
        Log.d(LOG_TAG, line)
        Prefs.appendLog(context, line)
    }

    fun w(context: Context, tag: String, message: String) {
        val line = "${timestamp()} [$tag] WARN $message"
        Log.w(LOG_TAG, line)
        Prefs.appendLog(context, line)
    }

    fun e(context: Context, tag: String, message: String, error: Throwable? = null) {
        val extra = error?.message?.let { " ($it)" } ?: ""
        val line = "${timestamp()} [$tag] ERROR $message$extra"
        Log.e(LOG_TAG, line, error)
        Prefs.appendLog(context, line)
    }

    private fun timestamp(): String {
        val fmt = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault())
        return fmt.format(java.util.Date())
    }
}
