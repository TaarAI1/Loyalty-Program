package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.ui.ToastMessage
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import com.loyaltyplus.kiosk.ui.theme.Line
import com.loyaltyplus.kiosk.ui.theme.Muted
import com.loyaltyplus.kiosk.ui.theme.Paper
import com.loyaltyplus.kiosk.ui.theme.White
import kotlinx.coroutines.delay

@Composable
fun SettingsScreen(
    apiUrl: String,
    pairingCode: String,
    isConnecting: Boolean,
    toast: ToastMessage?,
    onApiUrlChange: (String) -> Unit,
    onPairingCodeChange: (String) -> Unit,
    onConnect: () -> Unit,
    onToastDismissed: () -> Unit,
) {
    // Auto-dismiss toast after 4 seconds
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(4_000)
            onToastDismissed()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Paper)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 560.dp)
                    .fillMaxWidth(),
            ) {
                Text(
                    text = "LOYALTYPLUS",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 3.sp,
                    color = Gold,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Attach this kiosk",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = Ink,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    text = "Enter your LoyaltyPlus API address and the pairing code shown on the web dashboard under Forms → Devices.",
                    fontSize = 16.sp,
                    color = Muted,
                    lineHeight = 24.sp,
                )
                Spacer(Modifier.height(32.dp))

                FieldLabel("LoyaltyPlus API URL")
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = apiUrl,
                    onValueChange = onApiUrlChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("https://your-api.up.railway.app  (no /api needed)") },
                    shape = RoundedCornerShape(14.dp),
                    colors = fieldColors(),
                    enabled = !isConnecting,
                )

                Spacer(Modifier.height(18.dp))
                FieldLabel("Pairing Code")
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = pairingCode,
                    onValueChange = { onPairingCodeChange(it.uppercase()) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("From Forms → Devices (e.g. AB3X72KQ)") },
                    shape = RoundedCornerShape(14.dp),
                    colors = fieldColors(),
                    enabled = !isConnecting,
                )

                Spacer(Modifier.height(32.dp))

                Button(
                    onClick = onConnect,
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
                        Text("Connect", fontWeight = FontWeight.Black, fontSize = 17.sp)
                    }
                }

                Spacer(Modifier.height(24.dp))
                Text(
                    text = "Staff PIN to reopen this screen: 1234. On the home screen, long-press the LOYALTYPLUS label.",
                    fontSize = 13.sp,
                    color = Muted,
                    lineHeight = 18.sp,
                )
            }
        }

        // Toast notification
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
                        .background(if (toast.isError) androidx.compose.ui.graphics.Color(0xFF1C1C1E) else androidx.compose.ui.graphics.Color(0xFF1C3A2A))
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = if (toast.isError) Icons.Filled.Error else Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = if (toast.isError) androidx.compose.ui.graphics.Color(0xFFFF453A) else androidx.compose.ui.graphics.Color(0xFF30D158),
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

@Composable
private fun FieldLabel(text: String) {
    Text(
        text = text.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 1.6.sp,
        color = Muted,
    )
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Gold,
    unfocusedBorderColor = Line,
    focusedContainerColor = White,
    unfocusedContainerColor = White,
    cursorColor = Ink,
    focusedTextColor = Ink,
    unfocusedTextColor = Ink,
)
