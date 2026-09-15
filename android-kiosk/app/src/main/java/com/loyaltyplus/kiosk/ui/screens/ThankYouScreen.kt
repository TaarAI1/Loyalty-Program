package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import kotlinx.coroutines.delay

private const val DISMISS_SECONDS = 5
private val ScrimColor = Color(0x99000000)
private val GoldGlow  = Color(0x44FFC700)
private val GoldGlow2 = Color(0x22FFC700)

@Composable
fun ThankYouScreen(onDone: () -> Unit) {

    // ── Timers & state ────────────────────────────────────────────────────────
    var showText    by remember { mutableStateOf(false) }
    var showSub     by remember { mutableStateOf(false) }
    var countdown   by remember { mutableIntStateOf(DISMISS_SECONDS) }

    // Circle scale: 0 → 1 with spring bounce
    val circleScale = remember { Animatable(0f) }

    // Countdown arc: sweeps 1f → 0f over DISMISS_SECONDS
    var arcStarted by remember { mutableStateOf(false) }
    val arcTarget = if (arcStarted) 0f else 1f
    val arcSweep by animateFloatAsState(
        targetValue  = arcTarget,
        animationSpec = tween(durationMillis = DISMISS_SECONDS * 1000, easing = LinearEasing),
        label        = "arc_sweep",
    )

    // Pulse glow ring
    val infiniteTransition = rememberInfiniteTransition(label = "glow")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue  = 0.8f,
        animationSpec = infiniteRepeatable(
            animation  = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )
    val glowScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue  = 1.18f,
        animationSpec = infiniteRepeatable(
            animation  = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_scale",
    )

    LaunchedEffect(Unit) {
        // 1. Pop the circle in
        circleScale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium))
        // 2. Start countdown arc and text
        arcStarted = true
        delay(300)
        showText = true
        delay(300)
        showSub  = true
        // 3. Tick the countdown label
        repeat(DISMISS_SECONDS) {
            delay(1_000)
            countdown--
        }
        onDone()
    }

    Box(modifier = Modifier.fillMaxSize()) {

        // ── Scrim over video ──────────────────────────────────────────────────
        Box(modifier = Modifier.fillMaxSize().background(ScrimColor))

        // ── Ambient glow blobs ────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .size(340.dp)
                .scale(glowScale)
                .alpha(glowAlpha * 0.4f)
                .background(
                    Brush.radialGradient(listOf(GoldGlow, Color.Transparent)),
                    CircleShape,
                )
        )
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 60.dp, end = 40.dp)
                .size(200.dp)
                .alpha(0.15f)
                .background(
                    Brush.radialGradient(listOf(Gold, Color.Transparent)),
                    CircleShape,
                )
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(bottom = 80.dp, start = 20.dp)
                .size(180.dp)
                .alpha(0.10f)
                .background(
                    Brush.radialGradient(listOf(Gold, Color.Transparent)),
                    CircleShape,
                )
        )

        // ── Main content ──────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.weight(1f))

            // ── Checkmark + countdown ring ────────────────────────────────────
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(160.dp),
            ) {
                // Outer pulsing glow ring
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .scale(glowScale)
                        .alpha(glowAlpha * 0.35f)
                        .background(
                            Brush.radialGradient(listOf(GoldGlow, GoldGlow2, Color.Transparent)),
                            CircleShape,
                        )
                )

                // Countdown arc drawn on canvas
                Canvas(modifier = Modifier.size(160.dp)) {
                    val stroke = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                    val inset  = stroke.width / 2
                    val arcSize = Size(size.width - inset * 2, size.height - inset * 2)
                    // Track ring (dim)
                    drawArc(
                        color      = Color.White.copy(alpha = 0.15f),
                        startAngle = -90f,
                        sweepAngle = 360f,
                        useCenter  = false,
                        topLeft    = Offset(inset, inset),
                        size       = arcSize,
                        style      = stroke,
                    )
                    // Progress ring (gold, sweeps from 100% → 0%)
                    drawArc(
                        brush      = Brush.sweepGradient(listOf(Gold, Gold.copy(alpha = 0.4f))),
                        startAngle = -90f,
                        sweepAngle = 360f * arcSweep,
                        useCenter  = false,
                        topLeft    = Offset(inset, inset),
                        size       = arcSize,
                        style      = stroke,
                    )
                }

                // Gold circle with checkmark
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(circleScale.value)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(
                                    Gold,
                                    Color(0xFFE6B800),
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = "Done",
                        tint = Ink,
                        modifier = Modifier.size(64.dp),
                    )
                }
            }

            Spacer(Modifier.height(40.dp))

            // ── "Thank You!" ──────────────────────────────────────────────────
            AnimatedVisibility(
                visible = showText,
                enter   = slideInVertically(
                    initialOffsetY = { it / 2 },
                    animationSpec  = tween(500, easing = FastOutSlowInEasing),
                ) + fadeIn(tween(500)),
            ) {
                Text(
                    text       = "Thank You!",
                    fontSize   = 52.sp,
                    fontWeight = FontWeight.Black,
                    color      = Color.White,
                    textAlign  = TextAlign.Center,
                )
            }

            Spacer(Modifier.height(14.dp))

            // ── Subtitle ──────────────────────────────────────────────────────
            AnimatedVisibility(
                visible = showSub,
                enter   = fadeIn(tween(600)),
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text      = "Your feedback means the world to us.",
                        fontSize  = 18.sp,
                        color     = Color.White.copy(alpha = 0.75f),
                        textAlign = TextAlign.Center,
                        modifier  = Modifier.widthIn(max = 420.dp),
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text      = "We'll use your input to keep improving.",
                        fontSize  = 15.sp,
                        color     = Color.White.copy(alpha = 0.45f),
                        textAlign = TextAlign.Center,
                        modifier  = Modifier.widthIn(max = 380.dp),
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            // ── Countdown label ───────────────────────────────────────────────
            AnimatedVisibility(
                visible = showSub,
                enter   = fadeIn(tween(800)),
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(24.dp))
                        .background(Color.White.copy(alpha = 0.10f))
                        .padding(horizontal = 20.dp, vertical = 10.dp),
                ) {
                    Text(
                        text      = "Returning in ${countdown.coerceAtLeast(1)}s…",
                        fontSize  = 14.sp,
                        color     = Color.White.copy(alpha = 0.5f),
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 0.5.sp,
                    )
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}
