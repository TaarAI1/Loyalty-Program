# LoyaltyPlus Kiosk (Android)

Native in-store feedback app for **tablets and phones**. The LoyaltyPlus **website stays as the admin**. This app is only the store kiosk screen.

This first version uses a **sample form** so you can run it now. Connecting it to live forms from the website is the next step.

## What you need

1. [Android Studio](https://developer.android.com/studio) (install the default SDK when it asks).
2. A tablet or phone (USB cable), **or** the emulator inside Android Studio.

You do **not** need a new Cursor folder. This app lives in `loyalty-program/android-kiosk`.

## Open and run

1. Open **Android Studio**.
2. **File → Open**.
3. Select this folder: `d:\loyalty-program\android-kiosk` (the `android-kiosk` folder, not the whole loyalty-program folder).
4. Wait for **Gradle Sync** to finish (first time it downloads tools; this can take several minutes).
5. If it asks to install an SDK or JDK 17, accept.
6. Plug in the tablet:
   - Tablet **Settings → About tablet** → tap **Build number** 7 times.
   - **Developer options → USB debugging → ON**.
   - Allow the USB prompt on the tablet.
7. At the top of Android Studio, pick your tablet in the device list.
8. Press the green **Run** button.

The app name on the device is **LoyaltyPlus Kiosk**.

## How to use the app

1. First screen is **Settings** (attach LoyaltyPlus).
2. You can type an API URL and pairing code and tap **Save attachment**. Pairing to the live website is not wired yet.
3. Tap **Show sample form** to try the kiosk.
4. Customers answer one question at a time (stars, emoji, yes/no, choices, text).
5. After **Submit**, a thank-you screen appears, then the form starts again.

Staff: **long-press** the word **LOYALTYPLUS** on the form → PIN **1234** → Settings.

## Pin the app in the store (optional)

On the tablet: open the kiosk → Recents / Overview → tap the app icon → **Pin**. Staff unpin with the device PIN so customers cannot leave the app.

## Next step

LoyaltyPlus API will get pairing + form download + save answers. Then this app’s Settings will load the real form you create on the website.
