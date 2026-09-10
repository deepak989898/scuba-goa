package com.bookscubagoa.whatsappassistant

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Groups rapid messages from the same customer into one auto-reply.
 * Waits briefly after the last message before calling the API once.
 */
class InboundMessageBatcher(
    private val service: NotificationListenerService,
    private val scope: CoroutineScope,
) {
    companion object {
        /** Wait after the last message before replying (photos/videos often arrive in bursts). */
        private const val BATCH_WAIT_MS = 4_500L
    }

    private data class PendingItem(
        val message: String,
        val notifKey: String,
    )

    private data class FlushPayload(
        val sender: String,
        val phone: String,
        val convKey: String,
        val combined: String,
        val items: List<String>,
        val notification: StatusBarNotification,
    )

    private data class BatchState(
        val convKey: String,
        var sender: String,
        var phone: String,
        var pkg: String,
        var tag: String?,
        var notificationId: Int,
        val items: MutableList<PendingItem> = mutableListOf(),
        var generation: Long = 0,
        var flushJob: Job? = null,
        var lastSbn: StatusBarNotification? = null,
    )

    private val batches = java.util.concurrent.ConcurrentHashMap<String, BatchState>()

    fun enqueue(
        sbn: StatusBarNotification,
        sender: String,
        message: String,
        phone: String,
        convKey: String,
        onFlush: suspend (
            sbn: StatusBarNotification,
            sender: String,
            phone: String,
            combinedMessage: String,
            convKey: String,
            batchedItems: List<String>,
        ) -> Unit,
    ) {
        val notifKey = "${sbn.packageName}|${sbn.tag ?: ""}|${sbn.id}"
        val state = batches.compute(convKey) { _, existing ->
            existing ?: BatchState(
                convKey = convKey,
                sender = sender,
                phone = phone,
                pkg = sbn.packageName,
                tag = sbn.tag,
                notificationId = sbn.id,
            )
        } ?: return

        synchronized(state) {
            state.sender = sender
            state.phone = phone
            state.pkg = sbn.packageName
            state.tag = sbn.tag
            state.notificationId = sbn.id
            state.lastSbn = sbn

            val duplicate = state.items.any { it.notifKey == notifKey && it.message == message }
            if (!duplicate) {
                state.items.add(PendingItem(message = message, notifKey = notifKey))
            }

            val gen = ++state.generation
            state.flushJob?.cancel()
            state.flushJob = scope.launch {
                delay(BATCH_WAIT_MS)
                val batch = batches.remove(convKey) ?: return@launch
                val flushPayload = synchronized(batch) {
                    if (batch.generation != gen) return@launch
                    if (batch.items.isEmpty()) return@launch
                    FlushPayload(
                        sender = batch.sender,
                        phone = batch.phone,
                        convKey = batch.convKey,
                        combined = combineMessages(batch.items.map { it.message }),
                        items = batch.items.map { it.message },
                        notification = resolveNotification(batch) ?: batch.lastSbn ?: sbn,
                    )
                }

                DebugLog.d(
                    service,
                    "BATCH",
                    "Replying once for ${flushPayload.items.size} message(s) from \"${flushPayload.sender}\" | combined=\"${flushPayload.combined.take(100)}\"",
                )

                onFlush(
                    flushPayload.notification,
                    flushPayload.sender,
                    flushPayload.phone,
                    flushPayload.combined,
                    flushPayload.convKey,
                    flushPayload.items,
                )
            }
        }

        DebugLog.d(
            service,
            "BATCH",
            "Queued message ${state.items.size} for \"$sender\" — waiting ${BATCH_WAIT_MS / 1000}s for more",
        )
    }

    private fun resolveNotification(state: BatchState): StatusBarNotification? {
        val active = service.activeNotifications ?: return state.lastSbn
        val withReply = active.filter {
            WhatsAppReplyHelper.isWhatsAppPackage(it.packageName, service) &&
                WhatsAppReplyHelper.hasReplyAction(it)
        }

        if (!state.tag.isNullOrBlank()) {
            withReply.firstOrNull { it.packageName == state.pkg && it.tag == state.tag }?.let { return it }
        }
        withReply.firstOrNull { it.packageName == state.pkg && it.id == state.notificationId }?.let { return it }

        return withReply.firstOrNull {
            val title = WhatsAppReplyHelper.extractSenderTitle(it)
            title.equals(state.sender, ignoreCase = true)
        } ?: state.lastSbn
    }

    private fun combineMessages(messages: List<String>): String {
        val cleaned = messages.map { it.trim() }.filter { it.isNotEmpty() }
        if (cleaned.isEmpty()) return "[media]"
        if (cleaned.size == 1) return cleaned[0]

        val grouped = cleaned.groupingBy { it.lowercase() }.eachCount()
        return grouped.entries.map { (text, count) ->
            val original = cleaned.first { it.lowercase() == text }
            if (count > 1) "$original (×$count)" else original
        }.joinToString("\n")
    }
}
