package com.bookscubagoa.whatsappassistant

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.lifecycleScope
import com.bookscubagoa.whatsappassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

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

        binding.saveButton.setOnClickListener { saveSettings() }
        binding.testButton.setOnClickListener { testConnection() }
        binding.notificationAccessButton.setOnClickListener { openNotificationAccess() }
        binding.batteryButton.setOnClickListener { openBatterySettings() }

        requestPostNotificationsIfNeeded()
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        binding.logText.text = Prefs.readLog(this)
        refreshStatus()
    }

    private fun saveSettings() {
        val url = binding.urlInput.text?.toString()?.trim() ?: ""
        val secret = binding.secretInput.text?.toString()?.trim() ?: ""
        val enabled = binding.autoReplySwitch.isChecked

        if (url.isEmpty() || secret.isEmpty()) {
            Toast.makeText(this, "Website URL and API secret are required", Toast.LENGTH_LONG).show()
            return
        }

        Prefs.save(this, url, secret, enabled)
        if (enabled) {
            AssistantForegroundService.start(this)
            if (!isNotificationListenerEnabled()) {
                Toast.makeText(
                    this,
                    "Enable notification access for WhatsApp auto-reply",
                    Toast.LENGTH_LONG,
                ).show()
                openNotificationAccess()
            }
        } else {
            AssistantForegroundService.stop(this)
        }

        Prefs.appendLog(this, "Settings saved — auto-reply ${if (enabled) "ON" else "OFF"}")
        binding.logText.text = Prefs.readLog(this)
        refreshStatus()
        Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
    }

    private fun testConnection() {
        lifecycleScope.launch {
            binding.testButton.isEnabled = false
            val result = ApiClient.testConnection(this@MainActivity)
            binding.testButton.isEnabled = true
            Toast.makeText(this@MainActivity, result, Toast.LENGTH_LONG).show()
            Prefs.appendLog(this@MainActivity, "Test: $result")
            binding.logText.text = Prefs.readLog(this@MainActivity)
        }
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

    private fun refreshStatus() {
        val enabled = Prefs.isAutoReplyEnabled(this)
        val listener = isNotificationListenerEnabled()
        val lines = buildList {
            add(if (enabled) getString(R.string.status_running) else getString(R.string.status_stopped))
            add("Notification access: ${if (listener) "ON" else "OFF — tap button above"}")
            add("Website: ${Prefs.baseUrl(this@MainActivity)}")
            if (enabled && listener) {
                add("Ready — WhatsApp messages will get AI replies from your website.")
            }
        }
        binding.statusText.text = lines.joinToString("\n")
        binding.logText.text = Prefs.readLog(this)
    }
}
