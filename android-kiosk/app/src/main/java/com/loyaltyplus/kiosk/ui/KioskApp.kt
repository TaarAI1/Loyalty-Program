package com.loyaltyplus.kiosk.ui

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.loyaltyplus.kiosk.ui.screens.CustomerLookupScreen
import com.loyaltyplus.kiosk.ui.screens.FormScreen
import com.loyaltyplus.kiosk.ui.screens.HomeScreen
import com.loyaltyplus.kiosk.ui.screens.PinDialog
import com.loyaltyplus.kiosk.ui.screens.SettingsScreen
import com.loyaltyplus.kiosk.ui.screens.SidebarLayout
import com.loyaltyplus.kiosk.ui.screens.ThankYouScreen

@Composable
fun KioskApp(viewModel: KioskViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as? Activity
    val hasVideo = remember { hasRawVideo(context) }

    // ── Lock orientation per screen ───────────────────────────────────────────
    LaunchedEffect(state.screen) {
        activity?.requestedOrientation = when (state.screen) {
            Screen.SETUP,
            Screen.SETTINGS_PANEL -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            else -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
    }

    // Video active on HOME, CUSTOMER_LOOKUP, FORM, THANKS
    val showVideo = hasVideo && state.screen in setOf(
        Screen.HOME, Screen.CUSTOMER_LOOKUP, Screen.FORM, Screen.THANKS
    )
    val player = if (showVideo) rememberKioskPlayer(context) else null

    Box(modifier = Modifier.fillMaxSize()) {

        when (state.screen) {

            // ── Full-screen setup ─────────────────────────────────────────────
            Screen.SETUP -> SettingsScreen(
                apiUrl = state.apiUrl,
                pairingCode = state.pairingCode,
                isConnecting = state.isConnecting,
                toast = state.connectionToast,
                isEmbedded = false,
                onApiUrlChange = viewModel::onApiUrlChange,
                onPairingCodeChange = viewModel::onPairingCodeChange,
                onConnect = viewModel::connect,
                onToastDismissed = viewModel::clearToast,
            )

            // ── Main layout with sidebar ──────────────────────────────────────
            Screen.HOME,
            Screen.SETTINGS_PANEL,
            Screen.CUSTOMER_LOOKUP,
            Screen.FORM,
            Screen.THANKS -> {
                SidebarLayout(
                    sidebarOpen = state.sidebarOpen,
                    activeScreen = state.screen,
                    onToggleSidebar = viewModel::toggleSidebar,
                    onNavigateHome = viewModel::navigateHome,
                    onNavigateSettings = viewModel::navigateSettingsPanel,
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {

                        // Video background layer
                        if (showVideo && player != null) {
                            AndroidView(
                                factory = { ctx ->
                                    PlayerView(ctx).apply {
                                        this.player = player
                                        useController = false
                                        setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                                    }
                                },
                                modifier = Modifier.fillMaxSize(),
                            )
                        }

                        when (state.screen) {
                            Screen.HOME -> HomeScreen(
                                device = state.device,
                                formName = state.form.name,
                                hasVideo = showVideo,
                                onFillForm = viewModel::startForm,
                            )

                            Screen.SETTINGS_PANEL -> SettingsScreen(
                                apiUrl = state.apiUrl,
                                pairingCode = state.pairingCode,
                                isConnecting = state.isConnecting,
                                toast = state.connectionToast,
                                isEmbedded = true,
                                onApiUrlChange = viewModel::onApiUrlChange,
                                onPairingCodeChange = viewModel::onPairingCodeChange,
                                onConnect = viewModel::connect,
                                onToastDismissed = viewModel::clearToast,
                            )

                            Screen.CUSTOMER_LOOKUP -> CustomerLookupScreen(
                                customerName = state.customerName,
                                customerPhone = state.customerPhone,
                                isLookingUp = state.isLookingUp,
                                toast = state.lookupToast,
                                onNameChange = viewModel::onCustomerNameChange,
                                onPhoneChange = viewModel::onCustomerPhoneChange,
                                onContinue = viewModel::lookupCustomer,
                                onToastDismissed = viewModel::clearLookupToast,
                            )

                            Screen.FORM -> FormScreen(
                                form = state.form,
                                questionIndex = state.questionIndex,
                                answers = state.answers,
                                error = state.formError,
                                isSubmitting = state.isSubmitting,
                                onAnswer = viewModel::setAnswer,
                                onNext = viewModel::nextQuestion,
                                onBack = viewModel::previousQuestion,
                                onGoHome = viewModel::navigateHome,
                                onOpenSettings = viewModel::requestSettings,
                            )

                            Screen.THANKS -> ThankYouScreen(onDone = viewModel::resetForNextCustomer)

                            else -> Unit
                        }
                    }
                }
            }
        }

        if (state.showPinDialog) {
            PinDialog(
                error = state.pinError,
                onDismiss = viewModel::dismissPin,
                onSubmit = viewModel::submitPin,
            )
        }
    }
}

@Composable
private fun rememberKioskPlayer(context: Context): ExoPlayer {
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            val resId = context.resources.getIdentifier("kiosk_bg", "raw", context.packageName)
            val uri = Uri.parse("android.resource://${context.packageName}/$resId")
            setMediaItem(MediaItem.fromUri(uri))
            repeatMode = Player.REPEAT_MODE_ALL
            volume = 0f
            prepare()
            play()
        }
    }
    DisposableEffect(Unit) { onDispose { player.release() } }
    return player
}

private fun hasRawVideo(context: Context): Boolean =
    try {
        context.resources.getIdentifier("kiosk_bg", "raw", context.packageName) != 0
    } catch (_: Exception) { false }
