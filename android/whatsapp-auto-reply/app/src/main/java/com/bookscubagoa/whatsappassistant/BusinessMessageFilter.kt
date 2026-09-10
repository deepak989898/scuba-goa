package com.bookscubagoa.whatsappassistant

/**
 * Skips WhatsApp marketing / business broadcast chats (banks, apps, offers, etc.).
 */
object BusinessMessageFilter {
    private val SENDER_KEYWORDS = listOf(
        "abhibus",
        "redbus",
        "paytm",
        "phonepe",
        "google pay",
        "gpay",
        "bhim",
        "amazon",
        "flipkart",
        "myntra",
        "swiggy",
        "zomato",
        "blinkit",
        "zepto",
        "uber",
        "ola",
        "rapido",
        "makemytrip",
        "goibibo",
        "ixigo",
        "irctc",
        "indigo",
        "spicejet",
        "air india",
        "state bank",
        "sbi",
        "hdfc",
        "icici",
        "axis bank",
        "kotak",
        "yes bank",
        "pnb",
        "bank of baroda",
        "canara bank",
        "union bank",
        "idfc",
        "bajaj",
        "tata neu",
        "jio",
        "airtel",
        "vi ",
        "vodafone",
        "bsnl",
        "whatsapp business",
        "meta verified",
        "truecaller",
        "cred",
        "groww",
        "zerodha",
        "policybazaar",
        "acko",
        "dunzo",
        "bigbasket",
        "meesho",
        "snapdeal",
        "bookmyshow",
        "district",
        "netflix",
        "hotstar",
        "spotify",
        "linkedin",
        "facebook",
        "instagram",
        "telegram channel",
        "newsletter",
        "offers",
        "alerts",
        "notifications",
    )

    private val PROMO_TEXT_PATTERNS = listOf(
        "sign up free",
        "earn up to",
        "% commission",
        "cashback offer",
        "limited period offer",
        "tap to avail",
        "unsubscribe",
        "promotional message",
        "this is a promotional",
        "welcome reward is now active",
        "bus ticket booking platform",
        "travel agents",
        "start booking",
        "click here to",
        "offer ends",
        "sale ends",
        "dear customer,",
        "dear user,",
    )

    fun skipReason(sender: String, contactLabel: String, message: String): String? {
        val senderHay = normalize(sender)
        val contactHay = normalize(contactLabel)
        val combinedHay = "$senderHay $contactHay"

        for (keyword in SENDER_KEYWORDS) {
            if (combinedHay.contains(keyword)) {
                return "business / advertising sender ($keyword)"
            }
        }

        val messageHay = normalize(message)
        for (pattern in PROMO_TEXT_PATTERNS) {
            if (messageHay.contains(pattern)) {
                return "promotional / advertising message"
            }
        }

        return null
    }

    private fun normalize(text: String): String =
        text.trim().lowercase().replace(Regex("\\s+"), " ")
}
