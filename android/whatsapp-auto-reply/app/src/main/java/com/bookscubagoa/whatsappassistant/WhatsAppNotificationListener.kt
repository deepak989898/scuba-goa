package com.bookscubagoa.whatsappassistant

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

class WhatsAppNotificationListener : NotificationListenerService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val recentKeys = ConcurrentHashMap.newKeySet<String>()

    override fun onListenerConnected() {
        super.onListenerConnected()
        DebugLog.d(this, "LISTENER", "Connected — active notifications: ${activeNotifications?.size ?: 0}")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        DebugLog.w(this, "LISTENER", "Disconnected — re-enable notification access if this keeps happening")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        if (!WhatsAppReplyHelper.isWhatsAppPackage(sbn.packageName, this)) {
            val skip = WhatsAppReplyHelper.targetSkipReason(sbn.packageName, this)
            if (skip != null) {
                DebugLog.d(this, "SKIP", skip)
            }
            return
        }

        DebugLog.d(this, "NOTIF", "Posted: ${WhatsAppReplyHelper.dumpNotification(sbn)}")

        if (!Prefs.isAutoReplyEnabled(this)) {
            DebugLog.d(this, "SKIP", "Auto-reply OFF or API secret missing")
            return
        }

        val sender = WhatsAppReplyHelper.extractSenderTitle(sbn)
        val message = WhatsAppReplyHelper.extractMessageText(sbn)
        val ignoreReason = WhatsAppReplyHelper.ignoreReason(sbn, message, sender)
        if (ignoreReason != null) {
            DebugLog.d(this, "SKIP", "Ignored: $ignoreReason | sender=\"$sender\" text=\"${message.take(60)}\"")
            return
        }

        if (!WhatsAppReplyHelper.hasReplyAction(sbn)) {
            DebugLog.d(this, "SKIP", "No Reply button on notification (likely summary) | text=\"${message.take(60)}\"")
            return
        }

        val key = WhatsAppReplyHelper.dedupeKey(sbn, message)
        if (!recentKeys.add(key)) {
            DebugLog.d(this, "SKIP", "Duplicate notification key")
            return
        }
        if (recentKeys.size > 200) recentKeys.clear()

        val convKey = ReplyGuard.conversationKey(sbn)
        DebugLog.d(
            this,
            "PROCESS",
            "Customer message from \"$sender\" | conv=$convKey | active=${activeNotifications?.size ?: 0}",
        )

        scope.launch {
            processMessage(sbn, sender, message, convKey)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null || !WhatsAppReplyHelper.isWhatsAppPackage(sbn.packageName, this)) return
        DebugLog.d(
            this,
            "NOTIF",
            "Removed: id=${sbn.id} tag=${sbn.tag ?: "-"} sender=\"${WhatsAppReplyHelper.extractSenderTitle(sbn).take(30)}\"",
        )
    }

    private suspend fun processMessage(
        sbn: StatusBarNotification,
        sender: String,
        message: String,
        convKey: String,
    ) {
        val phone = WhatsAppReplyHelper.extractPhoneHint(sbn).ifEmpty {
            WhatsAppReplyHelper.extractPhoneFromText(sender).ifEmpty { sender.trim() }
        }

        DebugLog.d(this, "IN", "From=\"$sender\" phone=\"$phone\" msg=\"${message.take(120)}\"")
        DebugLog.d(this, "API", "Calling website…")

        val started = System.currentTimeMillis()
        val result = ApiClient.fetchReply(this, sender, phone, message)
        val elapsed = System.currentTimeMillis() - started

        if (!result.ok) {
            DebugLog.e(this, "API", "Failed in ${elapsed}ms: ${result.error}")
            return
        }
        if (result.skipped) {
            DebugLog.w(this, "API", "Skipped in ${elapsed}ms: ${result.debugReason ?: "no reason"}")
            return
        }
        if (result.reply.isNullOrBlank()) {
            DebugLog.w(this, "API", "Empty reply in ${elapsed}ms")
            return
        }

        DebugLog.d(this, "API", "OK in ${elapsed}ms — reply ${result.reply.length} chars: \"${result.reply.take(80)}\"")

        val candidates = WhatsAppReplyHelper.findReplyCandidates(this, sbn, sender)
        DebugLog.d(
            this,
            "REPLY",
            "Trying ${candidates.size} notification candidate(s): " +
                candidates.map { "id=${it.id} tag=${it.tag?.take(8)} actions=${WhatsAppReplyHelper.describeActions(it)}" }
                    .joinToString(" | "),
        )

        val sendResult = WhatsAppReplyHelper.sendReply(this, sbn, sender, result.reply)
        if (sendResult.success) {
            ReplyGuard.recordOutbound(result.reply)
            ReplyGuard.markInboundReplied(convKey, message)
            DebugLog.d(this, "OUT", "Reply sent (1 per customer message) — ${sendResult.detail}")
        } else {
            DebugLog.e(
                this,
                "OUT",
                "Could not send WhatsApp reply — ${sendResult.detail}. Tip: close the chat, keep WhatsApp in background, ensure notification shows Reply button.",
            )
        }
    }
}
