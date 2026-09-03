package com.loyaltyplus.kiosk.ui

import android.content.Context
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import com.loyaltyplus.kiosk.R
import com.loyaltyplus.kiosk.ui.screens.FormScreen
import com.loyaltyplus.kiosk.ui.screens.HomeScreen
import com.loyaltyplus.kiosk.ui.screens.PinDialog
import com.loyaltyplus.kiosk.ui.screens.SettingsScreen
import com.loyaltyplus.kiosk.ui.screens.ThankYouScreen

@Composable
fun KioskApp(viewModel: KioskViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val hasVideo = remember { hasRawVideo(context) }

    // Shared video player — only active while HOME or FORM is showing
    val showVideo = hasVideo && (state.screen == Screen.HOME || state.screen == Screen.FORM)
    val player = if (showVideo) rememberKioskPlayer(context) else null

    Box(modifier = Modifier.fillMaxSize()) {

        // Video background layer (persistent between HOME ↔ FORM)
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
            Screen.SETTINGS -> SettingsScreen(
                apiUrl = state.apiUrl,
                pairingCode = state.pairingCode,
                isConnecting = state.isConnecting,
                toast = state.connectionToast,
                onApiUrlChange = viewModel::onApiUrlChange,
                onPairingCodeChange = viewModel::onPairingCodeChange,
                onConnect = viewModel::connect,
                onToastDismissed = viewModel::clearToast,
            )

            Screen.HOME -> HomeScreen(
                device = state.device,
                formName = state.form.name,
                hasVideo = showVideo,
                onFillForm = viewModel::startForm,
                onOpenSettings = viewModel::requestSettings,
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
                onOpenSettings = viewModel::requestSettings,
            )

            Screen.THANKS -> ThankYouScreen(onDone = viewModel::resetForNextCustomer)
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
            val uri = Uri.parse("android.resource://${context.packageName}/${R.raw.kiosk_bg}")
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
