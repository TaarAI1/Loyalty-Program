package com.loyaltyplus.kiosk.data

import android.content.Context

class KioskPreferences(context: Context) {

    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var apiUrl: String
        get() = prefs.getString(KEY_API_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_API_URL, value.trim()).apply()

    var pairingCode: String
        get() = prefs.getString(KEY_PAIRING, "") ?: ""
        set(value) = prefs.edit().putString(KEY_PAIRING, value.trim().uppercase()).apply()

    var staffPin: String
        get() = prefs.getString(KEY_PIN, DEFAULT_PIN) ?: DEFAULT_PIN
        set(value) = prefs.edit().putString(KEY_PIN, value).apply()

    var setupComplete: Boolean
        get() = prefs.getBoolean(KEY_SETUP, false)
        set(value) = prefs.edit().putBoolean(KEY_SETUP, value).apply()

    companion object {
        private const val PREFS = "loyaltyplus_kiosk"
        private const val KEY_API_URL = "api_url"
        private const val KEY_PAIRING = "pairing_code"
        private const val KEY_PIN = "staff_pin"
        private const val KEY_SETUP = "setup_complete"
        const val DEFAULT_PIN = "1234"
    }
}
