package com.bookscubagoa.whatsappassistant

import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.content.ContextCompat

/**
 * Detects whether a WhatsApp chat belongs to someone saved in the phone book.
 * Auto-reply should only go to unknown numbers (unsaved customers).
 */
object PhoneContacts {
    private const val CACHE_MS = 5 * 60 * 1000L

    private var cacheAtMs = 0L
    private var phoneSuffixes = setOf<String>()
    private var displayNames = setOf<String>()

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.READ_CONTACTS,
        ) == PackageManager.PERMISSION_GRANTED

    fun isSavedContact(context: Context, contactLabel: String, phoneHint: String): Boolean {
        if (!hasPermission(context)) {
            return !looksLikeUnsavedNumber(contactLabel) && !looksLikeUnsavedNumber(phoneHint)
        }

        refreshCacheIfNeeded(context)

        val digits = normalizeDigits(phoneHint).ifEmpty { normalizeDigits(contactLabel) }
        if (digits.length >= 10) {
            val suffix = digits.takeLast(10)
            if (phoneSuffixes.contains(suffix)) return true
        }

        val name = normalizeName(contactLabel)
        if (name.isNotEmpty() && displayNames.contains(name)) return true

        return false
    }

    fun savedContactSkipReason(context: Context, contactLabel: String, phoneHint: String): String? {
        if (!isSavedContact(context, contactLabel, phoneHint)) return null
        return if (hasPermission(context)) {
            "saved phone contact — auto-reply only for unknown numbers"
        } else {
            "named chat (no phone number shown) — grant Contacts permission or save only customers as unknown numbers"
        }
    }

    /** WhatsApp shows +91… for unsaved chats; saved contacts show a name instead. */
    fun looksLikeUnsavedNumber(label: String): Boolean {
        if (label.isBlank()) return false
        val digits = normalizeDigits(label)
        return digits.length >= 10
    }

    fun invalidateCache() {
        cacheAtMs = 0L
        phoneSuffixes = emptySet()
        displayNames = emptySet()
    }

    private fun refreshCacheIfNeeded(context: Context) {
        val now = System.currentTimeMillis()
        if (now - cacheAtMs < CACHE_MS && phoneSuffixes.isNotEmpty()) return

        val phones = linkedSetOf<String>()
        val names = linkedSetOf<String>()

        val resolver = context.applicationContext.contentResolver
        runCatching {
            resolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ),
                null,
                null,
                null,
            )?.use { cursor ->
                val numberIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                while (cursor.moveToNext()) {
                    if (numberIdx >= 0) {
                        val digits = normalizeDigits(cursor.getString(numberIdx))
                        if (digits.length >= 10) {
                            phones.add(digits.takeLast(10))
                        }
                    }
                    if (nameIdx >= 0) {
                        normalizeName(cursor.getString(nameIdx)).takeIf { it.isNotEmpty() }?.let(names::add)
                    }
                }
            }
        }

        phoneSuffixes = phones
        displayNames = names
        cacheAtMs = now
    }

    private fun normalizeDigits(text: String?): String =
        text?.filter { it.isDigit() } ?: ""

    private fun normalizeName(text: String?): String =
        text?.trim()?.lowercase()?.replace(Regex("\\s+"), " ") ?: ""
}
