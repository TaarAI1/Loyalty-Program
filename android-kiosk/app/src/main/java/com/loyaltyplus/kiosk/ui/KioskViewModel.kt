package com.loyaltyplus.kiosk.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.loyaltyplus.kiosk.data.DeviceDto
import com.loyaltyplus.kiosk.data.KioskApi
import com.loyaltyplus.kiosk.data.KioskPreferences
import com.loyaltyplus.kiosk.data.SampleForm
import com.loyaltyplus.kiosk.data.SurveyForm
import com.loyaltyplus.kiosk.data.toSurveyForm
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Screen { SETTINGS, HOME, FORM, THANKS }

data class KioskUiState(
    val screen: Screen = Screen.SETTINGS,
    val apiUrl: String = "",
    val pairingCode: String = "",
    val device: DeviceDto? = null,
    val form: SurveyForm = SampleForm.form,
    val questionIndex: Int = 0,
    val answers: Map<Int, String> = emptyMap(),
    val showPinDialog: Boolean = false,
    val pinError: String? = null,
    val formError: String? = null,
    // Settings screen state
    val isConnecting: Boolean = false,
    val connectionToast: ToastMessage? = null,
    // Form submit state
    val isSubmitting: Boolean = false,
)

data class ToastMessage(
    val message: String,
    val isError: Boolean = false,
)

class KioskViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = KioskPreferences(application)

    private val _state = MutableStateFlow(
        KioskUiState(
            screen = if (prefs.setupComplete) Screen.HOME else Screen.SETTINGS,
            apiUrl = prefs.apiUrl,
            pairingCode = prefs.pairingCode,
        ),
    )
    val state: StateFlow<KioskUiState> = _state.asStateFlow()

    fun onApiUrlChange(value: String) = _state.update { it.copy(apiUrl = value, connectionToast = null) }
    fun onPairingCodeChange(value: String) = _state.update { it.copy(pairingCode = value, connectionToast = null) }

    fun connect() {
        val s = _state.value
        if (s.apiUrl.isBlank() || s.pairingCode.isBlank()) {
            _state.update { it.copy(connectionToast = ToastMessage("Enter API URL and pairing code.", isError = true)) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isConnecting = true, connectionToast = null) }
            try {
                val response = KioskApi.connect(s.apiUrl, s.pairingCode)
                prefs.apiUrl = s.apiUrl
                prefs.pairingCode = s.pairingCode
                prefs.setupComplete = true
                _state.update {
                    it.copy(
                        isConnecting = false,
                        device = response.device,
                        form = response.form.toSurveyForm(),
                        screen = Screen.HOME,
                        connectionToast = ToastMessage("Connected to ${response.device.name}!", isError = false),
                    )
                }
            } catch (e: Exception) {
                val message = when {
                    e.message?.contains("404") == true -> "Device not found. Check your pairing code."
                    e.message?.contains("UnknownHost") == true ||
                    e.message?.contains("ConnectException") == true -> "Cannot reach server. Check the API URL."
                    else -> e.message?.take(120) ?: "Connection failed."
                }
                _state.update { it.copy(isConnecting = false, connectionToast = ToastMessage(message, isError = true)) }
            }
        }
    }

    fun clearToast() = _state.update { it.copy(connectionToast = null) }

    fun startForm() {
        _state.update { it.copy(screen = Screen.FORM, questionIndex = 0, answers = emptyMap(), formError = null) }
    }

    fun requestSettings() = _state.update { it.copy(showPinDialog = true, pinError = null) }
    fun dismissPin() = _state.update { it.copy(showPinDialog = false, pinError = null) }

    fun submitPin(pin: String) {
        if (pin == prefs.staffPin) {
            _state.update {
                it.copy(
                    screen = Screen.SETTINGS,
                    showPinDialog = false,
                    pinError = null,
                    apiUrl = prefs.apiUrl,
                    pairingCode = prefs.pairingCode,
                    connectionToast = null,
                )
            }
        } else {
            _state.update { it.copy(pinError = "Wrong PIN. Default is ${KioskPreferences.DEFAULT_PIN}.") }
        }
    }

    fun setAnswer(questionId: Int, value: String) {
        _state.update { it.copy(answers = it.answers + (questionId to value), formError = null) }
    }

    fun nextQuestion() {
        val s = _state.value
        val question = s.form.questions.getOrNull(s.questionIndex) ?: return
        if (question.required && s.answers[question.id].isNullOrBlank()) {
            _state.update { it.copy(formError = "Please choose an answer to continue.") }
            return
        }
        if (s.questionIndex >= s.form.questions.lastIndex) {
            submitForm()
            return
        }
        _state.update { it.copy(questionIndex = s.questionIndex + 1, formError = null) }
    }

    fun previousQuestion() {
        _state.update { it.copy(questionIndex = (it.questionIndex - 1).coerceAtLeast(0), formError = null) }
    }

    private fun submitForm() {
        val s = _state.value
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true) }
            try {
                val answers = s.answers.map { (qId, value) ->
                    mapOf("questionId" to qId.toString(), "value" to value)
                }
                KioskApi.submit(prefs.apiUrl, prefs.pairingCode, answers)
            } catch (_: Exception) {
                // Submission failure is non-blocking — still show thank you
            } finally {
                _state.update { it.copy(isSubmitting = false, screen = Screen.THANKS) }
            }
        }
    }

    fun resetForNextCustomer() {
        _state.update { it.copy(screen = Screen.HOME, questionIndex = 0, answers = emptyMap(), formError = null) }
    }
}
