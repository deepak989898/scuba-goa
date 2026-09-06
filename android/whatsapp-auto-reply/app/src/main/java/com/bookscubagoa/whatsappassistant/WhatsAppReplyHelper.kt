package com.bookscubagoa.whatsappassistant

import android.app.Notification
import android.app.Person
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.service.notification.StatusBarNotification

object WhatsAppReplyHelper {
    private val WHATSAPP_PACKAGES = setOf(
        "com.whatsapp",
        "com.whatsapp.w4b",
    )

    private val PHONE_IN_TEXT = Regex("""\+?\d[\d\s\-()]{8,}\d""")

    fun isWhatsAppPackage(pkg: String?): Boolean = pkg != null && WHATSAPP_PACKAGES.contains(pkg)

    fun extractSenderTitle(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras ?: return ""
        val messaging = extractMessagingStyle(extras)
        if (!messaging.sender.isNullOrBlank()) return messaging.sender.trim()

        val title = extras.getCharSequence("android.title")?.toString()?.trim() ?: ""
        if (title.isNotEmpty() && !isGroupSummary(title)) return title

        val text = extras.getCharSequence("android.text")?.toString()?.trim() ?: ""
        return title.ifEmpty { text.take(40) }
    }

    fun extractMessageText(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras ?: return ""
        val messaging = extractMessagingStyle(extras)
        if (!messaging.text.isNullOrBlank()) return messaging.text.trim()

        val text = extras.getCharSequence("android.text")?.toString()?.trim() ?: ""
        val big = extras.getCharSequence("android.bigText")?.toString()?.trim()
        val lines = extras.getCharSequenceArray("android.textLines")
        val lineText = lines?.lastOrNull()?.toString()?.trim()
        return (big ?: lineText ?: text).trim()
    }

    fun extractPhoneHint(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras ?: return ""
        val sender = extractSenderTitle(sbn)

        val sub = extras.getString("android.subText")?.trim() ?: ""
        digitsFromPhoneLike(sub)?.let { return it }

        digitsFromPhoneLike(sender)?.let { return it }

        val messaging = extractMessagingStyle(extras)
        digitsFromPhoneLike(messaging.sender)?.let { return it }

        return ""
    }

    fun extractPhoneFromText(text: String): String = digitsFromPhoneLike(text) ?: ""

    private fun digitsFromPhoneLike(text: String?): String? {
        if (text.isNullOrBlank()) return null
        val match = PHONE_IN_TEXT.find(text)?.value ?: text
        val digits = match.filter { it.isDigit() }
        if (digits.length >= 10) return digits.takeLast(12)
        return null
    }

    private data class MessagingParts(val sender: String?, val text: String?)

    private fun extractMessagingStyle(extras: Bundle): MessagingParts {
        val raw = extras.get("android.messages")
        val messages: List<Bundle> = when (raw) {
            is Array<*> -> raw.filterIsInstance<Bundle>()
            is List<*> -> raw.filterIsInstance<Bundle>()
            else -> emptyList()
        }
        if (messages.isEmpty()) return MessagingParts(null, null)

        val latest = messages.last()
        val text = latest.getCharSequence("text")?.toString()?.trim()
            ?: latest.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()

        val sender = extractPersonName(latest.get("sender"))
            ?: latest.getCharSequence("sender")?.toString()?.trim()

        return MessagingParts(sender, text)
    }

    private fun extractPersonName(raw: Any?): String? {
        return when (raw) {
            is Person -> raw.name?.toString()?.trim()
            is CharSequence -> raw.toString().trim()
            is Bundle -> raw.getCharSequence("name")?.toString()?.trim()
            else -> null
        }
    }

    private fun isGroupSummary(title: String): Boolean {
        val lower = title.lowercase()
        return lower.contains("messages from") || lower.contains("new messages")
    }

    fun shouldIgnoreMessage(text: String, sender: String): Boolean {
        if (text.isBlank()) return true
        val lower = text.lowercase()
        if (lower == "checking for new messages") return true
        if (lower == "waiting for this message. this may take a while.") return true
        if (sender.isBlank()) return true
        if (sender.equals("WhatsApp", ignoreCase = true)) return true
        if (text.length > 4000) return true
        if (lower.startsWith("you:")) return true
        return false
    }

    fun sendReply(context: Context, sbn: StatusBarNotification, replyText: String): Boolean {
        val notification = sbn.notification
        val actions = notification.actions ?: return false
        for (action in actions) {
            if (action == null) continue
            val remoteInputs = action.remoteInputs
            if (remoteInputs == null || remoteInputs.isEmpty()) continue
            val remoteInput = remoteInputs[0]
            val pendingIntent = action.actionIntent ?: continue
            val fillInIntent = Intent()
            val bundle = Bundle()
            bundle.putCharSequence(remoteInput.resultKey, replyText)
            RemoteInput.addResultsToIntent(arrayOf(remoteInput), fillInIntent, bundle)
            try {
                pendingIntent.send(context, 0, fillInIntent)
                return true
            } catch (_: Exception) {
                continue
            }
        }
        return false
    }

    fun dedupeKey(sbn: StatusBarNotification, message: String): String {
        val sender = extractSenderTitle(sbn)
        return "${sbn.packageName}|${sbn.tag ?: ""}|${sbn.id}|$sender|$message"
    }
}
