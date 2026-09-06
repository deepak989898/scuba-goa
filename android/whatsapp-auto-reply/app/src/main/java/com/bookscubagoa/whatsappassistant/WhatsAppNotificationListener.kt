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
        Prefs.appendLog(this, "${timestamp()} Listener connected")
        AssistantForegroundService.start(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        if (!Prefs.isAutoReplyEnabled(this)) return
        if (!WhatsAppReplyHelper.isWhatsAppPackage(sbn.packageName)) return

        val sender = WhatsAppReplyHelper.extractSenderTitle(sbn)
        val message = WhatsAppReplyHelper.extractMessageText(sbn)
        if (WhatsAppReplyHelper.shouldIgnoreMessage(message, sender)) return

        val key = WhatsAppReplyHelper.dedupeKey(sbn, message)
        if (!recentKeys.add(key)) return
        if (recentKeys.size > 200) recentKeys.clear()

        scope.launch {
            processMessage(sbn, sender, message)
        }
    }

    private suspend fun processMessage(
        sbn: StatusBarNotification,
        sender: String,
        message: String,
    ) {
        Prefs.appendLog(this, "${timestamp()} IN: $sender — ${message.take(80)}")

        val phone = WhatsAppReplyHelper.extractPhoneHint(sbn).ifEmpty {
            sender.lowercase().replace(Regex("[^a-z0-9]"), "").take(20)
        }

        val result = ApiClient.fetchReply(this, sender, phone, message)
        if (!result.ok) {
            Prefs.appendLog(this, "${timestamp()} API error: ${result.error}")
            return
        }
        if (result.skipped || result.reply.isNullOrBlank()) {
            Prefs.appendLog(this, "${timestamp()} Skipped: ${result.error ?: "no reply"}")
            return
        }

        val sent = WhatsAppReplyHelper.sendReply(sbn, result.reply)
        Prefs.appendLog(
            this,
            if (sent) {
                "${timestamp()} OUT: ${result.reply.take(100)}"
            } else {
                "${timestamp()} Could not send reply (open WhatsApp once or check notification reply)"
            },
        )
    }

    private fun timestamp(): String {
        val fmt = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
        return fmt.format(java.util.Date())
    }
}
