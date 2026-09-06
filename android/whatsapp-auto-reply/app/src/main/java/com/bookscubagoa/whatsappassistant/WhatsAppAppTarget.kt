package com.bookscubagoa.whatsappassistant

enum class WhatsAppAppTarget(val prefValue: String) {
    BOTH("both"),
    NORMAL("normal"),
    BUSINESS("business"),
    ;

    companion object {
        fun fromPref(value: String?): WhatsAppAppTarget = when (value) {
            NORMAL.prefValue -> NORMAL
            BUSINESS.prefValue -> BUSINESS
            else -> BOTH
        }
    }

    fun displayLabel(): String = when (this) {
        BOTH -> "Both WhatsApp apps"
        NORMAL -> "WhatsApp only"
        BUSINESS -> "WhatsApp Business only"
    }
}
