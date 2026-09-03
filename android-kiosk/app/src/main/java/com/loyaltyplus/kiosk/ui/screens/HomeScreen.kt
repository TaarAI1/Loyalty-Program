package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.data.DeviceDto
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink

private val GradientTop = Color(0xFF0D0D1A)
private val GradientMid = Color(0xFF1A1A3E)
private val GradientBot = Color(0xFF0A0A15)
private val OverlayScrim = Color(0x99000000)

@Composable
fun HomeScreen(
    device: DeviceDto?,
    formName: String,
    hasVideo: Boolean,
    onFillForm: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {

        // Gradient background (shows when no video, overlaid transparently when video plays)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(GradientTop, GradientMid, GradientBot),
                    )
                )
        )

        // Dark overlay scrim (slightly lighter when showing video so it doesn't hide it completely)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(if (hasVideo) Color(0x77000000) else OverlayScrim)
        )

        // Glowing accent circles
        GlowingAccent(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 60.dp, end = 40.dp)
        )
        GlowingAccent(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(bottom = 100.dp, start = 20.dp),
            delayMillis = 1200,
        )

        // Main content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp, vertical = 48.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Top: Branding — long-press to open settings
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.pointerInput(Unit) {
                    detectTapGestures(onLongPress = { onOpenSettings() })
                },
            ) {
                Text(
                    text = "LOYALTYPLUS",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 5.sp,
                    color = Gold,
                )
                Spacer(Modifier.height(12.dp))
                device?.store?.let { store ->
                    Text(
                        text = store.uppercase(),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 3.sp,
                        color = Color.White.copy(alpha = 0.5f),
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }

            // Center: Big headline
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.widthIn(max = 480.dp),
            ) {
                Text(
                    text = "Share your\nexperience",
                    fontSize = 52.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    lineHeight = 58.sp,
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Your feedback helps us serve you better.",
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center,
                )
            }

            // Bottom: CTA button
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .widthIn(max = 400.dp)
                    .fillMaxWidth(),
            ) {
                PulsingButton(onClick = onFillForm)
                Spacer(Modifier.height(16.dp))
                Text(
                    text = formName,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.35f),
                    letterSpacing = 1.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun PulsingButton(onClick: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.035f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulse_scale",
    )
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .scale(scale),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp),
    ) {
        Text(
            text = "Fill Form",
            fontWeight = FontWeight.Black,
            fontSize = 20.sp,
            letterSpacing = 1.sp,
        )
    }
}

@Composable
private fun GlowingAccent(modifier: Modifier = Modifier, delayMillis: Int = 0) {
    val infiniteTransition = rememberInfiniteTransition(label = "glow")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.04f,
        targetValue = 0.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000 + delayMillis, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )
    Box(
        modifier = modifier
            .alpha(alpha)
            .background(
                Brush.radialGradient(listOf(Gold, Color.Transparent)),
                shape = RoundedCornerShape(50),
            )
            .height(220.dp)
            .widthIn(min = 220.dp)
    )
}
