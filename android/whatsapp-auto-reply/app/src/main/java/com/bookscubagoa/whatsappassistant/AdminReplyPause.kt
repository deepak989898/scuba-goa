package com.bookscubagoa.whatsappassistant

import android.content.Context
import android.service.notification.StatusBarNotification
import java.util.concurrent.ConcurrentHashMap

/**
 * When the admin manually replies in WhatsApp, pause auto-reply for that chat only.
 */
object AdminReplyPause {
    const val PAUSE_MS = 10 * 60 * 1000L

    private val pausedUntil = ConcurrentHashMap<String, Long>()

    /** Stable per-customer key (WhatsApp conversation tag when available). */
    fun customerKey(sbn: StatusBarNotification, contactLabel: String): String {
        val tag = sbn.tag?.trim()
        if (!tag.isNullOrEmpty()) {
            return "${sbn.packageName}|tag:$tag"
        }
        val contact = normalizeContact(contactLabel)
        val phone = WhatsAppReplyHelper.extractPhoneHint(sbn)
            .ifEmpty { WhatsAppReplyHelper.extractPhoneFromText(contactLabel) }
        if (phone.length >= 10) {
            return "${sbn.packageName}|phone:$phone"
        }
        return "${sbn.packageName}|name:$contact"
    }

    fun recordManualReply(context: Context, sbn: StatusBarNotification, contactLabel: String) {
        prune()
        val key = customerKey(sbn, contactLabel)
        val until = System.currentTimeMillis() + PAUSE_MS
        pausedUntil[key] = until
        DebugLog.d(
            context,
            "PAUSE",
            "Admin manual reply — auto-reply paused 10 min for \"$contactLabel\" (key=$key)",
        )
    }

    fun isPaused(key: String): Boolean {
        prune()
        val until = pausedUntil[key] ?: return false
        return System.currentTimeMillis() < until
    }

    fun remainingMs(key: String): Long {
        prune()
        val until = pausedUntil[key] ?: return 0L
        return (until - System.currentTimeMillis()).coerceAtLeast(0L)
    }

    fun pauseReason(key: String): String? {
        if (!isPaused(key)) return null
        val mins = (remainingMs(key) + 59_999) / 60_000
        return "admin replied manually — paused ${mins}m for this chat only"
    }

    private fun prune() {
        val now = System.currentTimeMillis()
        pausedUntil.entries.removeIf { now >= it.value }
    }

    private fun normalizeContact(label: String): String =
        label.trim().lowercase().replace(Regex("\\s+"), " ")
}
