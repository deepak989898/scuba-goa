package com.bookscubagoa.whatsappassistant

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.bookscubagoa.whatsappassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val logRefreshHandler = Handler(Looper.getMainLooper())
    private val logRefreshRunnable = object : Runnable {
        override fun run() {
            binding.logText.text = Prefs.readLog(this@MainActivity)
            logRefreshHandler.postDelayed(this, 2000)
        }
    }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            refreshStatus()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.urlInput.setText(Prefs.baseUrl(this))
        binding.secretInput.setText(Prefs.apiSecret(this))
        binding.autoReplySwitch.isChecked = Prefs.isAutoReplyEnabled(this)
        setupWhatsAppTargetDropdown()

        binding.saveButton.setOnClickListener { saveSettings() }
        binding.testButton.setOnClickListener { testConnection() }
        binding.testReplyButton.setOnClickListener { testAiReply() }
        binding.notificationAccessButton.setOnClickListener { openNotificationAccess() }
        binding.batteryButton.setOnClickListener { openBatterySettings() }
        binding.copyLogButton.setOnClickListener { copyLog() }
        binding.clearLogButton.setOnClickListener { clearLog() }
        binding.refreshLogButton.setOnClickListener { refreshLogs() }

        requestPostNotificationsIfNeeded()
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshLogs()
        refreshStatus()
        logRefreshHandler.post(logRefreshRunnable)
    }

    override fun onPause() {
        super.onPause()
        logRefreshHandler.removeCallbacks(logRefreshRunnable)
    }

    private fun saveSettings() {
        val url = binding.urlInput.text?.toString()?.trim() ?: ""
        val secret = binding.secretInput.text?.toString()?.trim() ?: ""
        val enabled = binding.autoReplySwitch.isChecked

        if (url.isEmpty() || secret.isEmpty()) {
            Toast.makeText(this, "Website URL and API secret are required", Toast.LENGTH_LONG).show()
            return
        }

        Prefs.save(this, url, secret, enabled, readWhatsAppTargetSelection())

        if (enabled && !isNotificationListenerEnabled()) {
            Toast.makeText(
                this,
                "Enable notification access for WhatsApp auto-reply",
                Toast.LENGTH_LONG,
            ).show()
            openNotificationAccess()
        }

        DebugLog.d(
            this,
            "APP",
            "Settings saved — auto-reply ${if (enabled) "ON" else "OFF"}, target=${readWhatsAppTargetSelection().displayLabel()}",
        )
        refreshLogs()
        refreshStatus()
        Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
    }

    private fun testConnection() {
        lifecycleScope.launch {
            binding.testButton.isEnabled = false
            val result = ApiClient.testConnection(this@MainActivity)
            binding.testButton.isEnabled = true
            Toast.makeText(this@MainActivity, result, Toast.LENGTH_LONG).show()
            refreshLogs()
        }
    }

    private fun testAiReply() {
        lifecycleScope.launch {
            binding.testReplyButton.isEnabled = false
            DebugLog.d(this@MainActivity, "TEST", "Manual AI test with message \"Hi\"")
            val result = ApiClient.fetchReply(
                context = this@MainActivity,
                senderName = "Debug Test User",
                phone = "9999999999",
                message = "Hi",
            )
            binding.testReplyButton.isEnabled = true
            val summary = when {
                !result.ok -> "AI test failed: ${result.error}"
                result.skipped -> "AI test skipped: ${result.debugReason ?: "unknown"}"
                result.reply.isNullOrBlank() -> "AI test: empty reply"
                else -> "AI test OK (${result.elapsedMs}ms): ${result.reply.take(120)}"
            }
            DebugLog.d(this@MainActivity, "TEST", summary)
            Toast.makeText(this@MainActivity, summary, Toast.LENGTH_LONG).show()
            refreshLogs()
        }
    }

    private fun copyLog() {
        val log = Prefs.readLog(this)
        val clipboard = getSystemService(ClipboardManager::class.java)
        clipboard.setPrimaryClip(ClipData.newPlainText("WhatsApp Assistant Debug Log", log))
        Toast.makeText(this, "Debug log copied — paste in chat", Toast.LENGTH_LONG).show()
    }

    private fun clearLog() {
        Prefs.clearLog(this)
        DebugLog.d(this, "APP", "Log cleared")
        refreshLogs()
    }

    private fun refreshLogs() {
        binding.logText.text = Prefs.readLog(this)
    }

    private fun openNotificationAccess() {
        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    private fun openBatterySettings() {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:$packageName")
        }
        runCatching { startActivity(intent) }.getOrElse {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun requestPostNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners",
        ) ?: return false
        val cn = ComponentName(this, WhatsAppNotificationListener::class.java)
        return flat.contains(cn.flattenToString())
    }

    private fun setupWhatsAppTargetDropdown() {
        val options = listOf(
            WhatsAppAppTarget.BOTH,
            WhatsAppAppTarget.NORMAL,
            WhatsAppAppTarget.BUSINESS,
        )
        val labels = options.map { it.displayLabel() }
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, labels)
        binding.whatsappTargetInput.setAdapter(adapter)
        binding.whatsappTargetInput.setText(Prefs.whatsAppTarget(this).displayLabel(), false)
        binding.whatsappTargetInput.setOnItemClickListener { _, _, position, _ ->
            binding.whatsappTargetInput.setText(labels[position], false)
        }
    }

    private fun readWhatsAppTargetSelection(): WhatsAppAppTarget {
        val label = binding.whatsappTargetInput.text?.toString()?.trim() ?: ""
        return when (label) {
            WhatsAppAppTarget.NORMAL.displayLabel() -> WhatsAppAppTarget.NORMAL
            WhatsAppAppTarget.BUSINESS.displayLabel() -> WhatsAppAppTarget.BUSINESS
            else -> WhatsAppAppTarget.BOTH
        }
    }

    private fun refreshStatus() {
        val enabled = Prefs.isAutoReplyEnabled(this)
        val listener = isNotificationListenerEnabled()
        val target = Prefs.whatsAppTarget(this)
        val lines = buildList {
            add(if (enabled) getString(R.string.status_running) else getString(R.string.status_stopped))
            add("Listening: ${target.displayLabel()}")
            add("Notification access: ${if (listener) "ON" else "OFF — tap button above"}")
            add("Website: ${Prefs.baseUrl(this@MainActivity)}")
            if (enabled && listener) {
                add("Ready — send a test WhatsApp, then check Debug log below.")
            }
        }
        binding.statusText.text = lines.joinToString("\n")
    }
}
