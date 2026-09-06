# Book Scuba Goa — WhatsApp Assistant (Android)

This Android app auto-replies to **WhatsApp / WhatsApp Business** messages on **this phone** using your website AI (live packages, prices, booking link from Firestore catalog).

It is **separate** from Meta Cloud API / Social media WhatsApp settings — nothing in `/admin/social-media` is changed.

## How it works

1. Install the APK on the phone that receives business WhatsApp messages.
2. Grant **Notification access** to this app.
3. Enter website URL + mobile API secret.
4. Customer messages on WhatsApp → app calls `POST /api/mobile/whatsapp-assistant`.
5. Server runs the same AI as the WhatsApp agent (catalog, booking).
6. App sends reply via WhatsApp notification **Reply**.

## Server setup (Vercel)

```env
WHATSAPP_MOBILE_APP_SECRET=your-long-random-secret
OPENAI_API_KEY=...
```

Enable **WhatsApp AI agent** in Admin → Social media. Deploy, then use the same secret in the app.

## Build APK

```powershell
cd "E:\Website ScubaDiving\android\whatsapp-auto-reply"
.\gradlew.bat assembleDebug
```

APK: `app\build\outputs\apk\debug\app-debug.apk`

Or open the folder in **Android Studio** → Build → Build APK.

## Install

Copy APK to phone → allow unknown sources → install → enable notification access.

## Notes

- Business phone must stay online with WhatsApp running.
- Separate from Meta Cloud API — social media WhatsApp config unchanged.
- Disable battery optimization for reliable background use.
