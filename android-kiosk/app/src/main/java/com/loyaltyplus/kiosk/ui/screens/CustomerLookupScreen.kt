package com.loyaltyplus.kiosk.ui.screens

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.ui.ToastMessage
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import kotlinx.coroutines.delay

private val GlassCard   = Color(0x99FFFFFF)
private val GlassBorder = Color(0xAAFFFFFF)
private val FieldGlass  = Color(0x44FFFFFF)
private val ScrimLayer  = Color(0x44000022)

@Composable
fun CustomerLookupScreen(
    customerName: String,
    customerPhone: String,
    isLookingUp: Boolean,
    toast: ToastMessage?,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onContinue: () -> Unit,
    onToastDismissed: () -> Unit,
) {
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(4_000)
            onToastDismissed()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {

        // Light scrim over the looping video background
        Box(modifier = Modifier.fillMaxSize().background(ScrimLayer))

        // Centered card
        Box(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Brand label
                Text(
                    text = "LOYALTYPLUS",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 4.sp,
                    color = Gold,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Who's giving feedback?",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Enter your details to continue.",
                    fontSize = 15.sp,
                    color = Color.White.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(28.dp))

                // Glass card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .border(
                            width = 1.5.dp,
                            brush = Brush.verticalGradient(
                                listOf(Color.White.copy(0.9f), Color.White.copy(0.2f))
                            ),
                            shape = RoundedCornerShape(24.dp),
                        )
                        .background(GlassCard)
                        .padding(horizontal = 28.dp, vertical = 28.dp),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                        // Name field (optional — pre-filled from lookup result if found)
                        LookupField(
                            label = "CUSTOMER NAME",
                            value = customerName,
                            placeholder = "Your full name",
                            onValueChange = onNameChange,
                            keyboardType = KeyboardType.Text,
                            enabled = !isLookingUp,
                        )

                        // Phone field
                        LookupField(
                            label = "PHONE NUMBER",
                            value = customerPhone,
                            placeholder = "03XX XXXXXXX  or  +92 3XX XXXXXXX",
                            onValueChange = onPhoneChange,
                            keyboardType = KeyboardType.Phone,
                            enabled = !isLookingUp,
                        )

                        Spacer(Modifier.height(4.dp))

                        Button(
                            onClick = onContinue,
                            enabled = !isLookingUp,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink),
                        ) {
                            if (isLookingUp) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(22.dp),
                                    color = Ink,
                                    strokeWidth = 2.5.dp,
                                )
                            } else {
                                Text("Continue", fontWeight = FontWeight.Black, fontSize = 17.sp)
                            }
                        }
                    }
                }
            }
        }

        // Toast
        AnimatedVisibility(
            visible = toast != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit  = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 24.dp, vertical = 40.dp),
        ) {
            if (toast != null) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (toast.isError) Color(0xFF1C1C1E) else Color(0xFF1C3A2A))
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
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

@Composable
private fun LookupField(
    label: String,
    value: String,
    placeholder: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType,
    enabled: Boolean,
) {
    Column {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.6.sp,
            color = Ink.copy(alpha = 0.55f),
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = enabled,
            placeholder = { Text(placeholder, color = Ink.copy(alpha = 0.35f), fontSize = 14.sp) },
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Gold,
                unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
                focusedContainerColor = Color.White.copy(alpha = 0.7f),
                unfocusedContainerColor = Color.White.copy(alpha = 0.5f),
                cursorColor = Ink,
                focusedTextColor = Ink,
                unfocusedTextColor = Ink,
            ),
        )
    }
}
