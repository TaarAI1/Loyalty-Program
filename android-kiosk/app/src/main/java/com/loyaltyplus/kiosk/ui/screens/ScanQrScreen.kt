package com.loyaltyplus.kiosk.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.loyaltyplus.kiosk.ui.ToastMessage
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import com.loyaltyplus.kiosk.ui.theme.Muted
import com.loyaltyplus.kiosk.ui.theme.Paper
import com.loyaltyplus.kiosk.ui.theme.White
import kotlinx.coroutines.delay

@Composable
fun ScanQrScreen(
    toast: ToastMessage?,
    isConnecting: Boolean,
    onQrScanned: (String) -> Unit,
    onManualEntry: () -> Unit,
    onToastDismissed: () -> Unit,
) {
    val context = LocalContext.current

    // Track camera permission
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED
        )
    }
    var scanning by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (granted) scanning = true
    }

    // Auto-dismiss toast
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(4_000)
            onToastDismissed()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Paper)) {
        // ── Camera scanner (shown when scanning == true) ──────────────────────
        if (scanning && hasCameraPermission) {
            AndroidView(
                factory = { ctx ->
                    DecoratedBarcodeView(ctx).apply {
                        decodeContinuous(object : BarcodeCallback {
                            override fun barcodeResult(result: BarcodeResult?) {
                                val text = result?.text ?: return
                                if (text.isNotBlank()) {
                                    pause()
                                    scanning = false
                                    onQrScanned(text)
                                }
                            }
                        })
                        resume()
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )

            // Overlay: "Enter manually" link at the bottom
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 48.dp),
                contentAlignment = Alignment.BottomCenter,
            ) {
                TextButton(onClick = {
                    scanning = false
                    onManualEntry()
                }) {
                    Text(
                        text = "Enter manually instead",
                        color = White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        } else {
            // ── Idle / landing screen ─────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Column(
                    modifier = Modifier.widthIn(max = 480.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Logo text
                    Text(
                        text = "LOYALTY",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Black,
                        color = Gold,
                        letterSpacing = 6.sp,
                    )
                    Text(
                        text = "PLUS",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Black,
                        color = Ink,
                        letterSpacing = 6.sp,
                    )

                    Spacer(Modifier.height(8.dp))

                    Box(
                        modifier = Modifier
                            .size(width = 60.dp, height = 3.dp)
                            .background(Gold),
                    )

                    Spacer(Modifier.height(48.dp))

                    Text(
                        text = "Connect this device",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = Ink,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = "Scan the QR code shown on the web admin panel\n(Forms → Form Assign → Current Assignments).",
                        fontSize = 15.sp,
                        color = Muted,
                        textAlign = TextAlign.Center,
                        lineHeight = 22.sp,
                    )

                    Spacer(Modifier.height(40.dp))

                    // Scan QR button
                    Button(
                        onClick = {
                            if (hasCameraPermission) {
                                scanning = true
                            } else {
                                permissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                        enabled = !isConnecting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink),
                    ) {
                        if (isConnecting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Ink,
                                strokeWidth = 2.5.dp,
                            )
                        } else {
                            Text(
                                text = "Scan QR Code",
                                fontWeight = FontWeight.Black,
                                fontSize = 17.sp,
                            )
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // Enter manually link
                    TextButton(onClick = onManualEntry) {
                        Text(
                            text = "Enter details manually",
                            color = Muted,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }

        // ── Toast ─────────────────────────────────────────────────────────────
        AnimatedVisibility(
            visible = toast != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 24.dp, vertical = 40.dp),
        ) {
            if (toast != null) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (toast.isError) Color(0xFF1C1C1E) else Color(0xFF1C3A2A)
                        )
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = if (toast.isError) Icons.Filled.Error else Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = if (toast.isError) Color(0xFFFF453A) else Color(0xFF30D158),
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = toast.message,
                        color = White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}
