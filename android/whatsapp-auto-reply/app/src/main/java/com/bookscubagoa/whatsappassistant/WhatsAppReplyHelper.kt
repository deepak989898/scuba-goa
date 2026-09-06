package com.bookscubagoa.whatsappassistant

import android.app.Notification
import android.app.Person
import android.app.RemoteInput
import android.os.Bundle
import android.service.notification.NotificationListenerService
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

    fun ignoreReason(text: String, sender: String): String? {
        if (text.isBlank()) return "empty message text"
        val lower = text.lowercase()
        if (lower == "checking for new messages") return "whatsapp sync notification"
        if (lower == "waiting for this message. this may take a while.") return "e2e wait notification"
        if (Regex("""\d+\s+new messages?""").containsMatchIn(lower)) return "summary notification"
        if (sender.isBlank()) return "empty sender title"
        if (sender.equals("WhatsApp", ignoreCase = true)) return "summary notification"
        if (text.length > 4000) return "message too long"
        if (lower.startsWith("you:")) return "own message"
        return null
    }

    fun shouldIgnoreMessage(text: String, sender: String): Boolean =
        ignoreReason(text, sender) != null

    fun dumpNotification(sbn: StatusBarNotification): String {
        val extras = sbn.notification.extras
        val keys = extras?.keySet()?.sorted()?.joinToString(", ") ?: "none"
        val title = extras?.getCharSequence("android.title")?.toString() ?: ""
        val text = extras?.getCharSequence("android.text")?.toString() ?: ""
        val sub = extras?.getString("android.subText") ?: ""
        val actions = describeActions(sbn)
        return "pkg=${sbn.packageName} id=${sbn.id} tag=${sbn.tag ?: "-"} " +
            "title=\"${title.take(40)}\" text=\"${text.take(40)}\" sub=\"${sub.take(30)}\" " +
            "keys=[$keys] actions=[$actions]"
    }

    fun describeActions(sbn: StatusBarNotification): String {
        val actions = sbn.notification.actions
        if (actions == null || actions.isEmpty()) return "none"
        return actions.mapIndexed { index, action ->
            if (action == null) {
                "[$index]=null"
            } else {
                val title = action.title?.toString() ?: "?"
                val inputs = action.remoteInputs?.size ?: 0
                val key = action.remoteInputs?.firstOrNull()?.resultKey ?: "-"
                "[$index]\"$title\" inputs=$inputs key=$key"
            }
        }.joinToString("; ")
    }

    fun hasReplyAction(sbn: StatusBarNotification): Boolean {
        val actions = sbn.notification.actions ?: return false
        return actions.any { action ->
            action != null && action.remoteInputs != null && action.remoteInputs.isNotEmpty()
        }
    }

    fun findReplyCandidates(
        service: NotificationListenerService,
        original: StatusBarNotification,
        sender: String,
    ): List<StatusBarNotification> {
        val active = service.activeNotifications?.toList() ?: emptyList()
        val whatsapp = active.filter { isWhatsAppPackage(it.packageName) }
        val withReply = whatsapp.filter { hasReplyAction(it) }

        val bySender = withReply.filter {
            extractSenderTitle(it).equals(sender, ignoreCase = true)
        }
        val byId = withReply.filter { it.id == original.id && it.tag == original.tag }
        val originalIfReply = if (hasReplyAction(original)) listOf(original) else emptyList()

        return (bySender + byId + originalIfReply + withReply)
            .distinctBy { "${it.packageName}|${it.tag}|${it.id}" }
    }

    fun sendReply(
        service: NotificationListenerService,
        original: StatusBarNotification,
        sender: String,
        replyText: String,
    ): ReplySendResult {
        val candidates = findReplyCandidates(service, original, sender)
        if (candidates.isEmpty()) {
            return ReplySendResult(
                success = false,
                detail = "No reply-capable notification found among ${service.activeNotifications?.size ?: 0} active",
            )
        }

        val attempts = mutableListOf<String>()
        for ((index, candidate) in candidates.withIndex()) {
            val actions = candidate.notification.actions
            if (actions == null || actions.isEmpty()) {
                attempts.add("#$index id=${candidate.id}: no actions")
                continue
            }

            for ((actionIndex, action) in actions.withIndex()) {
                if (action == null) continue
                val remoteInputs = action.remoteInputs
                if (remoteInputs == null || remoteInputs.isEmpty()) continue

                val remoteInput = remoteInputs[0]
                val pendingIntent = action.actionIntent
                if (pendingIntent == null) {
                    attempts.add("#$index action#$actionIndex: no PendingIntent")
                    continue
                }

                val fillInIntent = android.content.Intent()
                val bundle = Bundle()
                bundle.putCharSequence(remoteInput.resultKey, replyText)
                RemoteInput.addResultsToIntent(arrayOf(remoteInput), fillInIntent, bundle)

                try {
                    pendingIntent.send(service, 0, fillInIntent)
                    val actionTitle = action.title?.toString() ?: "?"
                    return ReplySendResult(
                        success = true,
                        detail = "Sent via candidate #$index action#$actionIndex \"$actionTitle\" key=${remoteInput.resultKey}",
                    )
                } catch (e: Exception) {
                    attempts.add("#$index action#$actionIndex: ${e.javaClass.simpleName}: ${e.message}")
                }
            }
            attempts.add("#$index id=${candidate.id}: ${describeActions(candidate)}")
        }

        return ReplySendResult(
            success = false,
            detail = "All reply attempts failed: ${attempts.joinToString(" | ")}",
        )
    }

    fun dedupeKey(sbn: StatusBarNotification, message: String): String {
        val sender = extractSenderTitle(sbn)
        return "${sbn.packageName}|${sbn.tag ?: ""}|${sbn.id}|$sender|$message"
    }

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
}
