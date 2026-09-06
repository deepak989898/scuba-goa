package com.bookscubagoa.whatsappassistant

import android.service.notification.StatusBarNotification
import java.util.concurrent.ConcurrentHashMap

/**
 * Prevents reply loops: ignore our own WhatsApp echoes and duplicate replies per customer message.
 */
object ReplyGuard {
    private const val OUTBOUND_TTL_MS = 3 * 60 * 1000L
    private const val INBOUND_DEDUPE_MS = 5 * 60 * 1000L

    private val recentOutbound = ConcurrentHashMap<String, Long>()
    private val lastInboundReply = ConcurrentHashMap<String, InboundMark>()

    private data class InboundMark(
        val messageKey: String,
        val atMs: Long,
    )

    fun conversationKey(sbn: StatusBarNotification): String =
        "${sbn.packageName}|${sbn.tag ?: sbn.id}"

    fun recordOutbound(reply: String) {
        val key = normalize(reply).take(120)
        if (key.isNotEmpty()) {
            recentOutbound[key] = System.currentTimeMillis()
        }
    }

    fun markInboundReplied(convKey: String, customerMessage: String) {
        lastInboundReply[convKey] = InboundMark(
            messageKey = normalize(customerMessage).take(200),
            atMs = System.currentTimeMillis(),
        )
    }

    fun isEchoOfOurReply(text: String): Boolean {
        prune()
        val norm = normalize(text).take(120)
        if (norm.length < 12) return false
        return recentOutbound.keys.any { outbound ->
            norm.startsWith(outbound.take(40)) || outbound.startsWith(norm.take(40))
        }
    }

    fun alreadyRepliedToInbound(convKey: String, customerMessage: String): Boolean {
        prune()
        val mark = lastInboundReply[convKey] ?: return false
        if (System.currentTimeMillis() - mark.atMs > INBOUND_DEDUPE_MS) return false
        return mark.messageKey == normalize(customerMessage).take(200)
    }

    private fun prune() {
        val now = System.currentTimeMillis()
        recentOutbound.entries.removeIf { now - it.value > OUTBOUND_TTL_MS }
        lastInboundReply.entries.removeIf { now - it.value.atMs > INBOUND_DEDUPE_MS }
    }

    private fun normalize(text: String): String =
        text.lowercase().replace(Regex("\\s+"), " ").trim()
}
