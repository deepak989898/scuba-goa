type LangKey = string;

const MESSAGES: Record<string, Record<LangKey, string>> = {
  welcome: {
    English:
      "Hi! 👋 Welcome to Book Scuba Goa. I can help you book scuba, water sports, casino & more at live prices. Tap below to start, or type any question.",
    Hindi:
      "नमस्ते! 👋 Book Scuba Goa में आपका स्वागत है। Scuba, water sports, casino आदि बुक करने में मदद करूँगा। शुरू करने के लिए टैप करें या कोई सवाल लिखें।",
  },
  startBooking: {
    English: "Start booking",
    Hindi: "बुकिंग शुरू करें",
  },
  askQuestion: {
    English: "Just asking",
    Hindi: "सिर्फ पूछताछ",
  },
  datePrompt: {
    English: "Great! Which date are you planning? 📅",
    Hindi: "बढ़िया! किस तारीख के लिए प्लान है? 📅",
  },
  peoplePrompt: {
    English: "How many people? 👥",
    Hindi: "कितने लोग? 👥",
  },
  pickupPrompt: {
    English: "Pickup location? 📍 (Free pickup in North Goa on most packages)",
    Hindi: "पिकअप लोकेशन? 📍 (North Goa में ज़्यादातर पैकेज पर फ्री पिकअप)",
  },
  categoryPrompt: {
    English: "What are you interested in? Tap one or more categories.",
    Hindi: "क्या बुक करना चाहते हैं? कैटेगरी टैप करें।",
  },
  packagesPrompt: {
    English: "Tap packages to add — you can pick multiple. Then tap Continue.",
    Hindi: "पैकेज टैप करें — कई चुन सकते हैं। फिर Continue टैप करें।",
  },
  reviewPrompt: {
    English: "Here's your plan & price. Slots look good — tap Continue to confirm details.",
    Hindi: "यहाँ आपका प्लान और प्राइस है। स्लॉट्स उपलब्ध हैं — Continue टैप करें।",
  },
  contactPrompt: {
    English: "Almost done! Your name, phone & email for confirmation. ✍️",
    Hindi: "लगभग हो गया! कन्फर्मेशन के लिए नाम, फोन और ईमेल। ✍️",
  },
  paymentPrompt: {
    English: "Pay now to lock your slots. Balance (if any) on arrival. 💳",
    Hindi: "स्लॉट लॉक करने के लिए अभी पे करें। बाकी रकम (अगर हो) पहुँचने पर। 💳",
  },
  confirmed: {
    English:
      "🎉 Booking confirmed! Invoice sent to your email & SMS/WhatsApp link. Our team will call before your trip.",
    Hindi:
      "🎉 बुकिंग कन्फर्म! ईमेल और SMS/WhatsApp पर invoice भेज दिया। ट्रिप से पहले हमारी टीम कॉल करेगी।",
  },
  payMin: {
    English: "Pay advance",
    Hindi: "एडवांस पे करें",
  },
  payFull: {
    English: "Pay full amount",
    Hindi: "पूरा अमाउंट पे करें",
  },
  continue: {
    English: "Continue",
    Hindi: "Continue",
  },
  back: {
    English: "← Back",
    Hindi: "← वापस",
  },
  slotsLow: {
    English: "Only {n} slots left for {name} — book soon!",
    Hindi: "{name} के लिए सिर्फ {n} स्लॉट बचे — जल्दी बुक करें!",
  },
  slotsOk: {
    English: "Slots available for your date ✅",
    Hindi: "आपकी तारीख के लिए स्लॉट उपलब्ध ✅",
  },
  thinking: {
    English: "…",
    Hindi: "…",
  },
  aiFallback: {
    English:
      "I'm having a quick connection issue. Try again or tap Start booking — I'll help you right here.",
    Hindi:
      "कनेक्शन में दिक्कत है। दोबारा ट्राई करें या Start booking टैप करें।",
  },
};

export function t(key: LangKey, lang: string, vars?: Record<string, string>): string {
  const bucket = MESSAGES[key];
  if (!bucket) return key;
  let text = bucket[lang] ?? bucket.English ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
