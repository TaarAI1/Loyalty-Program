package com.loyaltyplus.kiosk.ui

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.net.Uri
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.loyaltyplus.kiosk.ui.screens.ThankYouScreen
import com.loyaltyplus.kiosk.ui.theme.Gold
import kotlinx.coroutines.delay

@Composable
fun KioskApp(viewModel: KioskViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as? Activity
    val hasVideo = remember { hasRawVideo(context) }

    // ── Lock orientation per screen ───────────────────────────────────────────
    LaunchedEffect(state.screen) {
        activity?.requestedOrientation = when (state.screen) {
            Screen.SPLASH,
            Screen.SETUP,
            Screen.SETTINGS_PANEL -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            else -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
    }

    val showVideo = hasVideo && state.screen in setOf(
        Screen.HOME, Screen.CUSTOMER_LOOKUP, Screen.FORM, Screen.THANKS
    )
    val player = if (showVideo) rememberKioskPlayer(context) else null

    Box(modifier = Modifier.fillMaxSize()) {

        when (state.screen) {

            // ── Splash ────────────────────────────────────────────────────────
            Screen.SPLASH -> {
                SplashScreen()
                LaunchedEffect(Unit) {
                    delay(1_500)
                    viewModel.finishSplash()
                }
            }

            // ── Full-screen setup (first launch) ──────────────────────────────
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

            // ── Main screens (no sidebar) ─────────────────────────────────────
            Screen.SETTINGS_PANEL,
            Screen.HOME,
            Screen.CUSTOMER_LOOKUP,
            Screen.FORM,
            Screen.THANKS -> {
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
                        onGoHome = viewModel::navigateHome,
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

                // Gear icon — only on Home screen (top-right corner)
                if (state.screen == Screen.HOME) {
                    IconButton(
                        onClick = viewModel::navigateSettingsPanel,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp)
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xCC000000)),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Settings,
                            contentDescription = "Settings",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }

                // Back arrow on Settings Panel to return to Home
                if (state.screen == Screen.SETTINGS_PANEL) {
                    androidx.compose.material3.IconButton(
                        onClick = viewModel::navigateHome,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(12.dp),
                    ) {
                        Icon(
                            imageVector = androidx.compose.material.icons.Icons.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp),
                        )
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

// ── Splash screen ─────────────────────────────────────────────────────────────

@Composable
private fun SplashScreen() {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(100)
        visible = true
    }
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(600),
        label = "splash_alpha",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A14)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.alpha(alpha),
        ) {
            Text(
                text = "LOYALTY",
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                color = Gold,
                letterSpacing = 8.sp,
            )
            Text(
                text = "PLUS",
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 8.sp,
            )
            Spacer(Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .size(width = 60.dp, height = 3.dp)
                    .background(Gold),
            )
        }
    }
}

// ── Video player ──────────────────────────────────────────────────────────────

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
