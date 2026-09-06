package com.bookscubagoa.whatsappassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        if (Prefs.isAutoReplyEnabled(context)) {
            AssistantForegroundService.start(context)
        }
    }
}
