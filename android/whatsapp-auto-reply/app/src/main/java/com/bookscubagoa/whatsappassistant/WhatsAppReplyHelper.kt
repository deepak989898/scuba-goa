package com.bookscubagoa.whatsappassistant

import android.app.RemoteInput
import android.content.Intent
import android.os.Bundle
import android.service.notification.StatusBarNotification

object WhatsAppReplyHelper {
    private val WHATSAPP_PACKAGES = setOf(
        "com.whatsapp",
        "com.whatsapp.w4b",
    )

    fun isWhatsAppPackage(pkg: String?): Boolean = pkg != null && WHATSAPP_PACKAGES.contains(pkg)

    fun extractSenderTitle(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras
        val title = extras?.getCharSequence("android.title")?.toString()?.trim() ?: ""
        if (title.isNotEmpty() && !isGroupSummary(title)) return title
        val text = extras?.getCharSequence("android.text")?.toString()?.trim() ?: ""
        return title.ifEmpty { text.take(40) }
    }

    fun extractMessageText(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras
        val text = extras?.getCharSequence("android.text")?.toString()?.trim() ?: ""
        val big = extras?.getCharSequence("android.bigText")?.toString()?.trim()
        return (big ?: text).trim()
    }

    fun extractPhoneHint(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras
        val sub = extras?.getString("android.subText")?.trim() ?: ""
        val digits = sub.filter { it.isDigit() }
        if (digits.length >= 10) return digits.takeLast(12)
        return ""
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
        return false
    }

    fun sendReply(sbn: StatusBarNotification, replyText: String): Boolean {
        val notification = sbn.notification
        val actions = notification.actions ?: return false
        for (action in actions) {
            if (action == null) continue
            val remoteInputs = action.remoteInputs
            if (remoteInputs == null || remoteInputs.isEmpty()) continue
            val remoteInput = remoteInputs[0]
            val intent = action.actionIntent ?: continue
            val bundle = Bundle()
            bundle.putCharSequence(remoteInput.resultKey, replyText)
            RemoteInput.addResultsToIntent(arrayOf(remoteInput), intent, bundle)
            try {
                intent.send()
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
