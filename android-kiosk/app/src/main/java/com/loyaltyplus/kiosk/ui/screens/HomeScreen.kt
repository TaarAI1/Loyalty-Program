package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.data.DeviceDto
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink

// Very dark navy fallback (shown when no video file)
private val GradientTop = Color(0xFF0D0D1A)
private val GradientMid = Color(0xFF1A1A3E)
private val GradientBot = Color(0xFF0A0A15)

// Scrim layers — light so the video stays visible
private val TopScrim    = Color(0xCC000000)   // darker band at very top for logo legibility
private val VideoScrim  = Color(0x22000000)   // almost transparent — lets video breathe
private val BottomScrim = Color(0xBB000000)   // darker band at bottom for text legibility

@Composable
fun HomeScreen(
    device: DeviceDto?,
    formName: String,
    hasVideo: Boolean,
    onFillForm: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {

        // ── Gradient fallback (only visible when no video) ────────────────────
        if (!hasVideo) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(listOf(GradientTop, GradientMid, GradientBot))
                    )
            )
        }

        // ── Three-zone scrim over the video ───────────────────────────────────
        // Top band — darkens behind the branding text
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)
                .align(Alignment.TopStart)
                .background(
                    Brush.verticalGradient(
                        listOf(TopScrim, Color.Transparent)
                    )
                )
        )
        // Middle — very light so video is clearly visible
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(VideoScrim)
        )
        // Bottom band — darkens behind text + button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .align(Alignment.BottomStart)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, BottomScrim)
                    )
                )
        )

        // ── Glowing accent blobs ──────────────────────────────────────────────
        GlowingAccent(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 60.dp, end = 40.dp)
        )
        GlowingAccent(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(bottom = 120.dp, start = 20.dp),
            delayMillis = 1200,
        )

        // ── Content layout: top branding / middle (video shows) / bottom CTA ─
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // ── TOP: branding ─────────────────────────────────────────────────
            Spacer(Modifier.height(40.dp))
            Text(
                text = "LOYALTYPLUS",
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 5.sp,
                color = Gold,
            )
            Spacer(Modifier.height(6.dp))
            device?.store?.let { store ->
                Text(
                    text = store.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 3.sp,
                    color = Color.White.copy(alpha = 0.55f),
                )
            }

            // ── MIDDLE: empty — video shows through here ──────────────────────
            Spacer(Modifier.weight(1f))

            // ── BOTTOM: headline + CTA ────────────────────────────────────────
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .widthIn(max = 480.dp)
                    .fillMaxWidth(),
            ) {
                Text(
                    text = "Share your\nexperience",
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    lineHeight = 52.sp,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "Your feedback helps us serve you better.",
                    fontSize = 15.sp,
                    color = Color.White.copy(alpha = 0.65f),
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(28.dp))
                PulsingButton(onClick = onFillForm)
                Spacer(Modifier.height(12.dp))
                Text(
                    text = formName,
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.3f),
                    letterSpacing = 1.sp,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(40.dp))
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
        targetValue = 0.14f,
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
