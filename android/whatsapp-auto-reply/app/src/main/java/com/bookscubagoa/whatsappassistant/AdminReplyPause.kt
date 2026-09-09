package com.bookscubagoa.whatsappassistant

import android.content.Context
import android.service.notification.StatusBarNotification

/**
 * When the admin manually replies in WhatsApp, pause auto-reply for that chat only
 * for [PAUSE_MS]. Other chats are unaffected. After the window expires, the next
 * customer message can trigger auto-reply again.
 */
object AdminReplyPause {
    const val PAUSE_MS = 10 * 60 * 1000L

    private const val PREFS_NAME = "admin_reply_pause"

    private val pausedUntil = java.util.concurrent.ConcurrentHashMap<String, Long>()

    @Volatile
    private var loaded = false

    /** All stable keys for one customer chat (tag, phone, display name). */
    fun customerKeys(sbn: StatusBarNotification, contactLabel: String): List<String> {
        val keys = linkedSetOf<String>()
        val pkg = sbn.packageName

        val tag = sbn.tag?.trim()
        if (!tag.isNullOrEmpty()) {
            keys.add("$pkg|tag:$tag")
        }

        val contact = normalizeContact(contactLabel)
        val phone = WhatsAppReplyHelper.extractPhoneHint(sbn)
            .ifEmpty { WhatsAppReplyHelper.extractPhoneFromText(contactLabel) }
        if (phone.length >= 10) {
            keys.add("$pkg|phone:$phone")
        }
        if (contact.isNotEmpty()) {
            keys.add("$pkg|name:$contact")
        }
        if (keys.isEmpty()) {
            keys.add("$pkg|name:unknown")
        }
        return keys.toList()
    }

    fun customerKey(sbn: StatusBarNotification, contactLabel: String): String =
        customerKeys(sbn, contactLabel).first()

    fun recordManualReply(context: Context, sbn: StatusBarNotification, contactLabel: String) {
        ensureLoaded(context)
        prune(context)

        val labels = linkedSetOf<String>()
        if (contactLabel.isNotBlank()) labels.add(contactLabel)
        val chatLabel = WhatsAppReplyHelper.extractChatContactLabel(sbn)
        if (chatLabel.isNotBlank()) labels.add(chatLabel)

        val keys = linkedSetOf<String>()
        for (label in labels) {
            keys.addAll(customerKeys(sbn, label))
        }
        if (keys.isEmpty()) {
            keys.addAll(customerKeys(sbn, contactLabel))
        }

        val until = System.currentTimeMillis() + PAUSE_MS
        for (key in keys) {
            pausedUntil[key] = until
        }
        persist(context)

        val display = labels.firstOrNull { it.isNotBlank() } ?: contactLabel
        DebugLog.d(
            context,
            "PAUSE",
            "Admin manual reply — auto-reply paused 10 min for \"$display\" (keys=${keys.size}: ${keys.joinToString()})",
        )
    }

    fun isPausedForChat(context: Context, sbn: StatusBarNotification, contactLabel: String): Boolean {
        ensureLoaded(context)
        prune(context)
        return customerKeys(sbn, contactLabel).any { isPaused(it) }
    }

    fun pauseReason(context: Context, sbn: StatusBarNotification, contactLabel: String): String? {
        ensureLoaded(context)
        prune(context)
        for (key in customerKeys(sbn, contactLabel)) {
            pauseReasonForKey(key)?.let { return it }
        }
        return null
    }

    fun isPaused(key: String): Boolean {
        val until = pausedUntil[key] ?: return false
        return System.currentTimeMillis() < until
    }

    fun remainingMs(key: String): Long {
        val until = pausedUntil[key] ?: return 0L
        return (until - System.currentTimeMillis()).coerceAtLeast(0L)
    }

    private fun pauseReasonForKey(key: String): String? {
        if (!isPaused(key)) return null
        val mins = (remainingMs(key) + 59_999) / 60_000
        return "admin replied manually — paused ${mins}m for this chat only"
    }

    private fun ensureLoaded(context: Context) {
        if (loaded) return
        synchronized(this) {
            if (loaded) return
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            for ((key, value) in prefs.all) {
                if (value is Long && value > now) {
                    pausedUntil[key] = value
                }
            }
            loaded = true
        }
    }

    private fun persist(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.clear()
        val now = System.currentTimeMillis()
        for ((key, until) in pausedUntil) {
            if (until > now) {
                editor.putLong(key, until)
            }
        }
        editor.apply()
    }

    private fun prune(context: Context) {
        val now = System.currentTimeMillis()
        val removed = pausedUntil.entries.removeIf { now >= it.value }
        if (removed) {
            persist(context)
        }
    }

    private fun normalizeContact(label: String): String =
        label.trim().lowercase().replace(Regex("\\s+"), " ")
}
